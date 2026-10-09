-- 013 · SQL functions (RPC): offers, trades, wishlist, views, ratings
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 013 (see also 3.5/3.6/3.7/3.9);
-- design: docs/06 "SQL functions (RPC, security definer, run atomically)".
--
-- Identity: every function takes p_requester (the Clerk id) and falls back to
-- auth.jwt()->>'sub'. Server Actions call these as the service role AFTER a
-- Clerk guard, so p_requester comes from trusted code; the functions still
-- verify the requester is a party to the row (defence in depth + IDOR guard).
--
-- Grants: execute revoked from public/anon/authenticated except increment_views,
-- which guests legitimately call (docs/07 "incrementViews · G").

-- ── helpers ────────────────────────────────────────────────────────────────

-- In-app notification respecting notification_preferences (default: on).
create or replace function notify_in_app(p_user text, p_type text, p_title text,
                                         p_body text, p_link text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((select in_app from notification_preferences
                where user_id = p_user and type = p_type), true) then
    insert into notifications (user_id, type, title, body, link)
    values (p_user, p_type, p_title, p_body, p_link);
  end if;
end $$;

revoke all on function notify_in_app(text, text, text, text, text) from public, anon, authenticated;

-- ── offers ─────────────────────────────────────────────────────────────────

create or replace function create_offer(
  p_wanted uuid, p_offered uuid, p_requester text,
  p_message text default null, p_spot uuid default null,
  p_proposed_at timestamptz default null, p_flexibility text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req  text := coalesce(p_requester, (select auth.jwt()->>'sub'));
  v_want items%rowtype;
  v_give items%rowtype;
  v_owner text;
  v_id uuid;
begin
  if v_req is null then raise exception 'NOT_SIGNED_IN'; end if;
  if not exists (select 1 from profiles where id = v_req and status = 'verified') then
    raise exception 'NOT_VERIFIED';
  end if;
  if p_wanted = p_offered then raise exception 'SAME_ITEM'; end if;

  select * into v_give from items where id = p_offered for update;
  if not found then raise exception 'ITEM_NOT_FOUND'; end if;
  if v_give.owner_id <> v_req then raise exception 'NOT_YOUR_ITEM'; end if;
  if v_give.status <> 'available' then raise exception 'ITEM_NOT_AVAILABLE'; end if;

  select * into v_want from items where id = p_wanted for update;
  if not found then raise exception 'ITEM_NOT_FOUND'; end if;
  if v_want.owner_id = v_req then raise exception 'OWN_WANTED_ITEM'; end if;
  if v_want.status <> 'available' then raise exception 'WANTED_NOT_AVAILABLE'; end if;
  if exists (select 1 from offers
              where wanted_item_id = p_wanted
                and status in ('pending', 'accepted')) then
    raise exception 'OFFER_EXISTS';
  end if;

  insert into offers (wanted_item_id, offered_item_id, from_user_id, to_user_id,
                      message, proposed_spot_id, proposed_at, flexibility, expires_at)
  values (p_wanted, p_offered, v_req, v_want.owner_id,
          left(p_message, 500), p_spot, p_proposed_at, p_flexibility, now() + interval '3 days')
  returning id into v_id;

  v_owner := v_want.owner_id;
  perform notify_in_app(v_owner, 'new_offer', 'New trade offer',
    'A neighbour offered ' || v_give.title || ' for your ' || v_want.title || '.',
    '/offers');
  return v_id;
end $$;

create or replace function accept_offer(p_offer_id uuid, p_requester text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req text := coalesce(p_requester, (select auth.jwt()->>'sub'));
  v_off offers%rowtype;
  v_other uuid;
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
      insert into trades (offer_id, meetup_spot_id, meetup_at, status)
      values (p_offer_id, v_off.proposed_spot_id, v_off.proposed_at, 'meetup_pending')
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

create or replace function reject_offer(p_offer_id uuid, p_requester text,
                                        p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req text := coalesce(p_requester, (select auth.jwt()->>'sub'));
  v_off offers%rowtype;
begin
  select * into v_off from offers where id = p_offer_id for update;
  if not found then raise exception 'OFFER_NOT_FOUND'; end if;
  if v_off.to_user_id <> v_req then raise exception 'NOT_ALLOWED'; end if;
  if v_off.status <> 'pending' then raise exception 'OFFER_NOT_PENDING'; end if;

  update offers set status = 'rejected', responded_at = now() where id = p_offer_id;
  perform notify_in_app(v_off.from_user_id, 'offer_rejected', 'Offer not accepted',
    coalesce(p_reason, 'The owner passed on your offer.'), '/offers');
end $$;

create or replace function cancel_offer(p_offer_id uuid, p_requester text,
                                        p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req text := coalesce(p_requester, (select auth.jwt()->>'sub'));
  v_off offers%rowtype;
begin
  select * into v_off from offers where id = p_offer_id for update;
  if not found then raise exception 'OFFER_NOT_FOUND'; end if;
  if v_off.from_user_id <> v_req then raise exception 'NOT_ALLOWED'; end if;
  if v_off.status not in ('pending', 'accepted') then
    raise exception 'OFFER_NOT_CANCELLABLE';
  end if;

  if v_off.status = 'accepted' then
    update trades
       set status = 'cancelled', cancel_reason = coalesce(p_reason, 'Cancelled by requester'),
           cancelled_by = v_req
     where offer_id = p_offer_id and status not in ('completed', 'cancelled');
    update items set status = 'available', updated_at = now()
     where id in (v_off.wanted_item_id, v_off.offered_item_id)
       and status = 'pending';
    perform notify_in_app(v_off.to_user_id, 'offer_cancelled', 'Offer cancelled',
      'The other side cancelled the accepted offer.', '/offers');
  end if;

  update offers set status = 'cancelled', responded_at = now()
   where id = p_offer_id;
end $$;

-- ── trades ─────────────────────────────────────────────────────────────────

create or replace function update_meetup(p_trade_id uuid, p_requester text,
                                         p_spot uuid, p_at timestamptz,
                                         p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req text := coalesce(p_requester, (select auth.jwt()->>'sub'));
  v_tr trades%rowtype;
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

  -- a changed plan requires both sides to confirm again (docs/06)
  update trades
     set meetup_spot_id = p_spot, meetup_at = p_at, meetup_note = p_note,
         status = 'meetup_set', owner_confirmed_at = null, requester_confirmed_at = null
   where id = p_trade_id;

  select case when o.from_user_id = v_req then o.to_user_id else o.from_user_id end
    into v_other from offers o where o.id = v_tr.offer_id;
  perform notify_in_app(v_other, 'meetup_updated', 'Meetup details changed',
    'The meetup place or time was updated — check the new details.', '/trades/' || p_trade_id::text);
end $$;

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

  select o.from_user_id = v_req into v_is_owner from offers o where o.id = v_tr.offer_id;

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
    -- both sides confirmed now
    update trades set status = 'completed', completed_at = now() where id = p_trade_id;
    update offers set status = 'completed' where id = v_tr.offer_id;
    update items set status = 'exchanged', updated_at = now()
     where id in (select id from items i
                   where i.id in (select wanted_item_id from offers where id = v_tr.offer_id)
                      or i.id in (select offered_item_id from offers where id = v_tr.offer_id));

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

create or replace function dispute_trade(p_trade_id uuid, p_requester text,
                                         p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req text := coalesce(p_requester, (select auth.jwt()->>'sub'));
  v_tr trades%rowtype;
  v_admin text;
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

  update trades set status = 'disputed', meetup_note = coalesce(p_reason, v_tr.meetup_note)
   where id = p_trade_id;

  for v_admin in select id from profiles where role in ('moderator', 'admin') loop
    perform notify_in_app(v_admin, 'trade_disputed', 'Trade disputed',
      'A trade was disputed and needs review.', '/admin/trades');
  end loop;
end $$;

-- ── listings ───────────────────────────────────────────────────────────────

create or replace function renew_item(p_item_id uuid, p_requester text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req text := coalesce(p_requester, (select auth.jwt()->>'sub'));
  v_new timestamptz;
begin
  update items
     set expires_at = now() + interval '30 days',
         status = case when status = 'expired' then 'available' else status end,
         updated_at = now()
   where id = p_item_id and owner_id = v_req
     and status in ('expired', 'available', 'paused', 'pending')
  returning expires_at into v_new;
  if v_new is null then raise exception 'NOT_RENEWABLE'; end if;
  return v_new;
end $$;

-- Guest-callable view counter (docs/07): only visible listings count.
create or replace function increment_views(p_item_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update items set views_count = views_count + 1
   where id = p_item_id and status not in ('draft', 'removed');
$$;

-- ── wishlist ───────────────────────────────────────────────────────────────

create or replace function save_item(p_item_id uuid, p_requester text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req text := coalesce(p_requester, (select auth.jwt()->>'sub'));
  v_status account_status;
  v_limit int;
  v_count int;
begin
  if v_req is null then raise exception 'NOT_SIGNED_IN'; end if;
  select status into v_status from profiles where id = v_req;
  if v_status is null or v_status = 'deleted' then raise exception 'NOT_SIGNED_IN'; end if;

  if exists (select 1 from wishlist where user_id = v_req and item_id = p_item_id) then
    return; -- idempotent
  end if;
  if exists (select 1 from items where id = p_item_id and owner_id = v_req) then
    raise exception 'OWN_ITEM';
  end if;
  if not exists (select 1 from items where id = p_item_id
                  and status not in ('draft', 'removed')) then
    raise exception 'ITEM_NOT_FOUND';
  end if;

  v_limit := case when v_status = 'verified' then 20 else 10 end;
  select count(*) into v_count from wishlist where user_id = v_req;
  if v_count >= v_limit then raise exception 'WISHLIST_LIMIT'; end if;

  insert into wishlist (user_id, item_id) values (v_req, p_item_id)
  on conflict do nothing;
end $$;

create or replace function unsave_item(p_item_id uuid, p_requester text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req text := coalesce(p_requester, (select auth.jwt()->>'sub'));
  n int;
begin
  delete from wishlist where user_id = v_req and item_id = p_item_id;
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- ── ratings ────────────────────────────────────────────────────────────────

create or replace function rate_trade(
  p_trade_id uuid, p_requester text, p_stars smallint,
  p_comment text default null, p_tags jsonb default '[]'::jsonb,
  p_described smallint default null, p_communication smallint default null,
  p_on_time smallint default null, p_friendly smallint default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req text := coalesce(p_requester, (select auth.jwt()->>'sub'));
  v_tr trades%rowtype;
  v_ratee text;
  v_id uuid;
begin
  select * into v_tr from trades where id = p_trade_id for update;
  if not found then raise exception 'TRADE_NOT_FOUND'; end if;
  if v_tr.status <> 'completed' then raise exception 'TRADE_NOT_COMPLETED'; end if;
  if p_stars between 1 and 5 is null or p_stars < 1 or p_stars > 5 then
    raise exception 'INVALID_STARS';
  end if;

  select case when o.from_user_id = v_req then o.to_user_id else o.from_user_id end
    into v_ratee from offers o where o.id = v_tr.offer_id;
  if v_ratee is null or v_ratee = v_req then raise exception 'NOT_ALLOWED'; end if;

  begin
    insert into ratings (trade_id, rater_id, ratee_id, stars, tags, comment,
                         described, communication, on_time, friendly)
    values (p_trade_id, v_req, v_ratee, p_stars, coalesce(p_tags, '[]'::jsonb),
            p_comment, p_described, p_communication, p_on_time, p_friendly)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'ALREADY_RATED';
  end;
  return v_id;
end $$;

-- ── grants ─────────────────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'create_offer(uuid,uuid,text,text,uuid,timestamptz,text)',
    'accept_offer(uuid,text)',
    'reject_offer(uuid,text,text)',
    'cancel_offer(uuid,text,text)',
    'update_meetup(uuid,text,uuid,timestamptz,text)',
    'confirm_trade(uuid,text)',
    'dispute_trade(uuid,text,text)',
    'renew_item(uuid,text)',
    'save_item(uuid,text)',
    'unsave_item(uuid,text)',
    'rate_trade(uuid,text,smallint,text,jsonb,smallint,smallint,smallint,smallint)'
  ] loop
    execute 'revoke all on function ' || f || ' from public, anon, authenticated';
    execute 'grant execute on function ' || f || ' to service_role';
  end loop;
end $$;

grant execute on function increment_views(uuid) to anon, authenticated, service_role;
