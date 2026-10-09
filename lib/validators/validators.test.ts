import { describe, expect, it } from 'vitest'
import { onboardingSchema, normalizeMobile } from './onboarding'
import { createItemSchema, listItemsQuery, flagCashWords } from './item'
import { sendMessageSchema, notificationPrefsSchema } from './message'
import { createOfferSchema, rateTradeSchema, disputeTradeSchema, updateMeetupSchema } from './offer'
import { createReportSchema } from './report'
import { deleteAccountSchema, updateProfileSchema } from './settings'
import { suspendUserSchema, userListQuery, legalDocSchema, keywordSchema } from './admin'

const UUID = '11111111-2222-4333-8444-555555555555'

/* ── onboarding ────────────────────────────────────────────────────────── */

describe('normalizeMobile / onboardingSchema (docs/09 T-A2 area)', () => {
  it('accepts 0-prefix, +63 and spaced typing', () => {
    expect(normalizeMobile('0917 448 2210')).toBe('9174482210')
    expect(normalizeMobile('+63 917 448 2210')).toBe('9174482210')
    expect(normalizeMobile('639174482210')).toBe('9174482210')
    expect(normalizeMobile('9174482210')).toBe('9174482210')
  })

  const valid = {
    fullName: 'Marites Bautista',
    mobile: '0917 448 2210',
    barangayId: UUID,
    street: '123 Sampaguita St',
    consentTerms: true,
    consentPrivacy: true,
  }

  it('accepts a complete payload', () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true)
  })

  it('requires both consents', () => {
    const r = onboardingSchema.safeParse({ ...valid, consentPrivacy: false })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toContain('Data Privacy')
  })

  it('rejects a short or non-local mobile', () => {
    expect(onboardingSchema.safeParse({ ...valid, mobile: '123' }).success).toBe(false)
    expect(onboardingSchema.safeParse({ ...valid, mobile: '5551234' }).success).toBe(false)
  })

  it('rejects a non-uuid barangay (T-A2)', () => {
    const r = onboardingSchema.safeParse({ ...valid, barangayId: 'outside-town' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toContain('barangay')
  })

  it('rejects a name shorter than 2 characters', () => {
    expect(onboardingSchema.safeParse({ ...valid, fullName: 'A' }).success).toBe(false)
  })
})

/* ── listings ──────────────────────────────────────────────────────────── */

describe('createItemSchema / listItemsQuery', () => {
  const valid = {
    title: 'Three-seater sofa',
    categoryId: UUID,
    condition: 'good',
    barangayId: UUID,
  }

  it('applies defaults (draft + item-for-item)', () => {
    const r = createItemSchema.safeParse(valid)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.status).toBe('draft')
      expect(r.data.tradeType).toBe('item_for_item')
    }
  })

  it('enforces the 80-character title (T-L3)', () => {
    const long = 'x'.repeat(81)
    const r = createItemSchema.safeParse({ ...valid, title: long })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toContain('80 characters')
  })

  it('allows an empty meetup spot but not an invalid uuid', () => {
    expect(createItemSchema.safeParse({ ...valid, meetupSpotId: '' }).success).toBe(true)
    expect(createItemSchema.safeParse({ ...valid, meetupSpotId: 'nope' }).success).toBe(false)
  })

  it('rejects an unknown condition', () => {
    expect(createItemSchema.safeParse({ ...valid, condition: 'broken' }).success).toBe(false)
  })

  it('coerces and validates list query params', () => {
    const r = listItemsQuery.safeParse({ page: '3' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toMatchObject({ page: 3, sort: 'newest' })
    expect(listItemsQuery.safeParse({ page: '0' }).success).toBe(false)
    expect(listItemsQuery.safeParse({ sort: 'cheap' }).success).toBe(false)
  })

  it('flags cash words in listing text (docs/03 3.5)', () => {
    expect(flagCashWords('Selling this for 500 pesos, delivery available')).toEqual(
      expect.arrayContaining(['sell', 'peso', 'delivery']),
    )
    expect(flagCashWords('Free to a good home, meet at the barangay hall')).toEqual([])
  })
})

/* ── messaging ─────────────────────────────────────────────────────────── */

describe('sendMessageSchema / notificationPrefsSchema', () => {
  it('requires a body or a photo', () => {
    const r = sendMessageSchema.safeParse({ offerId: UUID })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toContain('Write a message')
    expect(sendMessageSchema.safeParse({ offerId: UUID, hasPhoto: true }).success).toBe(true)
  })

  it('rejects a non-uuid offer (IDOR guard starts here)', () => {
    expect(sendMessageSchema.safeParse({ offerId: 'other-users-offer' }).success).toBe(false)
  })

  it('validates notification preferences shape', () => {
    expect(notificationPrefsSchema.safeParse({ type: 'new_offer', inApp: true, email: false }).success).toBe(true)
    expect(notificationPrefsSchema.safeParse({ type: 'no', inApp: true, email: true }).success).toBe(false)
  })
})

/* ── offers and trades ─────────────────────────────────────────────────── */

describe('offer validators (docs/09 T-O*)', () => {
  it('accepts a minimal offer and caps the message at 500', () => {
    expect(createOfferSchema.safeParse({ wantedItemId: UUID, offeredItemId: UUID }).success).toBe(true)
    const long = createOfferSchema.safeParse({ wantedItemId: UUID, offeredItemId: UUID, message: 'x'.repeat(501) })
    expect(long.success).toBe(false)
    expect(long.error?.issues[0]?.message).toContain('500')
  })

  it('accepts empty optional spot/time sentinels', () => {
    const r = createOfferSchema.safeParse({ wantedItemId: UUID, offeredItemId: UUID, proposedSpotId: '', proposedAt: '' })
    expect(r.success).toBe(true)
  })

  it('requires a meaningful dispute reason (min 10 chars)', () => {
    expect(disputeTradeSchema.safeParse({ tradeId: UUID, reason: 'rude' }).success).toBe(false)
    expect(disputeTradeSchema.safeParse({ tradeId: UUID, reason: 'They never showed up at the meetup' }).success).toBe(true)
  })

  it('coerces stars and clamps to 1–5', () => {
    expect(rateTradeSchema.safeParse({ tradeId: UUID, stars: '5' }).success).toBe(true)
    expect(rateTradeSchema.safeParse({ tradeId: UUID, stars: 0 }).success).toBe(false)
    expect(rateTradeSchema.safeParse({ tradeId: UUID, stars: 6 }).success).toBe(false)
  })

  it('requires spot + time for meetup updates', () => {
    expect(updateMeetupSchema.safeParse({ tradeId: UUID, spotId: UUID, at: '' }).success).toBe(false)
    expect(updateMeetupSchema.safeParse({ tradeId: UUID, spotId: 'x', at: '2026-10-10T10:00' }).success).toBe(false)
  })
})

/* ── reports ───────────────────────────────────────────────────────────── */

describe('createReportSchema', () => {
  const base = { targetType: 'listing', targetId: UUID, reason: 'prohibited' }

  it('accepts a listing report with defaults', () => {
    const r = createReportSchema.safeParse(base)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.isAnonymous).toBe(false)
  })

  it('rejects unknown reasons and bad targets', () => {
    expect(createReportSchema.safeParse({ ...base, reason: 'vibes' }).success).toBe(false)
    expect(createReportSchema.safeParse({ ...base, targetId: 'x' }).success).toBe(false)
    expect(createReportSchema.safeParse({ ...base, targetType: 'admin' }).success).toBe(false)
  })

  it('caps details at 1000 characters', () => {
    expect(createReportSchema.safeParse({ ...base, details: 'x'.repeat(1001) }).success).toBe(false)
  })
})

/* ── settings ──────────────────────────────────────────────────────────── */

describe('settings validators (docs/09 T-P3)', () => {
  it('requires the literal DELETE confirmation', () => {
    expect(deleteAccountSchema.safeParse({ confirm: 'delete' }).success).toBe(true)
    expect(deleteAccountSchema.safeParse({ confirm: 'yes' }).success).toBe(false)
    expect(deleteAccountSchema.safeParse({ confirm: 'delete me' }).success).toBe(false)
  })

  it('bounds the bio and optional privacy toggles', () => {
    expect(updateProfileSchema.safeParse({ bio: 'x'.repeat(401) }).success).toBe(false)
    expect(updateProfileSchema.safeParse({ showMobile: false, hideFromSearch: true }).success).toBe(true)
    expect(updateProfileSchema.safeParse({ barangayId: 'nope' }).success).toBe(false)
  })
})

/* ── admin ─────────────────────────────────────────────────────────────── */

describe('admin validators', () => {
  it('requires a 10+ character suspension reason and defaults to 30 days', () => {
    const bad = suspendUserSchema.safeParse({ userId: 'user_123', reason: 'no-show' })
    expect(bad.success).toBe(false)
    expect(bad.error?.issues[0]?.message).toContain('10 characters')
    const good = suspendUserSchema.safeParse({ userId: 'user_123', reason: 'Repeated no-shows at meetups' })
    expect(good.success).toBe(true)
    if (good.success) expect(good.data.days).toBe(30)
    expect(suspendUserSchema.safeParse({ userId: 'user_123', reason: 'Repeated no-shows at meetups', days: 0 }).success).toBe(false)
  })

  it('coerces the user-list page and defaults it to 1', () => {
    const r = userListQuery.safeParse({ page: '2' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.page).toBe(2)
    expect(userListQuery.safeParse({ status: 'wat' }).success).toBe(false)
  })

  it('requires a substantive legal document body', () => {
    expect(legalDocSchema.safeParse({ type: 'terms', version: '1', effectiveDate: '2026-10-01', body: 'short' }).success).toBe(false)
    expect(
      legalDocSchema.safeParse({ type: 'terms', version: '1.0', effectiveDate: '2026-10-01', body: 'x'.repeat(40) }).success,
    ).toBe(true)
    expect(legalDocSchema.safeParse({ type: 'policy', version: '1', effectiveDate: '2026-10-01', body: 'x'.repeat(40) }).success).toBe(false)
  })

  it('validates keyword hold/flag actions', () => {
    expect(keywordSchema.safeParse({ word: 'gcash', action: 'hold' }).success).toBe(true)
    expect(keywordSchema.safeParse({ word: 'gcash', action: 'delete' }).success).toBe(false)
  })
})
