-- 021 · atomic fixed-window counter for lib/ratelimit.ts (docs/03 3.2).
-- Server-only (rate_limits has no client policies; execute revoked below).

create or replace function rate_limit_take(p_key text, p_window timestamptz,
                                           p_limit integer)
returns integer -- the count after this hit; raises RATE_LIMITED when over limit
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into rate_limits (key, window_start, count)
  values (p_key, p_window, 1)
  on conflict (key, window_start) do update
    set count = rate_limits.count + 1
  returning count into n;

  if n > p_limit then
    raise exception 'RATE_LIMITED';
  end if;
  return n;
end $$;

revoke all on function rate_limit_take(text, timestamptz, integer)
  from public, anon, authenticated;
grant execute on function rate_limit_take(text, timestamptz, integer) to service_role;
