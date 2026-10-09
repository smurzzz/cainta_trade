import { z } from 'zod'

export const CONDITIONS = ['like_new', 'good', 'fair', 'for_repair'] as const
export const TRADE_TYPES = ['item_for_item', 'multiple_smaller'] as const

export const createItemSchema = z.object({
  title: z.string().trim().min(3, 'Give the listing a short title.').max(80, 'Keep the title to 80 characters.'),
  description: z.string().trim().max(2000).optional(),
  categoryId: z.string().uuid('Choose a category.'),
  condition: z.enum(CONDITIONS, {}),
  lookingFor: z.string().trim().max(160).optional(),
  tradeType: z.enum(TRADE_TYPES, {}).default('item_for_item'),
  barangayId: z.string().uuid('Choose your barangay.'),
  meetupSpotId: z.string().uuid().optional().or(z.literal('')),
  status: z.enum(['draft', 'available']).default('draft'),
})
export type CreateItemInput = z.infer<typeof createItemSchema>

export const updateItemSchema = createItemSchema.partial().extend({
  id: z.string().uuid(),
})
export type UpdateItemInput = z.infer<typeof updateItemSchema>

/** docs/07 listItems query params. */
export const listItemsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().uuid().optional(),
  condition: z.enum(CONDITIONS).optional(),
  barangay: z.string().uuid().optional(),
  status: z.enum(['available', 'pending', 'exchanged']).optional(),
  sort: z.enum(['newest', 'nearest', 'updated', 'relevant']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
})
export type ListItemsQuery = z.infer<typeof listItemsQuery>

export const ITEM_STATUS_ACTIONS = ['pause', 'resume', 'mark_exchanged', 'renew', 'remove'] as const

/** Cash words the listing rules flag (docs/03 3.5). */
export const CASH_WORDS = [
  'for sale', 'sell', 'php', 'peso', 'price', 'cash', 'gcash', 'maya', 'delivery', 'shipping', 'padala',
]
export function flagCashWords(text: string) {
  const t = text.toLowerCase()
  return CASH_WORDS.filter((w) => t.includes(w))
}
