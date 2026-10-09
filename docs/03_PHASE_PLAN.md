# 03 · Phase Plan (code only)

Stack: Next.js (App Router, TS) · Clerk · Supabase · Tailwind CSS.
Three phases: **Installation → Frontend → Backend**. Details for setup are in `10_INSTALLATION_GUIDE.md`.

---
## Phase 1 · Installation
- [x] Create Next.js app with TypeScript, Tailwind, ESLint
- [x] Install packages: Clerk, Supabase, zod, react-hook-form, Resend, React Email, Recharts, dnd-kit, lucide-react
- [x] Create folder structure (`app/`, `components/`, `lib/`, `supabase/`)
- [x] Create Clerk app, add keys to `.env.local` (keys verified: Clerk API and Supabase REST both reachable)
- [x] Create Supabase project, install CLI, link project (linked to `cainta_trade`; `db push` applied `001`–`003`)
- [ ] Enable Clerk as Supabase third-party auth (cannot be confirmed until a real signed-in session queries Supabase)
- [x] Add `middleware.ts` (`clerkMiddleware`) and `ClerkProvider` — Next.js 16 uses `proxy.ts`; route protection lives in layout guards (`lib/auth/guards.ts`), per Clerk v7 guidance
- [x] Create `lib/supabase/{server,admin,browser}.ts`
- [x] Create `.env.example`
- [~] Set up Clerk webhook endpoint (tunnel for local) — route verified end-to-end with the real signing secret (created/updated/deleted → live `profiles` rows); the dashboard endpoint URL must point at a running tunnel for local sign-ups
- [ ] Create first admin in `profiles` (no users exist yet)
- Pulled forward from 3.1 because the webhook needs them now: `001` enums, `002` reference tables, `003` profiles + residency_documents
- **Done when:** app runs, sign-in works, a Clerk user appears in `profiles`

---
## Phase 2 · Frontend (Tailwind, mock data first)
### Foundation
- [x] Tailwind theme tokens (colors, type, spacing) from the mockups
- [x] Shared components: button, input, select, textarea, badge, card, modal, toast, tabs, pagination, skeleton, empty state, upload box
- [~] Layouts: guest navbar, member navbar, mobile bottom tabs, admin sidebar, footer (all except admin sidebar, which lands with D24–D31)
### Pages
- [x] Public: landing, browse, item detail (guest), how it works, legal (A1–A5)
- [~] Auth: sign-in, sign-up, onboarding, recovery, account status (B6–B9) as custom mockup forms wired to Clerk headless hooks (`useSignIn`/`useSignUp`) — all five routes rendering and browser-verified at 1440/390; the **sign-up flow now also runs live end to end** in Playwright (Clerk Testing Tokens bypass the captcha, `+clerk_test` OTP 424242); the **sign-in flow now also runs live** (T-A10: sign out → wrong-password error panel → sign back in → status-based landing by profile state); 2FA (the instance has no second factors enrolled) and the reset flow still need their own specs
- [ ] Resident: dashboard, post item, edit item, my listings, item detail, make offer, offers, trade progress, messages, notifications, wishlist, public profile, settings, report (C10–C23)
- [ ] Admin: dashboard, users, listings, trades, reports, categories, audit, settings (D24–D31)
- [ ] System: 404, 403, 500, maintenance, offline, dialogs, empty states (E32–E33)
- [x] Email templates, React Email (E34) — 9 branded templates in `lib/email/templates.tsx` (shipped with 3.13)
### Finish
- [ ] Mobile cards instead of tables
- [ ] Accessibility: text sizes, contrast, focus, labels
- **Done when:** every screen renders at 390px and 1440px with mock data

---
## Phase 3 · Backend (full)
Order matters: 3.1 → 3.2 → then modules in order. Each sub-phase ends with a **Done when** line. Data design is in `06`, action list in `07`.

### 3.1 Database (Supabase migrations)
Create files in `supabase/migrations/` in this order:
- [x] `001` extensions (`pgcrypto`) and enums (`user_role`, `account_status`, `item_status`, `item_condition`, `trade_type`, `offer_status`, `trade_status`, `report_status`, `report_reason`)
- [x] `002` `barangays`, `categories`, `meetup_spots`
- [x] `003` `profiles` (id = Clerk user id), `residency_documents`
- [x] `004` `items`, `item_photos`, `wishlist`
- [x] `005` `offers` (partial unique index: one active offer per wanted item), `trades`
- [x] `006` `messages`, `notifications`, `notification_preferences`
- [x] `007` `ratings`
- [x] `008` `reports`, `report_evidence`, `blocks`
- [x] `009` `admin_actions` (append-only trigger), `prohibited_keywords`, `announcements`, `legal_documents`
- [x] `010` indexes and full-text search (`items.search` tsvector + GIN)
- [x] `011` views: `public_profiles`, `item_saved_counts`, `public_items`
- [x] `012` RLS: enable on every table, policies per table (see `06`)
- [x] `013` SQL functions (see 3.7 and 3.5)
- [x] `014` storage buckets (`listing-photos`, `residency-docs`, `chat-photos`, `report-evidence`) and policies
- [x] `015` Realtime publication for `messages` and `notifications`
- [x] `seed.sql`: 7 barangays, 13 categories + subcategories, 7 meetup spots, sample data
- [x] Extra migrations `017`–`024` (bug fixes from 999 assertions, rate-limit table, `profiles.created_at`, avatars bucket, cron markers)
- **Done when:** `supabase db push` works on a clean project and an anon query returns nothing from private tables
- **Note:** push with `npx supabase db push --include-all` — `021+` and `999_test_assertions.sql` sort after the default range, so a plain `db push` refuses. Anon REST re-verified: barangays=7, categories=13, spots=7, `public_items`=5 demo rows, `profiles`/`admin_actions`=[] for anon.

### 3.2 Shared server layer
- [x] `lib/supabase/{server,admin,browser}.ts`
- [x] `lib/auth/guards.ts`: `requireSignedIn`, `requireVerified`, `requireRole`
- [x] `lib/validators/*.ts`: zod schemas per module (onboarding, item, offer, message, report, settings, admin decisions)
- [x] `lib/errors.ts`: typed errors, reference codes, safe messages
- [x] `lib/audit.ts`: `logAdminAction()`
- [x] `lib/notify.ts`: `createNotification()` plus email dispatch by user preference
- [x] `lib/uploads.ts`: type sniffing, size limit, random names, per-user folder, EXIF strip
- [x] `lib/ratelimit.ts`: limits for onboarding, offers, messages, reports, uploads
- [x] `lib/storage.ts`: upload helpers and signed URL helper
- **Done when:** a sample action uses guard + zod + error handler + audit helper

### 3.3 Auth sync and onboarding
- [x] `/api/webhooks/clerk`: verify Svix signature; `user.created` → insert `profiles`; `user.updated` → update email/name; `user.deleted` → mark deleted
- [x] Action `completeOnboarding`: validate mobile (+63), enabled barangay, address, consent; upload proof to `residency-docs/{clerkId}/...`; insert `residency_documents`; set profile `pending` and `onboarded_at`
- [x] Redirect logic: not onboarded → `/onboarding`; pending → `/account-status` for gated routes
- [x] Actions `resendDetails`, `submitAppeal`
- [x] Overdue flag: pending profiles older than 24 h
- **Done when:** sign up → onboarding creates a pending profile with a private document

### 3.4 Admin user management
- [x] `listUsers` (status, barangay, proof type, search, pagination)
- [x] `getUser` (profile, listings, trades, reports)
- [x] `approveUser`: status verified, `approved_at/by`, `delete_after` = +90 days, approval email, audit row
- [x] `rejectUser` (reason, email, audit row), `requestDocument`
- [x] `suspendUser` (reason, duration, email, audit row), `reinstateUser`
- [x] `/api/admin/users/[id]/proof`: role check, 60 s signed URL, `document_viewed` audit row
- **Done when:** admin approves a user and the audit log shows the proof view and approval

### 3.5 Listings
- [x] `createItem` (draft or publish), `updateItem`, `setItemStatus` (available, paused, exchanged), `removeItem` (reason), `renewItem` (+30 days)
- [x] Rules: title ≤80; enums; status locked to pending while an offer is accepted; cash words flagged
- [x] Photo upload route: max 8, JPG/PNG ≤5 MB, main photo, delete photo, reorder
- [x] `listItems`: full-text search, category/condition/barangay/status filters, sort, pagination, filter counts
- [x] `getItem`: photos, owner mini-profile (from `public_profiles`), nearby meetup spots, same-category items
- [x] `incrementViews` once per session
- [x] `getMyListings` with status counts
- **Done when:** verified user posts with photos; guests can search and filter

### 3.6 Wishlist
- [x] `save_item` function (limit 10 pending / 20 verified), `unsaveItem`, `listWishlist` with change notes (pending, removed, exchanged)
- [x] RLS: owner only; `item_saved_counts` view for anonymous count
- **Done when:** owners never see who saved their item

### 3.7 Offers and trades (SQL functions)
- [x] `create_offer`: requester verified; offered item theirs and available; wanted item available and not theirs; one active offer per wanted item; message ≤500; meetup proposal; expires in 3 days; notify owner
- [x] `accept_offer`: offer accepted, both items pending, trade created (`TR-xxxx`), other offers on the item rejected, notifications
- [x] `reject_offer`, `cancel_offer` (reason; cancels trade and returns items if accepted)
- [x] `update_meetup`: place/time change with confirmation by the other side
- [x] `confirm_trade`: error before `meetup_at`; one confirm per party; when both → completed, items exchanged, rating prompts
- [x] `dispute_trade`: status disputed, admin notified
- [x] Server Actions wrap each function; `listOffers` (received, sent, closed), `getTrade`
- **Done when:** two accounts complete a trade; early confirm and a second offer on the same item are rejected

### 3.8 Messaging and notifications
- [x] `listConversations` (unread, last message), `getMessages`, `sendMessage` (text or one photo to `chat-photos`), `markRead`
- [x] Block check and verified check on send
- [ ] Realtime: subscribe to `messages` by `offer_id` and `notifications` by `user_id` using the Clerk token — blocked on Supabase third-party auth (docs/05); messages still work via fetch/polling actions
- [x] `listNotifications` (type tabs, day groups), `markNotificationRead`, `markAllRead`
- [x] `notification_preferences` get/update; send email only when the preference allows
- [x] No notification when someone saves an item
- **Done when:** a message appears live for the other user and the unread badge updates

### 3.9 Ratings and public profile
- [x] `rateTrade`: 1–5 stars, tags, comment, sub-scores; one per party per trade; only after completion
- [x] `getMember` and `listMemberRatings` via `public_profiles`, respecting privacy toggles
- [x] Average rating, completed trades, response rate calculations
- [x] `blockMember`, `unblockMember`
- **Done when:** duplicate ratings fail and hidden fields are not returned

### 3.10 Reports and moderation
- [x] `createReport`: target (listing, member, message), 8 reasons, details ≤1000, up to 5 evidence files, optional chat transcript, anonymous option
- [x] Urgent flag for money/prohibited reasons
- [x] `listReports` (oldest first), `assignReport`, `askReporter`
- [x] `decideReport`: dismiss, warn, remove listing (cancels accepted trade), suspend user; required moderation note; notify both parties; audit row
- [x] Member history data for the queue
- **Done when:** a moderator resolves a report and both parties are notified

### 3.11 Admin console data
- [x] `getAdminStats` (KPIs, signups vs trades by month, trades per barangay, top categories, health checks)
- [x] `listAdminListings`, `flagListing`, `removeListing`
- [x] `listAdminTrades` (funnel, cancellation reasons, stalled/unconfirmed)
- [x] Categories CRUD with reorder, enable/disable, delete only when empty
- [x] Prohibited keywords CRUD (hold vs flag)
- [x] Barangays, meetup spots, announcements CRUD
- [x] Legal documents: new version, effective date
- [x] `listAudit` with filters and `exportAuditCsv`
- [x] Role gates: moderator limited to users, listings, trades, reports
- **Done when:** every admin write creates an audit row; moderator gets 403 on admin-only pages

### 3.12 Settings, privacy, data rights
- [x] `updateProfile` (name change goes to approval; barangay change re-triggers residency check), `uploadPhoto`
- [x] Privacy toggles (mobile, last active, usual meetup, trade count, barangay, hide from search)
- [x] `requestDataExport` (profile, listings, offers, messages)
- [x] `deleteResidencyDocument`
- [x] `deleteAccount`: blocked with open trades; remove data, then delete the Clerk user
- **Done when:** export works and a deleted account cannot sign in

### 3.13 Email service (Resend + React Email)
- [x] Sender wrapper with plain-text fallback
- [x] Templates: welcome, new offer, offer accepted, account approved, account suspended, listing removed, report outcome, meetup reminder, admin notice
- [x] Triggered from `notify.ts` according to preferences
- **Done when:** each template sends in test mode

### 3.14 Scheduled jobs (`/api/cron/*`, secured by `CRON_SECRET`, `?dryRun=1` supported)
- [x] `expire-listings` (+ reminders at 12 and 3 days)
- [x] `expire-offers` (pending older than 3 days)
- [x] `purge-residency` (file + row past `delete_after`)
- [x] `purge-old` (messages and audit past retention)
- [x] `meetup-reminders` (day before)
- [x] `overdue-approvals`
- [x] Log each run to the audit table as `automatic`
- [x] `vercel.json` cron entries
- **Done when:** dry runs list the right rows and real runs change them

### 3.15 Connect and test
- [x] Replace every mock-data call in the frontend with real queries and actions
- [x] Unit tests: zod schemas, services
- [x] SQL tests: trade functions and RLS as anon, pending, verified, other user, moderator, admin
- [~] Playwright: sign-up to approval runs as a **real** round trip (T-A1 in `e2e/auth-and-trade.spec.ts`: testing-token captcha bypass, fixed OTP 424242, proof upload, pending badge, profile + residency-document rows asserted) and the **sign-in round trip** (T-A10: sign out → wrong-password error panel with attempt counter → sign back in → status-based landing); **24 green across all runnable specs**; the remaining member-flow specs (T-A4, T-A7, T-L\*, T-O\*, T-R\*) are skipped because the resident **C10–C23** and admin **D24–D31** screens are not built yet (docs/05 §D)
- [x] Security checks from `11` (IDOR, uploads, webhook/cron secrets, service-role key not in client bundle)
- **Security results:** service key absent from `.next/static` (0 hits; only local Turbopack build caches on disk), Clerk/Resend secrets absent too; cron routes 401 without/with a wrong bearer (unit + Playwright); webhook rejects unsigned/tampered payloads; every id-taking action resolves ownership via `ownedItem`/`eq('user_id', …)`/SQL party checks; rate limits active on onboarding, offers, messages, reports, uploads.
- **Done when:** the test plan in `09` passes and a full trade works end to end — *pending: the full-trade E2E needs the resident screens C10–C23 (docs/05 §D); sign-up → pending approval now runs live in Playwright, and SQL-level trade rules already pass in `999_test_assertions.sql`.*

---
## After MVP (code)
- Tier 2: counter-offer, follow, saved-search alerts, auto-renew, listing health, keyword auto-hold, pause account
- Tier 3: SMS reminders, mobile sign-in, MFA via Clerk (check plan)
