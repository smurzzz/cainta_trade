# 04 · Functionality Prompts (for an AI coding assistant)

Use: paste **Prompt 0** first and keep it as standing context. Then paste one module prompt at a time, in order, and run its acceptance check before continuing. Attach `06_DATABASE_ERD.md` and `07_API_ENDPOINTS.md` when building data and actions.

---
## Prompt 0 · Standing context (always include)
```
You are a senior full-stack engineer building "CaintaTrade", a community item-exchange
website for residents of Cainta, Rizal, Philippines.

STACK: Next.js (App Router, TypeScript), Tailwind CSS, Clerk (auth), Supabase (Postgres,
Storage, Realtime), zod + react-hook-form, Resend + React Email, Vercel Cron.

ARCHITECTURE RULES
- Clerk owns identity. Do NOT build password, session or verification tables.
- Clerk is a Supabase third-party auth provider. Server code passes the Clerk session
  token to Supabase with auth().getToken() via the supabase-js `accessToken` option.
  Do not call supabase.auth.* . RLS reads the user id from auth.jwt()->>'sub'.
- profiles.id is the Clerk user id (text). A Clerk webhook (svix-verified) syncs profiles.
- Two server clients: supabaseUser() (Clerk token, RLS applies) and supabaseAdmin()
  (service role, server-only, only after requireRole()).
- Trade state changes (create/accept/reject/cancel offer, update meetup, confirm/dispute
  trade) are Postgres functions so they are atomic.
- Mutations are Server Actions validated with zod; reads are Server Components; Route
  Handlers only for webhooks, cron, uploads, and file streaming.
- Tailwind only for styling; mobile-first; cards (not tables) on small screens.

PRODUCT RULES
- Item-for-item exchange only. No cash, payments, delivery, live GPS, auto-matching or valuation.
- Only the 7 Cainta barangays. Age 18+. Account must be approved by an admin after
  reviewing one residency proof.
- Account status: pending, verified, suspended, deleted. Item status: draft, available,
  pending, exchanged, removed, expired, paused. Offer status: pending, accepted,
  rejected, cancelled, completed, expired.
- Roles: resident, moderator, admin. Pending users may browse, use settings and save up
  to 10 items; they may not post, offer or message.
- Residency documents: private bucket, no client access, signed URL 60 s via a server
  route that writes an audit row, auto-deleted 90 days after approval.
- Owner is never told who saved their item.
- admin_actions is append-only.
- Friendly plain-English errors; every error includes a reference code.

QUALITY: TypeScript strict, shared zod schemas, small components, env vars documented in
.env.example, no secrets in client code, comments on non-obvious rules.

Work in small steps. For each task: list files, write code, then give manual test steps.
Ask me only if a decision blocks you.
```

---
## Prompt 1 · Project setup and database
```
Create the Next.js app (App Router, TS, Tailwind, ESLint) with the folder structure in
01_PROJECT_OVERVIEW.md. Add zod, react-hook-form, @clerk/nextjs, @supabase/supabase-js.
Write Supabase SQL migrations for ALL tables, enums, indexes, storage buckets, RLS
policies and RPC functions in 06_DATABASE_ERD.md. Write seed.sql: 7 barangays, 13
categories with subcategories, 7 meetup spots, sample items. Create lib/supabase/
{server,admin,browser}.ts and lib/auth/guards.ts (requireSignedIn, requireVerified,
requireRole). Add middleware.ts with clerkMiddleware protecting member and admin routes.
Add .env.example (Clerk keys, Supabase URL/anon/service keys, Resend key, CRON_SECRET).
ACCEPTANCE: migrations apply to a clean Supabase project; app boots; anon cannot read
profiles, offers, messages, residency_documents.
```

## Prompt 2 · Auth, onboarding, residency approval (B6-B9, D25)
```
Implement:
1. Clerk <SignIn/> and <SignUp/> pages styled with Tailwind appearance to match the
   mockups.
2. Webhook /api/webhooks/clerk (verify svix signature) creating/updating/deleting profiles.
3. /onboarding: form (mobile +63, barangay from enabled list, street address, consent
   checkboxes, residency proof JPG/PNG/PDF <=5MB). Server Action completeOnboarding
   validates with zod, uploads to private bucket residency-docs/{clerkId}/..., inserts
   residency_documents, sets profile pending, sets onboarded_at.
4. /account-status: pending (progress steps, overdue badge after 24 h) and suspended views.
5. Redirect logic: signed-in users without onboarding -> /onboarding; pending ->
   /account-status for gated routes; admins/moderators -> /admin allowed.
6. Admin /admin/users: tabs, filters, approve (status verified, delete_after +90 days,
   Resend email, audit row), reject with reason, request document, suspend, reinstate.
7. Route Handler /api/admin/users/[id]/proof: role check, signed URL 60 s, audit row
   document_viewed.
ACCEPTANCE: sign up -> onboarding -> admin approves -> /home opens; pending user is
blocked from /items/new; every proof view creates an audit row.
```

## Prompt 3 · Listings, photos, browse (A1-A3, C11-C14)
```
Implement per 07_API_ENDPOINTS.md: create (draft/publish), edit, status change, remove
with reason, renew (+30 days). Photo upload to listing-photos/{userId}/ (max 8, JPG/PNG
<=5MB, client-side compression, main photo flag). Validation: title <=80, enums for
category/condition/trade_type (item_for_item | multiple_smaller). Listings with
cash-related words are flagged, not blocked. If an offer is accepted the status is locked
to pending.
Browse: Postgres full-text search on items.search, filters (category, condition,
barangay, status), sort, pagination, filter counts, empty and no-results states.
Item detail: guest, member and owner variants; owner mini-profile; nearby meetup spots;
"More in this category".
Pages: landing, browse, item detail, post item (live preview, checklist), edit item,
my listings (tabs, counts, mobile cards).
ACCEPTANCE: verified user posts with 3 photos; guests can search and filter; status lock works.
```

## Prompt 4 · Wishlist (C20)
```
save_item RPC with limits (pending 10, verified 20), unsave, list with change notes
(pending, removed, exchanged). RLS: owner-only rows; item owners only see an aggregate
anonymous saved count. Build the wishlist page with filter chips and banners.
ACCEPTANCE: owner never receives a notification or row-level access to who saved.
```

## Prompt 5 · Offers, trades, meetup (C15-C17)
```
Implement SQL functions and Server Actions:
- create_offer: requester verified; offered item theirs and available; wanted item
  available and not theirs; only one active offer per wanted item (partial unique index);
  message <=500; meetup proposal; expires in 3 days.
- accept_offer: offer accepted, both items pending, trade created (TR-xxxx), other offers
  on the wanted item rejected, notifications created.
- reject_offer, cancel_offer (reason; if accepted, cancel trade and return items).
- update_meetup (other side confirms).
- confirm_trade: raises an error before meetup_at; each party once; when both -> completed,
  items exchanged, rating prompts created.
- dispute_trade: status disputed, admin notified.
Pages: make offer (compact item summary, pick item, message, meetup), offers
(received/sent/closed), trade progress with 5-step tracker and a disabled Confirm button
with explanation before meetup time.
ACCEPTANCE: full trade works for two accounts; confirm is rejected server-side before
meetup time; second offer on same item is blocked.
```

## Prompt 6 · Chat and notifications (C18, C19)
```
Per-offer conversations: list with unread counts and last message, thread view, send text
or one photo (chat-photos private bucket, signed URLs), mark read, block check. Use
Supabase Realtime (postgres_changes on messages filtered by offer_id; on notifications
filtered by user_id) with the Clerk token. Notification page with tabs and day groups,
mark read/all read, preferences per type. Emails via Resend for offers and messages
according to preferences. No notification when someone saves an item.
Mobile: conversation list then full-screen thread with back button.
ACCEPTANCE: a new message shows live for the other user; unread badge updates; blocked
users cannot message.
```

## Prompt 7 · Ratings and profiles (C21)
```
Rating form after a completed trade (1-5 stars, tags, optional comment, sub-scores);
unique per party per trade. Public profile via a public_profiles view that respects
privacy toggles: verified badge, average rating, completed trades, response rate, active
listings, ratings list, history with the viewer, report button.
ACCEPTANCE: duplicate rating rejected; hidden fields are not returned.
```

## Prompt 8 · Settings and privacy (C22)
```
Settings page: personal info (name change goes to admin approval; barangay change
re-triggers residency check), photo, contact visibility toggles, Clerk <UserProfile/> or
custom sections for password/sessions/MFA, notification preferences, privacy (export,
delete residency doc now, hide profile, last active, usual meetup), delete account
(blocked with open trades; then delete Clerk user). Mobile uses stacked toggles instead
of a table.
ACCEPTANCE: export includes profile, listings, offers, messages; deleted account cannot sign in.
```

## Prompt 9 · Reports and moderation (C23, D28)
```
Report form (listing/member/message; 8 reasons; details <=1000; up to 5 evidence files to
report-evidence; optional chat transcript; anonymous; email outcome). Admin queue
(oldest first, urgent flag for money/prohibited), assign, ask reporter, decision (dismiss,
warn, remove listing, suspend user) with required moderation note, notify both parties,
audit row, member history panel.
ACCEPTANCE: removing a listing with an accepted offer cancels the trade and notifies both;
anonymous reporter is never revealed to the reported member.
```

## Prompt 10 · Admin console (D24-D31)
```
Admin layout (sidebar, role gate in layout via requireRole) and pages: dashboard (KPIs,
single signups-vs-trades chart with Recharts, trades per barangay, top categories, recent
activity, needs-a-decision, health checks), listings, trades overview, categories
(dnd-kit reorder, enable/disable, keywords hold vs flag), audit log (filters, CSV export,
append-only via trigger), barangays and meetup spots, announcements, legal editor with
versions. Moderators see only users, listings, trades, reports.
ACCEPTANCE: every admin write creates an audit row; moderator gets 403 on categories,
settings and audit.
```

## Prompt 11 · Jobs, system pages, emails
```
Route Handlers under /api/cron/* secured by CRON_SECRET (vercel.json crons): expire
listings and offers, purge residency docs after 90 days (delete storage file + row),
purge old messages/audit, meetup reminders, overdue-approval flag; support ?dryRun=1.
Add not-found, error, 403, maintenance and offline pages with reference codes; toast,
dialog, skeleton components; 9 React Email templates (welcome note after onboarding, new
offer, offer accepted, account approved, account suspended, listing removed, report
outcome, meetup reminder, plus a generic admin notice). Clerk sends its own verification
and reset emails.
ACCEPTANCE: dry run lists changes; emails render with images blocked.
```

## Prompt 12 · Responsive and accessibility pass
```
Audit every page at 390px and 1440px. Convert tables to cards on mobile (my listings,
admin users/listings/trades/audit/barangays/categories, settings notifications). Fixed
tab bars must not cover content. Tap targets >=44px, body text >=16px, sentence case
labels, WCAG AA contrast, focus rings, alt text, labelled inputs, status = colour + word.
ACCEPTANCE: Lighthouse accessibility >=90 on key pages; no horizontal scroll on mobile.
```

## Prompt 13 · Security and tests
```
Review: RLS on every table (test as anon, pending, verified, other user, moderator),
IDOR checks in every Server Action, service-role key never reaches the client, webhook
signature check, upload type/size/path, XSS escaping, rate limits, dependency audit.
Write unit tests (zod, services), SQL tests for trade functions and RLS, and Playwright
flows: sign-up to approval, post item, full trade, report. Deliver a short security report.
```

## Tier 2 prompts (after MVP)
```
Counter-offer (parent_offer_id, original becomes countered). Follow members and notify on
new listing. Saved searches with alerts. Auto-renew job. Listing health stats. Keyword
auto-hold (hold words queue the listing; cash/gcash/down payment only flag). Pause account
for 30 days with automatic resume.
```
## Tier 3 prompts (needs budget)
```
SMS meetup reminders and phone verification (Clerk phone or an SMS provider), mobile
sign-in, MFA through Clerk (confirm plan).
```
