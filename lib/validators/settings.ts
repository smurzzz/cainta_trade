import { z } from 'zod'

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(400).optional(),
  mobile: z.string().optional(),
  barangayId: z.string().uuid().optional(),
  street: z.string().trim().max(160).optional(),
  // privacy toggles (docs/06 profiles columns)
  showMobile: z.boolean().optional(),
  allowPreOfferMsg: z.boolean().optional(),
  showTradeCount: z.boolean().optional(),
  showBarangay: z.boolean().optional(),
  showLastActive: z.boolean().optional(),
  showUsualMeetup: z.boolean().optional(),
  hideFromSearch: z.boolean().optional(),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export const deleteAccountSchema = z.object({
  confirm: z.string().refine((v) => v.trim().toUpperCase() === 'DELETE', 'Type DELETE to confirm.'),
  reason: z.string().trim().max(500).optional(),
})

export const appealSchema = z.object({
  message: z.string().trim().min(20, 'Tell us a bit more (at least 20 characters).').max(1000),
})
