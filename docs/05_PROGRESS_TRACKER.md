# 05 · Progress Tracker

Legend: `[x]` done · `[ ]` not started · `[~]` in progress. Update weekly.
**Overall progress:** Design ~85% · Backend 0% · Frontend ~25% · QA 0% · Deploy 0%

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
| B6 | Register | [x] | [x] | Headless `useSignUp`; live submit blocked on Clerk Email + Password |
| B7 | Login | [x] | [x] | 2FA/mobile dialogs wired; strategies off |
| B8 | Recovery | [x] | [x] | Custom panels; live reset blocked on Email + Password |
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
- [ ] Clerk instance sign-in methods: enable **Email + Password** (10 §Clerk) — instance currently offers Google only, so B6/B7 render no email form and B8 (forgot/reset password, email verification) cannot be exercised
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
- [~] Layouts (guest navbar, member navbar, mobile tabs, footer done; admin sidebar pending with D24–D31)
- [x] Public pages A1–A5
- [~] Auth pages B6–B9 (custom mockup forms wired to headless Clerk hooks — B6/B7/B8/B9 + onboarding rendering and browser-verified at 1440/390, incl. validation, error, loading and dialog states; live email/password/2FA/reset steps blocked until **Email + Password** is enabled on the Clerk instance)
- [ ] Resident pages C10–C23
- [ ] Admin pages D24–D31
- [ ] System pages and dialogs E32–E33
- [ ] Email templates E34
- [ ] Mobile cards and accessibility pass

## E. Phase 3 · Backend
- [ ] 3.1 Database migrations, RLS, functions, storage, seed
- [ ] 3.2 Shared server layer (guards, zod, errors, audit, notify, uploads, rate limit)
- [ ] 3.3 Clerk webhook and onboarding
- [ ] 3.4 Admin user management and proof viewer
- [ ] 3.5 Listings, photos, search
- [ ] 3.6 Wishlist
- [ ] 3.7 Offers and trades (SQL functions)
- [ ] 3.8 Messaging and notifications (Realtime)
- [ ] 3.9 Ratings, public profile, blocks
- [ ] 3.10 Reports and moderation
- [ ] 3.11 Admin console data and CRUD
- [ ] 3.12 Settings, privacy, data export, delete account
- [ ] 3.13 Email service and templates
- [ ] 3.14 Cron jobs
- [ ] 3.15 Replace mock data and run tests

## F. Tests, Security, Privacy
- [ ] Unit, SQL/RLS, Playwright tests (`09`)
- [ ] Security checklist complete (`11`)
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
