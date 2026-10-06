-- 002 · Reference tables: barangays, categories, meetup_spots
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 002; design: docs/06_DATABASE_ERD.md.
-- Seed rows (7 barangays, 13 categories + subcategories, 7 meetup spots) go in
-- supabase/seed.sql (run from the SQL editor as postgres, which bypasses RLS).

create table barangays (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  is_enabled  boolean not null default true
);

create table categories (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references categories (id) on delete set null,
  name       text not null,
  icon       text,
  sort_order integer not null default 0,
  is_enabled boolean not null default true
);

create table meetup_spots (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  barangay_id uuid not null references barangays (id) on delete cascade,
  flag        text, -- admin-maintained label for the spot (docs/06)
  is_enabled  boolean not null default true,
  uses_count  integer not null default 0
);

create index categories_parent_id_idx on categories (parent_id);
create index meetup_spots_barangay_id_idx on meetup_spots (barangay_id);

-- Reference data is publicly readable (browse, filters), never writable from the
-- client: admin CRUD (Phase 3.11) runs through the service-role client.
alter table barangays     enable row level security;
alter table categories    enable row level security;
alter table meetup_spots  enable row level security;

create policy barangays_public_read on barangays for select using (true);
create policy categories_public_read on categories for select using (true);
create policy meetup_spots_public_read on meetup_spots for select using (true);
