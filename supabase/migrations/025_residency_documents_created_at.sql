-- 025 · residency_documents.created_at
-- The table shipped without the created_at column that every other table has.
-- approveUser / rejectUser / the admin proof list / resendDetails all order by
-- it, and PostgREST rejected the query ("column … does not exist"), so the
-- "latest proof" lookup silently matched nothing — approve left the document
-- at 'submitted'. Caught end to end by e2e T-A7.

alter table residency_documents
  add column if not exists created_at timestamptz not null default now();

create index if not exists residency_documents_user_created_idx
  on residency_documents (user_id, created_at desc);
