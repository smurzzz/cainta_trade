# 02 · Screen Architecture

Format per screen: **Route · Access · Layout · Data needed · Key components · Actions/API · States · Notes**.
Pages are Next.js App Router routes; data/actions below are Server Actions or Route Handlers (see 07). Styling is Tailwind.
Global layout pieces: Guest navbar, Member navbar (Home, Browse, My listings, Offers, Messages, bell, avatar menu, Post an item), mobile bottom tab bar (Home, Browse, Post, Offers, Messages/Profile), Admin sidebar, footer with non-affiliation notice.
Global states for every list/form: loading skeleton, empty, error (with reference code), success toast, validation errors.

---
## A · PUBLIC

### A1 Landing `/`
- Access: Guest, Member
- Data: featured items, category counts, barangay counts, weekly stats
- Components: hero + CTAs, 4-step how-it-works, featured items grid, categories grid, barangay coverage, safety teaser + meetup spots, final CTA
- API: `GET /items?featured=1`, `GET /categories`, `GET /barangays`, `GET /stats/public`
- Notes: "trade of the week" is optional

### A2 Browse `/browse`
- Access: Guest, Member
- Data: items (paginated), filter counts
- Components: search bar, category/condition/barangay/status filters, popular chips, sort, grid/list toggle, item card (photo, status badge, category, barangay, title, looking-for, owner, age, wishlist heart), pagination
- API: `GET /items?q&category&condition&barangay&status&sort&page`
- States: loading, empty, no results, error
- Notes: "show exchanged too" toggle; guests see a login CTA instead of heart actions

### A3 Item detail (guest) `/items/:id`
- Access: Guest
- Data: item, photos, owner mini-profile, nearby meetup spots, same-category items
- Components: gallery, status/category/condition tags, description, looking-for box, details table, safety panel, owner card (rating, trades, badges), "Log in to make an offer", save-for-later, report link
- API: `GET /items/:id`, `GET /items?category&exclude=:id`

### A4 How it works and safety `/how-it-works`
- Components: 4 steps, 6 safe-trading habits, 7 meetup spots, do/don't, barangay coverage, FAQ accordion, help box
- API: `GET /meetup-spots`, `GET /barangays` (content otherwise static)

### A5 Terms and Privacy `/legal`
- Components: sticky table of contents, Terms (6 sections), Privacy (what we collect table, rights, DPO, NPC), version and effective date
- Mobile: collect-table becomes stacked cards
- Notes: DPO email/address are placeholders; needs legal review

---
## B · AUTH (Clerk + onboarding)

### B6 Register `/sign-up` then `/onboarding`
- Step 1 (`components/auth/sign-up-form.tsx`, custom mockup form on headless `useSignUp()` — not Clerk-hosted): full name, email, mobile (+63), barangay (7 options), street/address, password with the mockup strength meter; interactive step tabs; details (never the password) carried to step 2 via `lib/register-draft.ts` (sessionStorage). `signUp.password()` submits the account draft
- Step 2 (`/onboarding`): residency proof upload (JPG/PNG/PDF ≤5 MB to private bucket), consent checkboxes (Terms, Privacy RA 10173, optional email updates), RA 10173 brass notice. "Create my account" → `signUp.update` (consent + metadata) → `verifications.sendEmailCode()` → mockup verify-code dialog → `finalize()`
- Data/Actions: Server Action `completeOnboarding` (zod validation, upload to `residency-docs/{clerkId}/...`, insert `residency_documents`, set profile `pending`)
- States: field errors, loading skeleton panel, danger error panel, success panel, already-onboarded redirect
- Notes: 18+ only; address shown to others only as "Barangay, Cainta"; the mockup's "Step 1 of 2" maps to `/sign-up` then `/onboarding`

### B7 Login `/sign-in`
- Components: custom mockup form `components/auth/sign-in-form.tsx` on headless `useSignIn()` (email + password, show-password toggle, keep-me-signed-in, forgot link → `/recovery`), pending-approval hint, weekly stats panel, safety notes
- States: default / loading / error / code panels plus the two-factor dialog and mobile-login dialog, matching the mockup's `data-panel` variants
- Notes: admins use the same form; after sign-in redirect by profile status/role (`/home`, `/account-status`, `/admin`). Mobile-number sign-in and 2FA are wired but need the strategies enabled on the Clerk instance (Tier 3 / plan check)

### B8 Recovery `/recovery` (custom mockup panels, headless Clerk)
- `components/auth/recovery-flow.tsx`: segmented Forgot / Reset / Email verified panels matching b8-recovery. Forgot → `signIn.create({identifier})` + `resetPasswordEmailCode.sendCode()`; Reset → `submitPassword()` when a live reset session exists, otherwise the mockup's expired-link notice with "Request a fresh link"
- Notes: Clerk does not reveal whether an email exists; the end-to-end reset needs **Email + Password** enabled on the Clerk instance (10 §Clerk)

### B9 Account status `/account-status`
- Variants: Pending approval (submitted time, what we received, 4-step progress, overdue badge after 24 h), Suspended (reason, appeal)
- Data/Actions: read own profile + residency doc status; Server Actions `resendDetails`, `submitAppeal`
- Notes: pending users keep the member navbar in limited mode

---
## C · RESIDENT

### C10 Dashboard `/home`
- Data: counts (active listings, offers to answer, sent, completed trades), pending offers, recent activity, quick actions, listing health, more-in-category items, safety reminder
- API: `GET /me/dashboard`

### C11 Post item `/items/new`
- Sections: Photos (≤8, main photo, drag/drop), What are you offering (name ≤80, description, category, condition, looking-for, trade type: item for item / multiple smaller items), Where (barangay, preferred meetup spot, show mobile toggle)
- Side: live preview, checklist, 30-day expiry note
- Buttons: Publish, Save as draft, Discard
- API: `POST /items`, `POST /items/:id/photos`, `PATCH /items/:id` (draft)
- Rules: cash never allowed; "giving away free" removed

### C12 Edit item `/items/:id/edit`
- Same form, prefilled; status control (Pending set automatically, Available, Paused, Mark exchanged); auto-renew toggle (Tier 2); edit history; pending-offer warning
- API: `PATCH /items/:id`, `DELETE /items/:id`, `PATCH /items/:id/status`

### C13 My listings `/my-listings`
- Data: counts by status; list with photo, name, status, views, offers, expiry
- Tabs: All, Available, Pending, Exchanged, Removed/Expired; search, sort
- Row actions: Edit, Offers, Renew, Remove, Trade record, Rating, Delete
- API: `GET /me/items?status`, `POST /items/:id/renew`
- Mobile: card layout (name, badge, stats) not table

### C14 Item detail (member and owner) `/items/:id`
- Member view: gallery, owner card, Make an offer, Message, Save, report, safe meetup spots, anonymous saved count
- Owner view: Edit, Delete, offers received
- API: `POST /wishlist/:itemId`, `DELETE /wishlist/:itemId`

### C15 Make an offer `/items/:id/offer`
- Components: compact summary of wanted item, pick one of your Available items, optional message (≤500), proposed meetup (place, date, time, flexibility), safety note, how-it-works rail
- Buttons: Send offer, Cancel, Save as draft
- API: `POST /offers`
- Rules: one offer at a time per item; pending items cannot be offered; no "fair trade check"

### C16 Offers `/offers`
- Tabs: Received, Sent, Closed; filters: status, sort
- Cards: both items side by side, status, message, actions (Accept, Reject, Counter-offer [Tier 2], Message, Cancel), expiry (3 days)
- API: `GET /offers?box=received|sent|closed`, `PATCH /offers/:id/accept|reject|cancel`

### C17 Trade progress `/trades/:id`
- Components: 5-step tracker (Offer sent, Accepted, Meetup set, Both confirmed, Completed), traded items, meetup details with Change and Add to calendar, confirm panel (both sides), "It did not happen" dispute, trade history, trader card, meetup checklist
- API: `GET /trades/:id`, `PATCH /trades/:id/meetup`, `POST /trades/:id/confirm`, `POST /trades/:id/dispute`
- Rules: Confirm unlocks at or after meetup time; cannot be undone

### C18 Messages `/messages`, `/messages/:offerId`
- Components: conversation list (search, All/Unread/Active trades), thread header with item context + status, offer card, message bubbles, photo attach, safety banner
- Mobile: two screens (list → thread)
- Data: `conversations`, `messages` via Supabase; **Supabase Realtime** subscription on `messages` filtered by `offer_id` for live updates; send via Server Action

### C19 Notifications `/notifications`
- Tabs: All, Offers, Messages, Reminders, From admin; Today/Yesterday/Earlier groups; Mark all read; quick view side panel
- API: `GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`
- Rules: no "X saved your listing" notices

### C20 Wishlist `/wishlist`
- Components: filter chips (All, Still available, My barangay, Changed), changed-items banner, grid with state notes (Pending, Removed, Exchanged), Make an offer, saved-search alerts (Tier 2), following list (Tier 2)
- Rule: save up to 20 items; owner is never told

### C21 Public profile `/members/:id`
- Components: cover, avatar, name, badges (Verified resident, Admin-reviewed), rating, stats, active listings, ratings and feedback with tag chips, trust checklist, trading history with you, report member, Follow (Tier 2)
- API: `GET /members/:id`, `GET /members/:id/ratings`

### C22 Profile and settings `/settings`
- Sections: Personal info, Photo, Contact visibility, Password and security (Clerk `<UserProfile />` or custom: password, sessions, MFA), Notification preferences (in-app/email/SMS), Privacy and my data (export, delete residency doc, hide profile, last active, usual meetup spot), Delete account / Pause (Tier 2)
- Actions: Server Actions for profile, photo, preferences, export; password/MFA/sessions handled by Clerk; delete account = delete profile data in Supabase then `clerkClient.users.deleteUser`

### C23 Report `/report?type=&id=`
- Steps: what (listing/member/message) → which → reason radio (8 reasons) → description (≤1000) + evidence (≤5 files) → what happens next
- Options: attach chat transcript, anonymous, email outcome
- API: `POST /reports`

---
## D · ADMIN (`/admin/*`, role = moderator or administrator)

### D24 Dashboard `/admin`
- KPIs: users, active listings, completed trades, open reports, categories live; chart (signups vs trades by month); trades per barangay; top categories; recent activity; needs-a-decision list; health checks
- API: `GET /admin/stats?range`

### D25 Users `/admin/users`
- Tabs: Pending, Verified, Suspended, Deleted; filters; table/cards with member, barangay, submitted, proof, status
- Actions: Approve, Reject (reason), Request document, View proof (logged), Suspend, Reinstate, View details (password reset is by the user through Clerk)
- API: `GET /admin/users`, `POST /admin/users/:id/approve|reject|suspend|reinstate`, `GET /admin/users/:id/proof`

### D26 Listings `/admin/listings`
- Tabs: All, Flagged, With pending trades, Removed; stats; table; actions Preview, Flag, Remove (reason), Ask to merge
- Warning: removing a listing with an accepted offer cancels the trade
- API: `GET /admin/listings`, `PATCH /admin/listings/:id/flag|remove`

### D27 Offers and trades `/admin/trades`
- KPIs, pipeline funnel, cancellation reasons, "needing attention" table (stalled, unconfirmed, reported)
- Actions: Open, Nudge (Tier 2), Intervene, View record
- API: `GET /admin/trades`

### D28 Reports and moderation `/admin/reports`
- Queue (oldest first, urgent flag), report detail (reported item, reason, reporter, evidence, owner history, rule in play), decision (Dismiss, Warn, Remove listing, Suspend), moderation note, member history
- API: `GET /admin/reports`, `PATCH /admin/reports/:id/assign`, `POST /admin/reports/:id/decision`

### D29 Categories `/admin/categories`
- Drag reorder, add/edit, enable/disable, subcategories, member-facing preview, prohibited keywords (hold vs flag)
- Rules: delete only when empty; rename updates all listings
- API: `GET/POST/PATCH/DELETE /admin/categories`, `/admin/keywords`

### D30 Activity/audit log `/admin/audit`
- Stats, filters (admin, action type, range, search), table, export CSV, append-only, 24-month retention
- API: `GET /admin/audit`, `GET /admin/audit/export`

### D31 Barangays, announcements, terms `/admin/settings`
- Tabs: Barangays and coverage, Announcements, Terms and privacy editor, Platform settings; suggested meetup spots management
- API: `/admin/barangays`, `/admin/meetup-spots`, `/admin/announcements`, `/admin/legal`

---
## E · SYSTEM

### E32 Error pages
404, 403 (with reference code), 500 (with reference code), maintenance (scheduled), offline. Always show one primary action and a way back to browsing.

### E33 Dialogs, toasts, loading, empty
- Dialogs: delete listing (reason, notify), cancel trade (reason chips, chat note), log out (all devices option)
- Toasts: success, info, error (bottom right, auto-dismiss 4 s)
- Skeletons: card, table, busy buttons
- Empty states: my listings, search no-results, load error
- Interactive states: hover, focus ring, disabled, valid/invalid inputs

### E34 Email templates
Welcome/verify, New offer, Offer accepted, Password reset, Account approved, Account suspended, Listing removed, Report outcome, Meetup reminder (email; SMS optional Tier 3).
Rules: plain-text friendly, 620 px, one primary button, subject names person and action, SPF/DKIM/DMARC.

---
## Screens still to design (from review)
Counter-offer, Change meetup, "It did not happen" dispute, Rate and feedback, Renew confirmation, Trade record, admin approve/reject with reason, residency document viewer, admin user detail, 2FA setup, Pause account, SMS verification, saved-search management, avatar dropdown, email-verified success, empty states for My listings / Offers / Messages / Notifications / Wishlist, remaining 8 email designs.
