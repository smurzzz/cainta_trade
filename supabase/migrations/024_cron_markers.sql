-- 024 · cron dedupe markers + filtered audit purge
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.14 (scheduled jobs).
--   expire-listings sends "expiring in 12 / 3 days" reminders once each, so the
--   hourly run needs a per-item marker; meetup-reminders is daily and needs a
--   per-trade marker. purge-old keeps two retentions (audit 24 months, document
--   views 12 — docs/11 §10), so purge_admin_actions learns an optional action
--   filter. Service-role only (same revocations as 009).

alter table items
  add column if not exists reminder_12d_at timestamptz, -- set when the 12-day expiry reminder went out
  add column if not exists reminder_3d_at  timestamptz; -- set when the 3-day expiry reminder went out

alter table trades
  add column if not exists reminder_sent_at timestamptz; -- day-before meetup reminder (docs/06)

-- Replace the 1-arg purge with an optional action filter. Dropping first keeps
-- single-arg calls (999_test_assertions) unambiguous.
drop function if exists purge_admin_actions (timestamptz);

create or replace function purge_admin_actions (p_before timestamptz, p_action text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  alter table admin_actions disable trigger admin_actions_no_change;
  delete from admin_actions
    where created_at < p_before
      and (p_action is null or action = p_action);
  get diagnostics n = row_count;
  alter table admin_actions enable trigger admin_actions_no_change;
  return n;
end $$;

revoke all on function purge_admin_actions (timestamptz, text) from public, anon, authenticated;
grant execute on function purge_admin_actions (timestamptz, text) to service_role;
