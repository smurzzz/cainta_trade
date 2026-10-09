-- 008 · reports, report_evidence, blocks
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 008; design: docs/06_DATABASE_ERD.md.

create table reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     text not null references profiles (id) on delete cascade,
  is_anonymous    boolean not null default false,
  target_type     text not null check (target_type in ('listing', 'member', 'message')),
  target_id       text not null, -- items.id / profiles.id / messages.id as text
  reason          report_reason not null,
  details         text check (details is null or char_length(details) <= 1000),
  attach_chat     boolean not null default false,
  status          report_status not null default 'open',
  is_urgent       boolean not null default false,
  assigned_to     text references profiles (id),
  decision        text check (decision in ('dismiss', 'warn', 'remove_listing', 'suspend')),
  moderation_note text,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index reports_status_created_idx on reports (status, created_at);
create index reports_target_idx on reports (target_type, target_id);

create table report_evidence (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references reports (id) on delete cascade,
  storage_path text not null
);

create index report_evidence_report_idx on report_evidence (report_id);

create table blocks (
  user_id    text not null references profiles (id) on delete cascade,
  blocked_id text not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id),
  check (user_id <> blocked_id)
);
