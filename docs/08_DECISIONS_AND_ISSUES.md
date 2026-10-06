# 08 · Decisions, Issues, Compliance

## 1. Decisions
### Resolved by the stack
| Topic | Decision |
|---|---|
| Framework / UI | Next.js App Router + Tailwind CSS |
| Auth | Clerk (email verification, password reset, sessions) |
| Database / storage / realtime | Supabase Postgres, Storage, Realtime |
| Chat delivery | Supabase Realtime (no polling) |
| Residency docs | Private bucket + signed URL + audit |
| App email | Resend (Clerk sends auth emails) |
| Jobs | Vercel Cron route handlers |

### Still open
| # | Decision | Recommendation |
|---|----------|----------------|
| 1 | Keep "Paused" listing status? | Yes, add to status list and filters |
| 2 | Counter-offer in MVP? | No, Tier 2 |
| 3 | SMS and MFA? | Tier 3; check Clerk plan and SMS cost first |
| 4 | Pending user permissions | Browse, settings, wishlist (10) only |
| 5 | Admin roles | Resident, Moderator, Administrator; store in `profiles.role` |
| 6 | Mobile admin | Desktop-first; cards on mobile if required |
| 7 | Proposal update | Add verification, offers, chat, ratings, moderation to scope |
| 8 | Free-tier limits | Check Clerk, Supabase, Resend and Vercel plan limits against expected users |
| 9 | Mockup "Step 1 of 2" register | Map to Clerk sign-up then onboarding |
| 10 | Clerk-hosted screens | Style Clerk components with Tailwind appearance to match mockups |

## 2. Out-of-scope conflicts found in mockups
- "Fair trade check" (valuation): remove
- "Recommended based on wishlist" / "Find similar": replaced by "More in this category" (verify)
- "Alert me on price changes": remove (no prices)
- Proposal says identity verification is out of scope, but residency review exists: **update the proposal**

## 3. Design contradictions to confirm fixed
- Same trade shows same state on every screen
- Confirm exchange locked until meetup time
- Edit item shows Pending when offer accepted
- Counts consistent (active listings, categories, users shown)
- Weekdays correct (4 Oct 2026 = Sunday; 12 Oct 2026 = Monday)
- Marites shown as Verified in admin
- Reports against Nestor consistent on form, queue, history
- Report queue ID year "RP-2026" (mobile shows "RP-2028")
- Public profile shows rating names consistently
- Owner "member since" vs "yrs" mismatch on guest item detail
- Cash/gcash keywords: flag only, not auto-hold

## 4. Layout bugs outstanding (mobile)
My listings cards lack name/status; terms table squeezed; messages should be list then thread; notifications buttons beside text; register step tabs cut off; bottom tab bar covers content; blank image boxes; admin tables blank/cut; profile name overlaps cover; settings notification table squeezed.

## 5. Privacy and legal checklist (RA 10173)
- [ ] Government ID treated as sensitive: encryption at rest, restricted access, audit trail
- [ ] Consent block on register: who sees proof, retention, deletion
- [ ] Retention enforced (90 days) and UI shows "Deleted" after
- [ ] 18+ only everywhere (no guardian wording)
- [ ] DPO email and address real before launch
- [ ] Check National Privacy Commission registration requirement
- [ ] Data subject rights: access, correction, erasure, portability, complaint
- [ ] Legal review of Terms and Privacy
- [ ] Non-affiliation notice with LGU, malls, police
- [ ] Meetup place names: add disclaimer or get permission
- [ ] Real user photos in production (no stock images)
- [ ] Wishlist saves are private; no "X saved your listing"

## 6. Accessibility notes
Raise small uppercase monospace labels, use sentence case, AA contrast, 16px body, 44px targets, status uses colour plus text.

## 7. Open design deliverables
See "Missing designs" in `05_PROGRESS_TRACKER.md`.
