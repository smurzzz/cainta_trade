-- 015 · realtime publication for messages and notifications
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 015; design: docs/06.
-- Clients subscribe with a valid Supabase JWT (Clerk `supabase` template +
-- third-party auth, docs/05); realtime applies the same RLS policies as REST.

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
