-- 012 · Row Level Security: enable on every new table, policies per table
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 012; design: docs/06 RLS summary.
-- Default deny: tables without a SELECT policy answer 42501 to PostgREST clients.
-- Server Actions run as the service role AFTER a Clerk guard (docs/11 §2), so
-- status transitions on offers/trades are not granted to clients at all —
-- absence of an INSERT/UPDATE policy IS the revoke docs/06 asks for.

-- ── items ──────────────────────────────────────────────────────────────────
alter table items enable row level security;

create policy items_public_select on items
  for select using (status not in ('draft', 'removed'));

create policy items_owner_select on items
  for select using ((select auth.jwt()->>'sub') = owner_id);

create policy items_owner_write on items
  for all using ((select auth.jwt()->>'sub') = owner_id)
  with check ((select auth.jwt()->>'sub') = owner_id);

-- ── item_photos ────────────────────────────────────────────────────────────
alter table item_photos enable row level security;

create policy item_photos_select on item_photos
  for select using (
    exists (
      select 1 from items i
      where i.id = item_id
        and (i.status not in ('draft', 'removed')
             or i.owner_id = (select auth.jwt()->>'sub'))
    )
  );

create policy item_photos_owner_write on item_photos
  for all using (
    exists (select 1 from items i where i.id = item_id
              and i.owner_id = (select auth.jwt()->>'sub'))
  )
  with check (
    exists (select 1 from items i where i.id = item_id
              and i.owner_id = (select auth.jwt()->>'sub'))
  );

-- ── wishlist ───────────────────────────────────────────────────────────────
alter table wishlist enable row level security;

create policy wishlist_owner_select on wishlist
  for select using ((select auth.jwt()->>'sub') = user_id);

create policy wishlist_owner_insert on wishlist
  for insert with check ((select auth.jwt()->>'sub') = user_id);

create policy wishlist_owner_delete on wishlist
  for delete using ((select auth.jwt()->>'sub') = user_id);

-- ── offers ─────────────────────────────────────────────────────────────────
alter table offers enable row level security;

create policy offers_parties_select on offers
  for select using (
    (select auth.jwt()->>'sub') in (from_user_id, to_user_id)
  );
-- insert/update/status: service role + create_offer()/accept_offer()/… only.

-- ── trades ─────────────────────────────────────────────────────────────────
alter table trades enable row level security;

create policy trades_parties_select on trades
  for select using (
    exists (
      select 1 from offers o
      where o.id = offer_id
        and (select auth.jwt()->>'sub') in (o.from_user_id, o.to_user_id)
    )
  );
-- updates: service role + confirm_trade()/update_meetup()/… only.

-- ── messages ───────────────────────────────────────────────────────────────
alter table messages enable row level security;

create policy messages_party_select on messages
  for select using (
    exists (
      select 1 from offers o
      where o.id = offer_id
        and (select auth.jwt()->>'sub') in (o.from_user_id, o.to_user_id)
    )
  );

-- Verified party, not blocked either way (docs/06). The app still re-checks
-- blocks server-side in sendMessage.
create policy messages_party_insert on messages
  for insert with check (
    sender_id = (select auth.jwt()->>'sub')
    and exists (
      select 1 from offers o
      where o.id = offer_id
        and (select auth.jwt()->>'sub') in (o.from_user_id, o.to_user_id)
        and not exists (
          select 1 from blocks bl
          where (bl.user_id = o.from_user_id and bl.blocked_id = o.to_user_id)
             or (bl.user_id = o.to_user_id   and bl.blocked_id = o.from_user_id)
        )
    )
    and exists (
      select 1 from profiles p
      where p.id = (select auth.jwt()->>'sub') and p.status = 'verified'
    )
  );

-- ── notifications / preferences ────────────────────────────────────────────
alter table notifications enable row level security;

create policy notifications_owner_select on notifications
  for select using ((select auth.jwt()->>'sub') = user_id);

create policy notifications_owner_update on notifications
  for update using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
-- inserts happen through lib/notify.ts (service role) only.

alter table notification_preferences enable row level security;

create policy notification_prefs_owner_all on notification_preferences
  for all using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

-- ── ratings ────────────────────────────────────────────────────────────────
alter table ratings enable row level security;

create policy ratings_public_select on ratings
  for select using (true);
-- inserts: rate_trade() via server only (completion + once-per-party checks).

-- ── reports / evidence / blocks ────────────────────────────────────────────
alter table reports enable row level security;

create policy reports_reporter_select on reports
  for select using (
    reporter_id = (select auth.jwt()->>'sub')
    or (select role from profiles where id = (select auth.jwt()->>'sub'))
       in ('moderator', 'admin')
  );

create policy reports_reporter_insert on reports
  for insert with check (
    reporter_id = (select auth.jwt()->>'sub')
    and exists (
      select 1 from profiles p
      where p.id = (select auth.jwt()->>'sub') and p.status = 'verified'
    )
  );
-- assignment/decisions: service role (docs/07).

alter table report_evidence enable row level security;

create policy report_evidence_select on report_evidence
  for select using (
    exists (
      select 1 from reports r
      where r.id = report_id
        and (r.reporter_id = (select auth.jwt()->>'sub')
             or (select role from profiles where id = (select auth.jwt()->>'sub'))
                in ('moderator', 'admin'))
    )
  );

alter table blocks enable row level security;

create policy blocks_owner_select on blocks
  for select using ((select auth.jwt()->>'sub') = user_id);

create policy blocks_owner_insert on blocks
  for insert with check ((select auth.jwt()->>'sub') = user_id);

create policy blocks_owner_delete on blocks
  for delete using ((select auth.jwt()->>'sub') = user_id);

-- ── server-only tables (no client policies at all) ─────────────────────────
-- docs/06: admin_actions, prohibited_keywords, residency_documents have no
-- client access; rate_limits is bookkeeping. 42501 for anon/authenticated.
alter table admin_actions        enable row level security;
alter table prohibited_keywords  enable row level security;
alter table rate_limits          enable row level security;

-- ── publicly readable config ───────────────────────────────────────────────
alter table announcements    enable row level security;
alter table legal_documents  enable row level security;

create policy announcements_public_select on announcements
  for select using (true);

create policy legal_documents_public_select on legal_documents
  for select using (true);
