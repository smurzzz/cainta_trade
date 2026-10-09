-- 007 · ratings
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 007; design: docs/06_DATABASE_ERD.md.
-- One rating per party per trade; only creatable after completion (rate_trade fn, 013).

create table ratings (
  id           uuid primary key default gen_random_uuid(),
  trade_id     uuid not null references trades (id) on delete cascade,
  rater_id     text not null references profiles (id) on delete cascade,
  ratee_id     text not null references profiles (id) on delete cascade,
  stars        smallint not null check (stars between 1 and 5),
  tags         jsonb not null default '[]'::jsonb,
  comment      text,
  described    smallint check (described between 1 and 5),
  communication smallint check (communication between 1 and 5),
  on_time      smallint check (on_time between 1 and 5),
  friendly     smallint check (friendly between 1 and 5),
  created_at   timestamptz not null default now(),
  unique (trade_id, rater_id),
  check (rater_id <> ratee_id)
);

create index ratings_ratee_idx on ratings (ratee_id);
create index ratings_trade_idx on ratings (trade_id);
