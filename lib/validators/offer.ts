import { z } from 'zod'

export const createOfferSchema = z.object({
  wantedItemId: z.string().uuid(),
  offeredItemId: z.string().uuid(),
  message: z.string().trim().max(500, 'Keep the message to 500 characters.').optional(),
  proposedSpotId: z.string().uuid().optional().or(z.literal('')),
  proposedAt: z.string().datetime({}).optional().or(z.literal('')),
  flexibility: z.string().trim().max(120).optional(),
})
export type CreateOfferInput = z.infer<typeof createOfferSchema>

export const respondOfferSchema = z.object({
  offerId: z.string().uuid(),
  reason: z.string().trim().max(300).optional(),
})

export const updateMeetupSchema = z.object({
  tradeId: z.string().uuid(),
  spotId: z.string().uuid('Choose a meetup spot.'),
  at: z.string().min(1, 'Pick a date and time.'),
  note: z.string().trim().max(300).optional(),
})

export const confirmTradeSchema = z.object({ tradeId: z.string().uuid() })
export const disputeTradeSchema = z.object({
  tradeId: z.string().uuid(),
  reason: z.string().trim().min(10, 'Tell us what happened (at least 10 characters).').max(500),
})

export const rateTradeSchema = z.object({
  tradeId: z.string().uuid(),
  stars: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
  tags: z.array(z.string().max(30)).max(5).optional(),
  described: z.coerce.number().int().min(1).max(5).optional(),
  communication: z.coerce.number().int().min(1).max(5).optional(),
  onTime: z.coerce.number().int().min(1).max(5).optional(),
  friendly: z.coerce.number().int().min(1).max(5).optional(),
})
