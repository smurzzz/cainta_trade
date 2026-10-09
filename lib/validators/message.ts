import { z } from 'zod'

export const sendMessageSchema = z
  .object({
    offerId: z.string().uuid(),
    body: z.string().trim().max(2000).optional(),
    hasPhoto: z.boolean().default(false),
  })
  .refine((v) => Boolean(v.body) || v.hasPhoto, 'Write a message or attach a photo.')
export type SendMessageInput = z.infer<typeof sendMessageSchema>

export const markReadSchema = z.object({ offerId: z.string().uuid() })

export const notificationPrefsSchema = z.object({
  type: z.string().min(3).max(40),
  inApp: z.boolean(),
  email: z.boolean(),
})
