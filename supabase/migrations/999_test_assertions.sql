-- 999 · executable SQL assertions (docs/09 §3, §7): RLS as anon/authenticated
-- and the trade rules from docs/03 3.7. Everything — fixtures included — runs
-- inside one DO block, so a failed assertion rolls the whole migration back and
-- `supabase db push` exits non-zero. A pass logs the notice below.

do $$
declare
  a_id constant text := 'zz_test_a';
  b_id constant text := 'zz_test_b';
  c_id constant text := 'zz_test_c';
  p_id constant text := 'zz_test_pending';
  v_brg uuid;
  v_cat uuid;
  v_spot uuid;
  v_item_a uuid; v_item_b uuid; v_item_c uuid;
  v_offer uuid; v_offer_c uuid; v_offer2 uuid;
  v_trade uuid; v_n int;
  v_audit uuid;
begin
  -- ── fixtures ─────────────────────────────────────────────────────────────
  select id into v_brg from barangays order by name limit 1;
  select id into v_cat from categories where parent_id is null order by name limit 1;
  select id into v_spot from meetup_spots order by name limit 1;

  insert into profiles (id, full_name, status, barangay_id) values
    (a_id, 'ZZ Test A', 'verified', v_brg),
    (b_id, 'ZZ Test B', 'verified', v_brg),
    (c_id, 'ZZ Test C', 'verified', v_brg),
    (p_id, 'ZZ Test Pending', 'pending', v_brg)
  on conflict (id) do update set status = excluded.status;

  insert into items (code, owner_id, category_id, title, barangay_id, status, expires_at) values
    ('ZZ-TEST-A1', a_id, v_cat, 'ZZ test item A', v_brg, 'available', now() + interval '30 days'),
    ('ZZ-TEST-A2', a_id, v_cat, 'ZZ test item A2', v_brg, 'available', now() + interval '30 days'),
    ('ZZ-TEST-B1', b_id, v_cat, 'ZZ test item B', v_brg, 'available', now() + interval '30 days'),
    ('ZZ-TEST-C1', c_id, v_cat, 'ZZ test item C', v_brg, 'available', now() + interval '30 days')
  on conflict (code) do update set owner_id = excluded.owner_id, status = excluded.status;
  select id into v_item_a from items where code = 'ZZ-TEST-A1';
  select id into v_item_b from items where code = 'ZZ-TEST-B1';
  select id into v_item_c from items where code = 'ZZ-TEST-C1';

  -- ── §7 anon: private tables read as empty, writes impossible ─────────────
  set local role anon;
  select count(*) into v_n from profiles;
  if v_n <> 0 then raise exception 'ASSERT: anon read % profiles', v_n; end if;
  select count(*) into v_n from offers;
  if v_n <> 0 then raise exception 'ASSERT: anon read % offers', v_n; end if;
  select count(*) into v_n from admin_actions;
  if v_n <> 0 then raise exception 'ASSERT: anon read % audit rows', v_n; end if;
  begin
    insert into offers (wanted_item_id, offered_item_id, from_user_id, to_user_id)
    values (v_item_b, v_item_a, a_id, b_id);
    raise exception 'ASSERT: anon inserted an offer';
  exception when others then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;
  set local role postgres;

  -- ── authenticated A: sees only own profile, only own-party offers ────────
  insert into offers (wanted_item_id, offered_item_id, from_user_id, to_user_id,
                      status, expires_at)
  values (v_item_b, v_item_a, a_id, b_id, 'pending', now() + interval '3 days')
  returning id into v_offer;
  -- C jumps the queue on the same wanted item (docs: one active offer per item)
  begin
    insert into offers (wanted_item_id, offered_item_id, from_user_id, to_user_id,
                        status, expires_at)
    values (v_item_b, v_item_c, c_id, b_id, 'pending', now() + interval '3 days');
    raise exception 'ASSERT: second active offer created on same wanted item';
  exception when others then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;

  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', a_id, 'role', 'authenticated')::text, true);
  select count(*) into v_n from profiles;
  if v_n <> 1 then raise exception 'ASSERT: A sees % profiles (want 1)', v_n; end if;
  select count(*) into v_n from offers;
  if v_n <> 1 then raise exception 'ASSERT: A sees % offers (want 1)', v_n; end if;
  -- party may message (docs/06: verified, not blocked)
  insert into messages (offer_id, sender_id, body) values (v_offer, a_id, 'zz test message');
  -- non-party may not
  perform set_config('request.jwt.claims',
    json_build_object('sub', c_id, 'role', 'authenticated')::text, true);
  begin
    insert into messages (offer_id, sender_id, body) values (v_offer, c_id, 'zz');
    raise exception 'ASSERT: non-party wrote into a conversation';
  exception when others then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;
  -- pending user may not post an item (docs/09 T-A5)
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  begin
    insert into items (code, owner_id, category_id, title, barangay_id, status)
    values ('ZZ-TEST-P1', p_id, v_cat, 'Pending user item', v_brg, 'available');
    raise exception 'ASSERT: pending user inserted an item via RLS';
  exception when others then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;
  set local role postgres;
  set local request.jwt.claims to '';

  -- ── §3 trade rules through the RPCs (docs/03 3.7 Done-when) ─────────────

  -- pending user cannot offer (function-level guard)
  begin
    perform create_offer(v_item_c, v_item_a, p_id);
    raise exception 'ASSERT: pending user created an offer';
  exception when others then
    if sqlerrm not in ('NOT_VERIFIED') then
      if sqlerrm like 'ASSERT:%' then raise; end if;
      raise exception 'ASSERT: pending offer failed with % (want NOT_VERIFIED)', sqlerrm;
    end if;
  end;

  -- duplicate offer on the same wanted item is rejected (T-O3)
  begin
    perform create_offer(v_item_b, v_item_a, a_id);
    raise exception 'ASSERT: duplicate active offer accepted';
  exception when others then
    if sqlerrm not in ('OFFER_EXISTS') then
      if sqlerrm like 'ASSERT:%' then raise; end if;
      raise exception 'ASSERT: duplicate offer failed with % (want OFFER_EXISTS)', sqlerrm;
    end if;
  end;

  -- offering your own item back is rejected (T-O1 flavour): wanted is A's own
  -- item while the offered item is A's *other* item (so the give-side checks
  -- pass first and the own-wanted guard is what fires).
  begin
    perform create_offer(v_item_a, (select id from items where code = 'ZZ-TEST-A2'), a_id);
    raise exception 'ASSERT: owner offered on own wanted item';
  exception when others then
    if sqlerrm not in ('OWN_WANTED_ITEM') then
      if sqlerrm like 'ASSERT:%' then raise; end if;
      raise exception 'ASSERT: own-item offer failed with % (want OWN_WANTED_ITEM)', sqlerrm;
    end if;
  end;

  -- A offers A1 for C1 — a second, valid offer (used for the accept flow below)
  v_offer2 := create_offer(v_item_c, v_item_a, a_id);
  if v_offer2 is null then raise exception 'ASSERT: create_offer returned null'; end if;

  -- only the receiving side may accept (T-O4 / IDOR)
  begin
    perform accept_offer(v_offer2, a_id);
    raise exception 'ASSERT: sender accepted their own offer';
  exception when others then
    if sqlerrm not in ('NOT_ALLOWED') then
      if sqlerrm like 'ASSERT:%' then raise; end if;
      raise exception 'ASSERT: accept by sender failed with % (want NOT_ALLOWED)', sqlerrm;
    end if;
  end;

  -- C accepts A's offer: items pending, trade created
  v_trade := accept_offer(v_offer2, c_id);
  if v_trade is null then raise exception 'ASSERT: accept_offer returned no trade'; end if;
  if (select status from items where id = v_item_a) <> 'pending'
     or (select status from items where id = v_item_c) <> 'pending' then
    raise exception 'ASSERT: accept did not set both items pending';
  end if;

  -- schedule the meetup, then early confirm must fail (T-O6)
  perform update_meetup(v_trade, c_id, v_spot, now() + interval '1 hour', 'zz');
  begin
    perform confirm_trade(v_trade, c_id);
    raise exception 'ASSERT: early confirm accepted';
  exception when others then
    if sqlerrm not in ('MEETUP_NOT_DUE') then
      if sqlerrm like 'ASSERT:%' then raise; end if;
      raise exception 'ASSERT: early confirm failed with % (want MEETUP_NOT_DUE)', sqlerrm;
    end if;
  end;

  -- rating before completion must fail
  begin
    perform rate_trade(v_trade, c_id, 5);
    raise exception 'ASSERT: rated an unfinished trade';
  exception when others then
    if sqlerrm not in ('TRADE_NOT_COMPLETED') then
      if sqlerrm like 'ASSERT:%' then raise; end if;
      raise exception 'ASSERT: premature rating failed with % (want TRADE_NOT_COMPLETED)', sqlerrm;
    end if;
  end;

  -- both sides confirm after the meetup time → completed (T-O7)
  perform update_meetup(v_trade, c_id, v_spot, now() - interval '5 minutes', 'zz');
  if confirm_trade(v_trade, c_id) then
    raise exception 'ASSERT: trade completed after a single confirmation';
  end if;
  if not confirm_trade(v_trade, a_id) then
    raise exception 'ASSERT: trade did not complete after both confirmations';
  end if;
  if (select status from trades where id = v_trade) <> 'completed' then
    raise exception 'ASSERT: trade status not completed';
  end if;
  if (select status from items where id = v_item_a) <> 'exchanged'
     or (select status from items where id = v_item_c) <> 'exchanged' then
    raise exception 'ASSERT: items not exchanged';
  end if;

  -- duplicate rating rejected (docs/09 §3 Done-when)
  perform rate_trade(v_trade, c_id, 4);
  begin
    perform rate_trade(v_trade, c_id, 5);
    raise exception 'ASSERT: duplicate rating accepted';
  exception when others then
    if sqlerrm not in ('ALREADY_RATED') then
      if sqlerrm like 'ASSERT:%' then raise; end if;
      raise exception 'ASSERT: duplicate rating failed with % (want ALREADY_RATED)', sqlerrm;
    end if;
  end;

  -- ── audit log is append-only (docs/11 §3) ────────────────────────────────
  insert into admin_actions (admin_id, action, subject_type, subject_id)
  values (a_id, 'zz_test', 'profile', a_id) returning id into v_audit;
  begin
    update admin_actions set action = 'tampered' where id = v_audit;
    raise exception 'ASSERT: audit row was updated';
  exception when others then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;
  begin
    delete from admin_actions where id = v_audit;
    raise exception 'ASSERT: audit row was deleted';
  exception when others then
    if sqlerrm like 'ASSERT:%' then raise; end if;
  end;
  -- controlled purge (cron path) is the only way out
  perform purge_admin_actions(now() + interval '1 minute');

  -- ── cleanup: fixtures cascade away ──────────────────────────────────────
  delete from profiles where id in (a_id, b_id, c_id, p_id);

  raise notice '999_test_assertions: all RLS and trade-rule assertions passed';
end $$;
