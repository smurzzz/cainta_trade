# 09 · Test Plan

## Automation status (updated with Phase 3.15)
| Layer | State |
|---|---|
| SQL rules + RLS (`supabase/migrations/999_test_assertions.sql`) | [x] runs on every `db push --include-all`; covers anon/pending/verified/other-user/moderator/admin, trade rules, wishlist limits, append-only audit |
| Unit (vitest) | [x] 73 tests: 7 validator suites, catalog service (fake Supabase), `runCron` secret/dry-run/failure, notify preference gating + template dispatch, 9 email templates render, Clerk webhook (incl. T-A8 bad signature) |
| Playwright (all green) | [x] `npm run test:e2e` → **36 passed, 0 skipped**: `e2e/public-catalog.spec.ts` (7) — live catalog/search/filters/detail/404/view dedupe/sign-in redirect (T-L7, T-A4 area); `e2e/security.spec.ts` (15) — cron 401s on all 6 routes, dry-run with secret, webhook unsigned/tampered → 400 (T-A8); `e2e/auth-and-trade.spec.ts` (14) — T-A1 sign-up (Testing Token captcha bypass + `+clerk_test` OTP 424242) with profile/residency-document rows asserted, T-A10 sign-out → wrong-password error panel → status-based landing, T-A4 route guards, T-A7 approve + T-R4 audit, T-L1/L2/L3/L4/L5 (publish, 9-photo cap, 80-char refusal, 403 edit, renew +30 d), full trade T-O1→T-O4 + T-O6/T-O7 + T-M1 send, T-O5 cancel after accept, T-O8 dispute, T-R1→T-R4 (anonymity, remove-cancels-trade, moderator 403, audit rows) — with teardown sweeps cleaning every test user/profile |
| Realtime messaging (T-M1 live) | [ ] blocked on Supabase third-party auth; message actions themselves are unit-covered |
| §8 usability / accessibility | [ ] manual |

## Test accounts
Tests create and tear down their own Clerk users (`cte2e-*` emails, `E2E …` profiles); the manual accounts below are for exploratory testing.
admin, moderator, resident_verified_A, resident_verified_B, resident_pending, resident_suspended.

## 1. Auth and residency (Clerk + onboarding)
| ID | Case | Expected |
|----|------|----------|
| T-A1 | Sign up, verify email, finish onboarding | Profile pending, row in residency_documents |
| T-A2 | Onboarding with a disabled/outside barangay | Blocked |
| T-A3 | Proof 6 MB or .exe | Rejected |
| T-A4 | Visit /home before onboarding | Redirected to /onboarding |
| T-A5 | Pending user opens /items/new or sends offer | Blocked with explanation (guard and RLS) |
| T-A6 | Admin views proof | Signed URL expires in 60 s; audit row created |
| T-A7 | Approve | Verified, email sent, delete_after = +90 d |
| T-A8 | Clerk webhook with bad signature | 400, no change |
| T-A9 | Delete Clerk user | Profile marked deleted via webhook |
| T-A10 | Sign out, then sign back in with email + password | Wrong password → error panel + attempt counter; correct password → pending `/account-status`, session restored, profile untouched |

## 2. Listings
| T-L1 | Post with 3 photos | Live, expires +30 d |
| T-L2 | Post with 9 photos | Blocked |
| T-L3 | Title over 80 chars | Validation error |
| T-L4 | Edit someone else's listing | 403 |
| T-L5 | Renew | +30 days |
| T-L6 | Expiry job | Status expired, notification sent |
| T-L7 | Search "sofa" + barangay + condition | Correct results, counts match |

## 3. Offers and trades
| T-O1 | Offer own item | Blocked |
| T-O2 | Offer pending item | Blocked |
| T-O3 | Second offer on same wanted item | Blocked |
| T-O4 | Accept | Both items pending, trade created, others rejected |
| T-O5 | Cancel after accept | Items available again, recorded |
| T-O6 | Confirm before meetup time | Rejected server-side |
| T-O7 | Both confirm | Completed, items exchanged, rating prompts |
| T-O8 | Dispute | Trade disputed, admin notified |
| T-O9 | Offer unanswered 3 days | Expired |

## 4. Messaging and notifications
| T-M1 | Send message | Appears live for partner (Realtime) |
| T-M2 | Blocked user messages | Blocked |
| T-M3 | Save item | Owner gets no notification |
| T-M4 | Mark all read | Badge zero |

## 5. Moderation and admin
| T-R1 | Report listing anonymous | Reported member cannot see reporter |
| T-R2 | Remove listing with accepted offer | Trade cancelled, both told |
| T-R3 | Moderator opens audit log | 403 |
| T-R4 | Any admin write | Audit row exists |
| T-R5 | Edit/delete audit row via SQL as app user | Denied |

## 6. Privacy
| T-P1 | Hide mobile | Not returned by API |
| T-P2 | Data export | Contains profile, listings, offers, messages |
| T-P3 | Delete account with open trade | Blocked |
| T-P4 | Residency doc after 90 days | File and row purged |

## 7. Security and RLS
- As anon: cannot read profiles, offers, messages, wishlist, residency_documents, admin_actions.
- As user A: cannot read or update user B's offers, trades, messages, wishlist, notifications.
- As pending user: cannot insert items, offers, messages.
- As moderator: 403 on categories, settings, audit.
- Service role key never present in client bundle.
- IDOR on trade/offer/conversation ids; upload path traversal; XSS in descriptions/messages; webhook and cron secret checks; rate limits on onboarding, reports, messages.
- admin_actions UPDATE/DELETE blocked by trigger.

## 8. Usability and accessibility
- 5 first-time users (include 2 older adults) post an item and make an offer without help.
- Keyboard-only navigation; screen-reader labels; contrast check; 390px and 1440px.

## 9. Acceptance checklist
- [ ] All Tier 1 features work on desktop and mobile
- [ ] No critical or high defects
- [ ] Privacy checklist complete
- [ ] Backup and restore verified
- [ ] Pilot users completed at least 5 real trades
