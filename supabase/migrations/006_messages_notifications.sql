-- 006 · messages, notifications, notification_preferences
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 006; design: docs/06_DATABASE_ERD.md.
-- messages + notifications join the realtime publication in 015.

create table messages (
  id         uuid primary key default gen_random_uuid(),
  offer_id   uuid not null references offers (id) on delete cascade,
  sender_id  text not null references profiles (id) on delete cascade,
  body       text,
  photo_path text,
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  check (body is not null or photo_path is not null)
);

create index messages_offer_created_idx on messages (offer_id, created_at);
create index messages_unread_idx on messages (offer_id, sender_id, read_at)
  where read_at is null;

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null references profiles (id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_read_idx on notifications (user_id, read_at);
create index notifications_user_created_idx on notifications (user_id, created_at desc);

-- One row per (user, notification type); defaults seeded by the app on demand.
create table notification_preferences (
  user_id text not null references profiles (id) on delete cascade,
  type    text not null,
  in_app  boolean not null default true,
  email   boolean not null default true,
  sms     boolean not null default false,
  primary key (user_id, type)
);
