-- 018 · fix: accept_offer generated a TR-xxxx code but never wrote it
-- (caught by 999_test_assertions on push).

create or replace function accept_offer(p_offer_id uuid, p_requester text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req text := coalesce(p_requester, (select auth.jwt()->>'sub'));
  v_off offers%rowtype;
  v_code text;
  v_trade uuid;
  i int;
begin
  select * into v_off from offers where id = p_offer_id for update;
  if not found then raise exception 'OFFER_NOT_FOUND'; end if;
  if v_off.to_user_id <> v_req then raise exception 'NOT_ALLOWED'; end if;
  if v_off.status <> 'pending' then raise exception 'OFFER_NOT_PENDING'; end if;
  if v_off.expires_at is not null and v_off.expires_at < now() then
    raise exception 'OFFER_EXPIRED';
  end if;
  if exists (select 1 from offers
              where wanted_item_id = v_off.wanted_item_id
                and status = 'accepted' and id <> p_offer_id) then
    raise exception 'ITEM_ALREADY_RESERVED';
  end if;

  update offers set status = 'accepted', responded_at = now()
   where id = p_offer_id;

  update items set status = 'pending', updated_at = now()
   where id in (v_off.wanted_item_id, v_off.offered_item_id);

  -- every other pending offer on the wanted item is rejected
  update offers set status = 'rejected', responded_at = now()
   where wanted_item_id = v_off.wanted_item_id
     and status = 'pending' and id <> p_offer_id;

  -- trade code TR-<4 digits>, retry on the (astronomically rare) collision
  for i in 1..5 loop
    v_code := 'TR-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    begin
      insert into trades (code, offer_id, meetup_spot_id, meetup_at, status)
      values (v_code, p_offer_id, v_off.proposed_spot_id, v_off.proposed_at,
              'meetup_pending')
      returning id into v_trade;
      exit;
    exception when unique_violation then
      if i = 5 then raise; end if;
    end;
  end loop;

  perform notify_in_app(v_off.from_user_id, 'offer_accepted', 'Offer accepted',
    'Your offer was accepted — pick a meetup time next.', '/offers/' || p_offer_id::text);
  return v_trade;
end $$;

grant execute on function accept_offer(uuid,text) to service_role;
revoke all on function accept_offer(uuid,text) from public, anon, authenticated;
