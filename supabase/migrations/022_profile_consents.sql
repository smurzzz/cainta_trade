-- 022 · consent record on profiles (docs/07 completeOnboarding): terms,
-- privacy (RA 10173) and optional updates, with the timestamp they were given.

alter table profiles
  add column if not exists consents jsonb not null default '{}'::jsonb;
