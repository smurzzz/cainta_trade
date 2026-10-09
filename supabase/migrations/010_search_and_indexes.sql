-- 010 · indexes and full-text search
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 010; design: docs/06_DATABASE_ERD.md.

-- Generated tsvector on title (A) + description (B), GIN-indexed.
-- Two-argument to_tsvector(regconfig, text) is IMMUTABLE, so it can back a
-- generated column; keyword search uses websearch_to_tsquery('english', q).
alter table items
  add column search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored;

create index items_search_idx on items using gin (search);

-- Supporting index called out in docs/06 that is not already covered.
create index offers_wanted_status_created_idx on offers (wanted_item_id, status, created_at desc);
