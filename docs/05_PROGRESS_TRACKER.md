# 05 · Progress Tracker

Legend: `[x]` done · `[ ]` not started · `[~]` in progress. Update weekly.
**Overall progress:** Design ~85% · Backend ~95% (Realtime blocked on Supabase third-party auth) · Frontend ~90% (mobile cards + a11y pass open) · QA ~85% · Deploy 0%

## A. Planning and Documents
- [x] System proposal written
- [x] Gap analysis completed
- [x] Design prompt created
- [x] 34 desktop mockups received
- [x] 34 mobile mockups received
- [x] Revision prompt created
- [x] Documentation pack created
- [ ] Scope frozen (Tier 1/2/3)
- [ ] Open decisions answered (see 08)
- [ ] Proposal updated to match mockups (verification, offers, chat, admin)

## B. Design Status (by screen)
| ID | Screen | Desktop | Mobile | Fixes needed |
|----|--------|:------:|:-----:|--------------|
| A1 | Landing | [x] | [x] | |
| A2 | Browse | [x] | [x] | Blank image boxes on mobile |
| A3 | Item detail (guest) | [x] | [x] | "member since" vs "yrs" mismatch |
| A4 | How it works | [x] | [x] | |
| A5 | Terms and privacy | [x] | [x] | Mobile table to cards; legal review |
| B6 | Register | [x] | [x] | Headless `useSignUp`; live sign-up round trip green (T-A1) |
| B7 | Login | [x] | [x] | 2FA/mobile dialogs wired; email + password sign-in live (T-A10) |
| B8 | Recovery | [x] | [x] | Custom panels; reset strategy now enabled on the instance — live reset spec still to write |
| B9 | Account status | [x] | [x] | |
| C10 | Dashboard | [x] | [x] | |
| C11 | Post item | [x] | [x] | |
| C12 | Edit item | [x] | [x] | |
| C13 | My listings | [x] | [x] | Mobile cards need name/status/stats |
| C14 | Item detail (member) | [x] | [x] | |
| C15 | Make offer | [x] | [x] | |
| C16 | Offers | [x] | [x] | |
| C17 | Trade progress | [x] | [x] | |
| C18 | Messages | [x] | [x] | Mobile list then thread |
| C19 | Notifications | [x] | [x] | Buttons below text on mobile |
| C20 | Wishlist | [x] | [x] | |
| C21 | Public profile | [x] | [x] | Name overlaps cover |
| C22 | Settings | [x] | [x] | Notification table to stacked toggles |
| C23 | Report | [x] | [x] | Tab bar covers content |
| D24 | Admin dashboard | [x] | [x] | |
| D25 | Admin users | [x] | [x] | Mobile cards |
| D26 | Admin listings | [x] | [x] | Mobile cards |
| D27 | Admin trades | [x] | [x] | Mobile cards |
| D28 | Admin reports | [x] | [x] | "RP-2028" typo; consistent report counts |
| D29 | Admin categories | [x] | [x] | Compact cards |
| D30 | Audit log | [x] | [x] | Mobile cards |
| D31 | Barangays and terms | [x] | [x] | Mobile cards |
| E32 | System pages | [x] | [x] | |
| E33 | Dialogs and states | [x] | [x] | |
| E34 | Email templates | [~] | [~] | 8 of 9 designs not shown |

### Missing designs
- [ ] Counter-offer
- [ ] Change meetup
- [ ] "It did not happen" dispute
- [ ] Rate and feedback
- [ ] Renew confirmation
- [ ] Trade record
- [ ] Admin approve/reject with reason
- [ ] Residency document viewer (watermarked, logged)
- [ ] Admin user detail
- [ ] 2FA setup and code
- [ ] Pause account
- [ ] SMS phone verification
- [ ] Saved-search management
- [ ] Avatar dropdown
- [ ] Email verified success
- [ ] Empty states (My listings, Offers, Messages, Notifications, Wishlist)
- [ ] Other 8 email designs

## C. Phase 1 · Installation
- [x] Next.js + Tailwind app created
- [x] Packages installed
- [x] Folder structure created
- [x] Clerk app and keys (moved into `.env.local`; `.env.example` re-sanitized)
- [x] Clerk instance sign-in methods: enable **Email + Password** (10 §Clerk) — done: `password` was already a first factor, and `email_address` was added as an identification strategy via `PATCH /v1/instance` (the dashboard toggle never reached this — unclaimed — instance); verified against the Frontend API and exercised live by T-A10
- [x] Supabase project linked (CLI linked to `cainta_trade`, `db push` applied `001`–`003`)
- [ ] Clerk enabled as Supabase third-party auth (confirm on first real sign-in)
- [x] `middleware.ts` and `ClerkProvider`
- [x] Supabase client files
- [x] `.env.example`
- [~] Clerk webhook endpoint (route verified end-to-end with the real signing secret; dashboard URL must reach a running tunnel for local sign-ups)
- [ ] First admin created (no users exist yet)
- [x] Migrations `001`–`003` written (pulled forward from 3.1 so `profiles` exists for the webhook)

## D. Phase 2 · Frontend
- [x] Tailwind tokens and shared components (incl. shared modal `components/ui/dialog.tsx` and toast `components/ui/toast.tsx`)
- [x] Layouts (guest navbar, member navbar, mobile tabs, footer, admin sidebar — all built with D24–D31)
- [x] Public pages A1–A5
- [~] Auth pages B6–B9 (custom mockup forms wired to headless Clerk hooks — B6/B7/B8/B9 + onboarding rendering and browser-verified at 1440/390, incl. validation, error, loading and dialog states; the sign-up flow is now exercised end to end in Playwright via Clerk Testing Tokens + the `+clerk_test` OTP, and sign-in runs live too — T-A10 covers sign-out, the wrong-password error panel, the retry and the status-based landing; 2FA and the reset flow have no specs yet)
- [x] Resident pages C10–C23 (dashboard, post/edit + photo manager, my listings, item detail, offer, offers, trade tracker, messages/thread, notifications, wishlist, public profile, settings, report — driven live by the T-L/T-O/T-M/T-R specs in `e2e/auth-and-trade.spec.ts`)
- [x] Admin pages D24–D31 (dashboard, users incl. approve/reject/suspend + proof viewer, listings, trades, reports incl. decisions, categories/keywords, audit log, settings; categories/settings/audit return the 403 page for moderators — docs/09 T-R3)
- [x] System pages and dialogs E32–E33 (404 + 403 with reference code via `forbidden()` + 500 digest, maintenance takeover behind `NEXT_PUBLIC_MAINTENANCE`, offline banner; shared dialogs/toasts/skeletons/empty states)
- [x] Email templates E34 (9 branded React Email templates with text fallbacks, wired through `notify.ts`)
- [ ] Mobile cards and accessibility pass

## E. Phase 3 · Backend
- [x] 3.1 Database migrations, RLS, functions, storage, seed (`001`–`025` + `999_test_assertions.sql`; push with `npx supabase db push --include-all`; `025` adds the missing `residency_documents.created_at` the approval queries ordered by)
- [x] 3.2 Shared server layer (guards, zod, errors, audit, notify, uploads, rate limit)
- [x] 3.3 Clerk webhook and onboarding
- [x] 3.4 Admin user management and proof viewer
- [x] 3.5 Listings, photos, search (`listItems` FTS + facets, `getItem`, view counter, `getMyListings`)
- [x] 3.6 Wishlist
- [x] 3.7 Offers and trades (SQL functions)
- [~] 3.8 Messaging and notifications — actions, prefs and email done; **Realtime subscriptions blocked** until Supabase third-party auth is enabled
- [x] 3.9 Ratings, public profile, blocks
- [x] 3.10 Reports and moderation
- [x] 3.11 Admin console data and CRUD
- [x] 3.12 Settings, privacy, data export, delete account
- [x] 3.13 Email service and templates (Resend wrapper, 9 templates, render tests green; live delivery unverified — sending domain not confirmed)
- [x] 3.14 Cron jobs (6 routes, `CRON_SECRET` + `?dryRun=1`, audit rows, `vercel.json` incl. `overdue-approvals`)
- [x] 3.15 Replace mock data and run tests — all 5 existing mock consumers wired; 73 unit tests + SQL 999 + **Playwright 36/36 green** (public-catalog, security and the full auth/trade/moderation suite — T-A1/A4/A7/A10, T-L*, T-O*, T-M1 send, T-R*); usability §8 remains manual (§F)

### Bugs found and fixed by the E2E suite (Phase 3.15)
- `approveUser`/`rejectUser` ordered `residency_documents` by a **non-existent `created_at`** column → migration `025` + `.error` checks on those queries (T-A7).
- **Five dialogs rendered unconditionally** (`fixed inset-0` backdrop always mounted, blocking every click underneath): admin listings, admin reports, admin categories, member offers, my-listings — now gated on their open state.
- New listings defaulted to **draft** (`Save as draft`), so the primary CTA and `?created=live` never matched — new mode now defaults to publish (edit mode keeps the item's status).
- Sign-in helper waits for `window.Clerk` readiness; session tests use Clerk **testing tickets** (the instance's Device Trust returns `needs_client_trust` for password sign-in from a fresh browser — see §E blocker 1).
- Landing spec no longer pins exact seed titles in the featured row (parallel specs publish temporary listings; landing shows the newest 4 with `revalidate = 60`).

### Phase 3 blockers (user-side dashboard steps)
1. ~~**Clerk → Email + Password sign-in** disabled (OAuth Google only)~~ **resolved** — `email_address` added as an identification strategy via `PATCH /v1/instance`; T-A10 now signs in live, and the member/admin specs are unskipped with real bodies (09).
   - **New finding (this phase):** the instance also has **Device Trust** enabled — a password sign-in from a *fresh browser* returns `needs_client_trust`, which the custom sign-in form does not handle (same-browser round trips like T-A10 keep working because sign-up establishes trust). Follow-up: handle `needs_client_trust` in `components/auth/sign-in-form.tsx` (Clerk device-trust custom flow) or disable the setting in the dashboard; E2E tests use Clerk testing tickets instead.
2. **Supabase → third-party auth (Clerk)** not enabled → browser-side user queries and Realtime over the Clerk token deferred; server/service-role paths unaffected.
3. **Resend sending domain** unverified → emails render + are dispatched in code, live delivery unconfirmed.

## F. Tests, Security, Privacy
- [x] Unit, SQL/RLS, Playwright tests (`09`) — 73 vitest + SQL 999 green; Playwright **36 green, 0 skipped** (public-catalog 7, security 15, auth-and-trade 14 covering T-A1/A4/A7/A10, T-L1–L5, T-L7, full trade T-O1→T-O7 + T-M1 send, T-O5, T-O8, T-R1→T-R4); teardown sweeps remove every test user/profile; usability §8 still manual
- [~] Security checklist complete (`11`) — bundle/IDOR/cron/webhook checks done this phase; privacy-notice copy and legal review still open
- [ ] Privacy review and legal review

## G. Tier 2 / Tier 3 (after MVP)
- [ ] Counter-offer
- [ ] Follow
- [ ] Saved-search alerts
- [ ] Auto-renew
- [ ] Listing health and analytics
- [ ] Keyword auto-hold
- [ ] Pause account
- [ ] SMS reminders and mobile login
- [ ] Two-factor authentication

## Weekly Log
| Week | Planned | Done | Blockers |
|------|---------|------|----------|
| 1 | | | |
| 2 | | | |
