import { z } from 'zod'
import { REPORT_REASONS } from './report'

export const userListQuery = z.object({
  status: z.enum(['pending', 'verified', 'suspended', 'deleted']).optional(),
  barangay: z.string().uuid().optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
})

export const approveUserSchema = z.object({ userId: z.string().min(3).max(64) })

export const rejectUserSchema = z.object({
  userId: z.string().min(3).max(64),
  reason: z.string().trim().min(10, 'Give a reason of at least 10 characters.').max(500),
})

export const suspendUserSchema = z.object({
  userId: z.string().min(3).max(64),
  reason: z.string().trim().min(10, 'Give a reason of at least 10 characters.').max(500),
  days: z.coerce.number().int().min(1).max(365).default(30),
})

export const reinstateUserSchema = z.object({ userId: z.string().min(3).max(64) })

export const requestDocumentSchema = z.object({
  userId: z.string().min(3).max(64),
  note: z.string().trim().max(300).optional(),
})

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(60),
  parentId: z.string().uuid().optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isEnabled: z.boolean().default(true),
})

export const keywordSchema = z.object({
  id: z.string().uuid().optional(),
  word: z.string().trim().min(2).max(60),
  action: z.enum(['hold', 'flag']),
  isEnabled: z.boolean().default(true),
})

export const announcementSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(2000),
  isEnabled: z.boolean().default(true),
  startsAt: z.string().optional().or(z.literal('')),
  endsAt: z.string().optional().or(z.literal('')),
})

export const legalDocSchema = z.object({
  type: z.enum(['terms', 'privacy']),
  version: z.string().trim().min(1).max(20),
  effectiveDate: z.string().min(4),
  body: z.string().trim().min(20),
})

export const barangaySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional(),
  isEnabled: z.boolean().default(true),
})

export const meetupSpotSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  barangayId: z.string().uuid(),
  flag: z.string().trim().max(60).optional(),
  isEnabled: z.boolean().default(true),
})

export const adminReportQuery = z.object({
  status: z.enum(['open', 'assigned', 'upheld', 'dismissed']).optional(),
  reason: z.enum(REPORT_REASONS).optional(),
  urgentOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
})
