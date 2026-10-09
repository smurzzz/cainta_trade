-- 004 · items, item_photos, wishlist
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 004; design: docs/06_DATABASE_ERD.md.
-- RLS arrives in 012 (single place for every new table).

create table items (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique, -- CT-<3 digits>-<4 chars>, generated app-side
  owner_id       text not null references profiles (id) on delete cascade,
  category_id    uuid references categories (id),
  title          text not null check (char_length(title) <= 80),
  description    text,
  condition      item_condition not null default 'good',
  looking_for    text,
  trade_type     trade_type not null default 'item_for_item',
  barangay_id    uuid references barangays (id),
  meetup_spot_id uuid references meetup_spots (id),
  status         item_status not null default 'draft',
  views_count    integer not null default 0,
  expires_at     timestamptz, -- published + 30 d (cron: expire-listings)
  auto_renew     boolean not null default false,
  flagged        boolean not null default false,
  removed_reason text,
  removed_by     text references profiles (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index items_owner_id_idx on items (owner_id);
create index items_status_idx on items (status);
create index items_feed_idx on items (status, category_id, barangay_id, created_at desc);
create index items_expires_at_idx on items (expires_at)
  where status in ('available', 'pending');

create table item_photos (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references items (id) on delete cascade,
  storage_path text not null,
  sort_order   integer not null default 0,
  is_main      boolean not null default false
);

create index item_photos_item_id_idx on item_photos (item_id, sort_order);

-- Wishlist: composite PK; limits (10 pending / 20 verified) enforced by save_item().
create table wishlist (
  user_id  text not null references profiles (id) on delete cascade,
  item_id  uuid not null references items (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create index wishlist_item_id_idx on wishlist (item_id);
