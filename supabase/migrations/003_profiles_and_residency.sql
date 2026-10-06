-- 003 · profiles (id = Clerk user id) and residency_documents
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 003; design: docs/06_DATABASE_ERD.md.
-- `profiles` is required already in Phase 1: the Clerk webhook
-- (app/api/webhooks/clerk) inserts a row here as soon as someone registers.

create table profiles (
  -- Clerk user id; RLS reads it from (select auth.jwt()->>'sub')
  id              text primary key,
  full_name       text,
  email           text,
  mobile          text, -- +63…; never exposed publicly
  barangay_id     uuid references barangays (id),
  street_address  text, -- never exposed publicly
  role            user_role     not null default 'resident',
  status          account_status not null default 'pending',
  avatar_url      text,
  bio             text,

  -- privacy toggles (docs/06, docs/11 §11)
  show_mobile         boolean not null default false,
  allow_pre_offer_msg boolean not null default true,
  show_trade_count    boolean not null default true,
  show_barangay       boolean not null default true,
  show_last_active    boolean not null default true,
  show_usual_meetup   boolean not null default true,
  hide_from_search    boolean not null default false,

  last_active_at   timestamptz,
  approved_at      timestamptz,
  approved_by      text, -- profiles.id of the approving admin
  suspended_until  timestamptz,
  onboarded_at     timestamptz, -- set after the onboarding form
  deleted_at       timestamptz
);

create index profiles_status_idx  on profiles (status);
create index profiles_barangay_id_idx on profiles (barangay_id);

create table residency_documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references profiles (id) on delete cascade,
  storage_path  text not null, -- private bucket residency-docs/{clerkId}/…
  proof_type    text,
  status        text not null default 'submitted'
                check (status in ('submitted', 'needs_review', 'approved', 'rejected')),
  reviewed_by   text,
  reviewed_at   timestamptz,
  reject_reason text,
  delete_after  timestamptz, -- approved_at + 90 days (cron: purge-residency)
  deleted_at    timestamptz
);

create index residency_documents_user_id_idx on residency_documents (user_id);
create index residency_documents_delete_after_idx
  on residency_documents (delete_after) where deleted_at is null;

-- RLS: default deny. residency_documents has NO client policies at all
-- (docs/11 §3) — only the service-role server client reads/writes it, and every
-- admin view goes through the audited signed-URL route.
alter table residency_documents enable row level security;
alter table profiles enable row level security;

-- Owner can read their own profile row (used by lib/auth/guards).
-- The public_profiles view and the remaining policies arrive in migration 012.
create policy profiles_owner_select on profiles
  for select
  using ((select auth.jwt()->>'sub') = id);
