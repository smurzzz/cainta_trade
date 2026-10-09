-- 009 · admin_actions (append-only), prohibited_keywords, announcements,
--       legal_documents, rate_limits
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 009; design: docs/06_DATABASE_ERD.md.

create table admin_actions (
  id          uuid primary key default gen_random_uuid(),
  admin_id    text, -- null for system/automatic (cron) entries
  action      text not null,
  subject_type text not null,
  subject_id  text not null,
  rule_ref    text,
  reason      text,
  created_at  timestamptz not null default now()
);

create index admin_actions_created_idx on admin_actions (created_at desc);
create index admin_actions_subject_idx on admin_actions (subject_type, subject_id);
create index admin_actions_admin_idx on admin_actions (admin_id);

-- Append-only: UPDATE and DELETE always fail, even for the service role.
create or replace function block_audit_change() returns trigger
language plpgsql as $$
begin
  raise exception 'admin_actions is append-only';
end $$;

create trigger admin_actions_no_change
  before update or delete on admin_actions
  for each row execute function block_audit_change();

-- Controlled purge for cron (docs/06): temporarily disables the trigger,
-- deletes, re-enables. Service-role only.
create or replace function purge_admin_actions(p_before timestamptz)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  alter table admin_actions disable trigger admin_actions_no_change;
  delete from admin_actions where created_at < p_before;
  get diagnostics n = row_count;
  alter table admin_actions enable trigger admin_actions_no_change;
  return n;
end $$;

revoke all on function purge_admin_actions(timestamptz) from public, anon, authenticated;

create table prohibited_keywords (
  id         uuid primary key default gen_random_uuid(),
  word       text not null unique,
  action     text not null check (action in ('hold', 'flag')),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  is_enabled boolean not null default true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_by text references profiles (id),
  created_at timestamptz not null default now()
);

create table legal_documents (
  id             uuid primary key default gen_random_uuid(),
  type           text not null check (type in ('terms', 'privacy')),
  version        text not null,
  effective_date date not null default current_date,
  body           text not null,
  created_by     text references profiles (id),
  created_at     timestamptz not null default now(),
  unique (type, version)
);

-- Fixed-window counters for lib/ratelimit.ts. Server-only (no RLS policies).
create table rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (key, window_start)
);
