-- 019 · replace rate_trade's smallint parameters with integer.
-- `rate_trade(v, u, 5)` did not resolve (int → smallint is only an assignment
-- cast), and integer is also the friendlier RPC type for PostgREST JSON args.
-- Caught by 999_test_assertions on push.

drop function rate_trade(uuid, text, smallint, text, jsonb, smallint, smallint, smallint, smallint);

create or replace function rate_trade(
  p_trade_id uuid, p_requester text, p_stars integer,
  p_comment text default null, p_tags jsonb default '[]'::jsonb,
  p_described integer default null, p_communication integer default null,
  p_on_time integer default null, p_friendly integer default null
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
  if p_stars is null or p_stars < 1 or p_stars > 5 then
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

revoke all on function rate_trade(uuid, text, integer, text, jsonb, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function rate_trade(uuid, text, integer, text, jsonb, integer, integer, integer, integer)
  to service_role;
