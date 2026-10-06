# 01 · Project Overview

## 1. Summary
CaintaTrade lets verified residents of Cainta, Rizal post items they no longer need, browse neighbours' items, propose item-for-item trades, chat, agree a public meetup, and confirm the exchange. Administrators verify residency and moderate content.

**Not included:** payments, delivery, live GPS, automatic valuation, automatic matching, native mobile apps, trades outside Cainta.

## 2. Objectives
1. Registration and login with residency verification.
2. Create, edit, delete, renew listings with photos.
3. Search and filter by keyword, category, condition, barangay, status.
4. Offer flow: send, accept, reject, cancel, confirm completion by both sides.
5. Per-offer chat, in-app notifications, ratings.
6. Admin console: users, listings, trades, reports, categories, audit log, settings.
7. Supabase Postgres database with RLS, Next.js server code and route handlers, responsive Tailwind UI, custom domain.

## 3. Product Rules (single source of truth)
- Item-for-item only. No cash, deposits, delivery fees or "top-ups".
- Residents of the 7 Cainta barangays only: San Andres, San Isidro, San Juan, San Roque, Santa Rosa, Santo Domingo, Santo Nino.
- Age 18+ only.
- Account requires admin approval of one residency proof.
- Free for everyone, no tiers.
- Residency documents live in a private Supabase bucket (admins only, short-lived signed URLs, every view logged) and are deleted 90 days after approval.
- Messages kept 24 months; admin audit log append-only, kept 24 months.

## 4. Roles
| Role | Can do |
|------|--------|
| Guest | Browse, search, view item details, read guides and legal pages |
| Resident (pending) | Browse, view profile/settings, save up to 10 items; no posting/offers/messages |
| Resident (verified) | Everything a guest can, plus post, offer, chat, trade, rate, report, wishlist, follow |
| Moderator | Reports queue, listings, flag/remove, warn |
| Administrator | Moderator rights plus users, categories, barangays, terms, settings, audit log |

## 5. Status Models
- **Account:** Pending approval, Verified, Suspended, Deleted
- **Listing:** Available, Pending (offer accepted), Exchanged, Removed, Expired (plus Paused if kept; see 08)
- **Offer:** Pending, Accepted, Rejected, Cancelled, Completed (Countered if counter-offer is kept)
- **Report:** Open, Assigned, Resolved (upheld/dismissed)

## 6. Technology Stack
| Layer | Tool | Used for |
|-------|------|----------|
| Framework | Next.js (App Router, TypeScript) | Pages, Server Components, Server Actions, Route Handlers |
| Styling | Tailwind CSS (optional shadcn/ui, lucide-react) | Responsive UI, design tokens |
| Auth | Clerk | Sign-up/sign-in, email verification, password reset, sessions, optional MFA, profile UI |
| Database | Supabase Postgres | All app data, Row Level Security, SQL functions for trade state changes |
| Storage | Supabase Storage | Public bucket `listing-photos`; private buckets `residency-docs`, `chat-photos`, `report-evidence` |
| Realtime | Supabase Realtime | Live chat and notifications |
| Validation/forms | zod, react-hook-form | Shared client/server validation |
| App email | Resend + React Email | Offer, trade, approval, report emails (Clerk sends auth emails) |
| Jobs | Vercel Cron to Route Handlers | Expiry, retention purge, reminders |
| Charts / DnD | Recharts, dnd-kit | Admin dashboard, category reorder |

### How Clerk and Supabase fit together
- Clerk owns identity (email, password, verification, sessions). Supabase has **no** password or session tables.
- Clerk is added in Supabase as a **third-party auth provider**; Clerk's native Supabase integration is turned on in the Clerk dashboard.
- Server code gets the Clerk token with `auth().getToken()` and passes it to the Supabase client (`accessToken` option). RLS policies read the user id from `auth.jwt()->>'sub'`.
- Because `accessToken` is set, `supabase.auth.*` calls are not used.
- A Clerk **webhook** (`user.created`, `user.updated`, `user.deleted`) keeps the `profiles` table in sync.
- Two Supabase clients on the server: `supabaseUser()` (Clerk token, RLS applies) and `supabaseAdmin()` (service role, server-only, used after a role check for privileged writes).
- Trade state changes (accept, confirm, cancel) run as Postgres functions (RPC) so they are atomic.

### Auth and onboarding flow
1. `/sign-up` (Clerk): name, email, password; Clerk verifies email.
2. `/onboarding`: barangay, street address, mobile, consent checkboxes, residency proof upload to private bucket. Creates `residency_documents`; profile status = `pending`.
3. `/account-status`: pending or suspended view.
4. Admin approves in `/admin/users`: profile status = `verified`, approval email sent.
5. Verified users unlock posting, offers and messages.

### Suggested folder structure
```
app/
  (public)/        page.tsx, browse/, items/[id]/, how-it-works/, legal/
  (auth)/          sign-in/[[...sign-in]]/, sign-up/[[...sign-up]]/, onboarding/, account-status/
  (member)/        home/, items/new/, items/[id]/edit/, items/[id]/offer/, my-listings/,
                   offers/, trades/[id]/, messages/, notifications/, wishlist/,
                   members/[id]/, settings/, report/
  admin/           page.tsx, users/, listings/, trades/, reports/, categories/, audit/, settings/
  api/             webhooks/clerk/, cron/*, uploads/*, admin/users/[id]/proof/
components/        ui/, items/, offers/, chat/, admin/, layout/
lib/               supabase/{server,admin,browser}.ts, auth/guards.ts, validators/, services/, email/
supabase/          migrations/, seed.sql
middleware.ts      clerkMiddleware, route protection
```

## 7. Feature Tiers
### Tier 1: MVP (must ship)
Register + residency upload, admin approval, login, password reset, email verification, profile/settings, post/edit/delete/renew listing, photo upload, browse/search/filter, item detail, wishlist, make offer, accept/reject/cancel, meetup proposal, both-party completion, per-offer chat, in-app notifications, ratings, report listing/member, admin users/listings/reports/categories/audit, error pages, terms and privacy pages.

### Tier 2: Kept in design, build after MVP
Counter-offer, Follow members, saved-search alerts, auto-renew, listing health/stats, admin trades analytics, offline queue, Pause account, prohibited-keyword auto-hold.

### Tier 3: Needs paid or extra infrastructure
SMS meetup reminders and mobile-number sign-in (Clerk phone/SMS or an SMS provider; per-message cost). Two-factor authentication is available through Clerk; confirm it is included in your Clerk plan before relying on it.

## 8. Screen Inventory (34)
| Group | Screens |
|-------|---------|
| A Public | A1 Landing, A2 Browse, A3 Item detail (guest), A4 How it works and safety, A5 Terms and Privacy |
| B Auth | B6 Register, B7 Login, B8 Recovery, B9 Account status |
| C Resident | C10 Dashboard, C11 Post item, C12 Edit item, C13 My listings, C14 Item detail (member/owner), C15 Make offer, C16 Offers, C17 Trade progress, C18 Messages, C19 Notifications, C20 Wishlist, C21 Public profile, C22 Settings, C23 Report |
| D Admin | D24 Dashboard, D25 Users, D26 Listings, D27 Offers and trades, D28 Reports queue, D29 Categories, D30 Audit log, D31 Barangays, announcements, terms |
| E System | E32 Error pages, E33 Dialogs/toasts/states, E34 Email templates |

## 9. Design Direction (from mockups)
Editorial look: warm paper background, near-black ink, terracotta accent, monospace uppercase labels, status badges that carry colour and a word. Recommendation: raise small text sizes and use sentence case for older users (see 08).
