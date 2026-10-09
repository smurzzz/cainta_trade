-- 005 · offers and trades
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 005; design: docs/06_DATABASE_ERD.md.

create table offers (
  id               uuid primary key default gen_random_uuid(),
  wanted_item_id   uuid not null references items (id) on delete cascade,
  offered_item_id  uuid not null references items (id) on delete cascade,
  from_user_id     text not null references profiles (id) on delete cascade,
  to_user_id       text not null references profiles (id) on delete cascade,
  message          text check (message is null or char_length(message) <= 500),
  proposed_spot_id uuid references meetup_spots (id),
  proposed_at      timestamptz,
  flexibility      text,
  status           offer_status not null default 'pending',
  parent_offer_id  uuid references offers (id), -- Tier 2 counter-offers
  expires_at       timestamptz, -- created + 3 d (cron: expire-offers)
  responded_at     timestamptz,
  created_at       timestamptz not null default now(),
  check (wanted_item_id <> offered_item_id),
  check (from_user_id <> to_user_id)
);

-- docs/06: one active (pending/accepted) offer per wanted item.
create unique index offers_one_active_per_wanted_item
  on offers (wanted_item_id)
  where status in ('pending', 'accepted');

create index offers_wanted_item_idx on offers (wanted_item_id, status);
create index offers_to_user_idx on offers (to_user_id, status);
create index offers_from_user_idx on offers (from_user_id, status);
create index offers_expires_idx on offers (expires_at) where status = 'pending';

create table trades (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique, -- TR-<4 digits>, generated app-side
  offer_id             uuid not null unique references offers (id),
  meetup_spot_id       uuid references meetup_spots (id),
  meetup_at            timestamptz,
  meetup_note          text,
  owner_confirmed_at   timestamptz,
  requester_confirmed_at timestamptz,
  status               trade_status not null default 'meetup_pending',
  cancel_reason        text,
  cancelled_by         text references profiles (id),
  completed_at         timestamptz,
  created_at           timestamptz not null default now()
);

create index trades_status_idx on trades (status);
create index trades_meetup_at_idx on trades (meetup_at)
  where status in ('meetup_pending', 'meetup_set');
