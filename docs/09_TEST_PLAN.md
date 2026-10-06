# 09 · Test Plan

## Test accounts
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
