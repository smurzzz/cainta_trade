-- 017 · two corrections found while writing the test assertions
-- 1) docs/09 T-A5: a pending user must not be able to insert items even with
--    a valid JWT — the items owner policy now requires a verified profile.
-- 2) confirm_trade mapped the OFFERER into owner_confirmed_at; docs/06 says the
--    slot belongs to the item OWNER (the offer's to_user). Replacing the
--    function so the column names mean what they say.

drop policy items_owner_write on items;
create policy items_owner_write on items
  for all using (
    (select auth.jwt()->>'sub') = owner_id
    and exists (select 1 from profiles p
                 where p.id = (select auth.jwt()->>'sub') and p.status = 'verified')
  )
  with check (
    (select auth.jwt()->>'sub') = owner_id
    and exists (select 1 from profiles p
                 where p.id = (select auth.jwt()->>'sub') and p.status = 'verified')
  );

create or replace function confirm_trade(p_trade_id uuid, p_requester text)
returns boolean -- true when the trade completed (both sides confirmed)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req text := coalesce(p_requester, (select auth.jwt()->>'sub'));
  v_tr trades%rowtype;
  v_is_owner boolean;
  v_other text;
begin
  select * into v_tr from trades where id = p_trade_id for update;
  if not found then raise exception 'TRADE_NOT_FOUND'; end if;
  if not exists (select 1 from offers o where o.id = v_tr.offer_id
                  and v_req in (o.from_user_id, o.to_user_id)) then
    raise exception 'NOT_ALLOWED';
  end if;
  if v_tr.status not in ('meetup_pending', 'meetup_set') then
    raise exception 'TRADE_NOT_OPEN';
  end if;
  if v_tr.meetup_at is null then raise exception 'MEETUP_NOT_SET'; end if;
  if now() < v_tr.meetup_at then raise exception 'MEETUP_NOT_DUE'; end if;

  -- owner slot = the offer's to_user (the item owner), docs/06
  select o.to_user_id = v_req into v_is_owner from offers o where o.id = v_tr.offer_id;

  if (v_is_owner and v_tr.owner_confirmed_at is not null)
     or ((not v_is_owner) and v_tr.requester_confirmed_at is not null) then
    raise exception 'ALREADY_CONFIRMED';
  end if;

  if v_is_owner then
    update trades set owner_confirmed_at = now() where id = p_trade_id;
  else
    update trades set requester_confirmed_at = now() where id = p_trade_id;
  end if;

  if (v_tr.owner_confirmed_at is not null and not v_is_owner)
     or (v_tr.requester_confirmed_at is not null and v_is_owner) then
    update trades set status = 'completed', completed_at = now() where id = p_trade_id;
    update offers set status = 'completed' where id = v_tr.offer_id;
    update items set status = 'exchanged', updated_at = now()
     where id in (select wanted_item_id from offers where id = v_tr.offer_id)
        or id in (select offered_item_id from offers where id = v_tr.offer_id);

    select case when o.from_user_id = v_req then o.to_user_id else o.from_user_id end
      into v_other from offers o where o.id = v_tr.offer_id;
    perform notify_in_app(v_other, 'trade_completed', 'Trade completed!',
      'Both sides confirmed — rate your trading partner.', '/trades/' || p_trade_id::text);
    perform notify_in_app(v_req, 'trade_completed', 'Trade completed!',
      'Both sides confirmed — rate your trading partner.', '/trades/' || p_trade_id::text);
    return true;
  end if;
  return false;
end $$;
