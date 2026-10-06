# 07 · Server Actions and Route Handlers

Use **Server Actions** for form mutations (zod-validated, with `requireVerified()` / `requireRole()`), **Server Components** for reads, and **Route Handlers** (`/api/...`) for webhooks, cron, file streaming and anything fetched from the client.
Access: **G** guest · **P** pending · **V** verified · **M** moderator · **A** admin.
Authentication, password reset, email verification, sessions and MFA are handled by **Clerk** (no custom auth endpoints).

## Webhooks and system (Route Handlers)
| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | /api/webhooks/clerk | Svix signature | sync `profiles` on user.created/updated/deleted |
| GET | /api/cron/expire-listings, expire-offers, purge-residency, purge-old, meetup-reminders, overdue-approvals | `CRON_SECRET` | scheduled jobs |
| GET | /api/admin/users/[id]/proof | M,A | creates signed URL (60 s) and writes `document_viewed` audit row |

## Onboarding and account
| Action | Access | Purpose |
|---|---|---|
| completeOnboarding | signed-in | mobile, barangay, address, consent, residency upload |
| resendDetails, submitAppeal | P | |
| updateProfile, uploadPhoto | P+ | personal info, privacy toggles |
| updatePreferences | P+ | notification preferences |
| requestDataExport | V | export profile, listings, offers, messages |
| deleteResidencyDocument | V | delete proof now |
| deleteAccount | V | blocked if open trades; then Clerk user delete |
| getDashboard | V | counts, pending offers, activity |

## Catalog (read)
categories, barangays, meetup spots, public stats: Server Component queries (anon or user client).

## Items
| Action / Route | Access | Purpose |
|---|---|---|
| listItems (query params q, category, condition, barangay, status, sort, page) | G | full-text search + filters |
| getItem | G | detail, owner mini-profile, nearby spots, same-category items |
| createItem | V | draft or publish |
| uploadItemPhotos (`POST /api/uploads/item-photos`) | V owner | up to 8, size/type check |
| deleteItemPhoto | V owner | |
| updateItem | V owner | locked status while pending offer |
| setItemStatus | V owner | available, paused, exchanged |
| renewItem | V owner | +30 days |
| removeItem | V owner | reason |
| incrementViews | G | once per session |

## Wishlist
saveItem (limit 10 pending / 20 verified), unsaveItem, listWishlist.

## Offers and Trades (call SQL functions)
| Action | Access | Purpose |
|---|---|---|
| createOffer | V | one active offer per wanted item |
| acceptOffer, rejectOffer, cancelOffer | V | parties only |
| counterOffer | V | Tier 2 |
| updateMeetup | V party | |
| confirmTrade | V party | rejected before `meetup_at` |
| disputeTrade | V party | |
| rateTrade | V party | once per trade |
| listOffers (received, sent, closed), getTrade | V party | |

## Messages and Notifications
| Item | Access | Purpose |
|---|---|---|
| listConversations, getMessages | V party | initial load |
| sendMessage (text, optional photo) | V party | blocked users rejected |
| markRead | V | |
| Realtime channels | V | `messages` filtered by `offer_id`; `notifications` filtered by `user_id` |
| listNotifications, markNotificationRead, markAllRead | P+ | |

## Members and Reports
getMember, listMemberRatings, blockMember, createReport (evidence upload), follow/unfollow (Tier 2).

## Admin (role M or A; A-only marked)
| Action | Purpose |
|---|---|
| getAdminStats | KPIs and charts |
| listUsers, getUser | by status |
| approveUser, rejectUser (reason), requestDocument | sets profile status, sends email, audit row |
| suspendUser, reinstateUser | reason, duration |
| listAdminListings, flagListing, removeListing | removal cancels accepted trade |
| listAdminTrades | stalled, unconfirmed |
| listReports, assignReport, decideReport | dismiss, warn, remove, suspend + note |
| CRUD categories (A), keywords (A), barangays (A), meetup spots (A), announcements (A), legal documents (A) | |
| listAudit, exportAuditCsv (A) | read-only |

## Cross-cutting rules
- Every admin write also inserts into `admin_actions`.
- Pending users cannot call post/offer/message actions (guard + RLS).
- zod validation on every action; parameterised queries only (Supabase client / RPC).
- Never expose `supabaseAdmin` or the service role key to the browser.
- Upload checks: type sniffing, size limit, random file names, per-user folder.
- Rate limiting (e.g. Upstash or middleware) on onboarding, reports and messages.
