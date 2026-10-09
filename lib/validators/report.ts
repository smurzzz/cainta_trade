import { z } from 'zod'

export const REPORT_REASONS = [
  'prohibited', 'asking_money', 'scam', 'not_as_described',
  'duplicate', 'harassment', 'moved_outside', 'other',
] as const

export const createReportSchema = z.object({
  targetType: z.enum(['listing', 'member', 'message']),
  targetId: z.string().min(6).max(64),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000, 'Keep the details to 1000 characters.').optional(),
  isAnonymous: z.boolean().default(false),
  attachChat: z.boolean().default(false),
})
export type CreateReportInput = z.infer<typeof createReportSchema>

export const decideReportSchema = z.object({
  reportId: z.string().uuid(),
  decision: z.enum(['dismiss', 'warn', 'remove_listing', 'suspend']),
  moderationNote: z
    .string()
    .trim()
    .min(10, 'A moderation note is required (at least 10 characters).')
    .max(1000),
  suspendDays: z.coerce.number().int().min(1).max(365).optional(),
})
