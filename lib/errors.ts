/** Typed action errors with reference codes (docs/03 3.2, docs/07 cross-cutting).
 *  Never leak internals: actions throw ActionError; unknown errors collapse to
 *  a generic message + server log. */

export const REF = {
  AUTH: 'CT-AUTH-401',
  ONBOARD: 'CT-ONB-402',
  LISTING: 'CT-LST-403',
  OFFER: 'CT-OFR-404',
  MESSAGE: 'CT-MSG-405',
  REPORT: 'CT-RPT-406',
  ADMIN: 'CT-ADM-407',
  SETTINGS: 'CT-SET-408',
  RATE: 'CT-RATE-409',
  SERVER: 'CT-SYS-500',
} as const

export class ActionError extends Error {
  code: string
  fields?: Record<string, string>
  constructor(code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ActionError'
    this.code = code
    this.fields = fields
  }
}

/** Friendly copy for the SQL guards raised by supabase/migrations/013*. */
const DB_COPY: Record<string, string> = {
  NOT_SIGNED_IN: 'Please sign in first.',
  NOT_VERIFIED: 'Your account is still pending approval — this opens once an administrator approves you.',
  SAME_ITEM: 'You cannot offer an item for itself.',
  ITEM_NOT_FOUND: 'That listing no longer exists.',
  NOT_YOUR_ITEM: 'You can only offer items you own.',
  ITEM_NOT_AVAILABLE: 'That item is no longer available.',
  OWN_WANTED_ITEM: 'You already own the item you are asking for.',
  WANTED_NOT_AVAILABLE: 'The item you want is no longer available.',
  OFFER_EXISTS: 'Someone already has an active offer on that item.',
  ITEM_ALREADY_RESERVED: 'That item was just reserved by another accepted offer.',
  OFFER_NOT_FOUND: 'That offer no longer exists.',
  NOT_ALLOWED: 'You are not part of this trade.',
  OFFER_NOT_PENDING: 'That offer is no longer pending.',
  OFFER_EXPIRED: 'That offer expired — send a fresh one.',
  OFFER_NOT_CANCELLABLE: 'That offer can no longer be cancelled.',
  TRADE_NOT_FOUND: 'That trade no longer exists.',
  TRADE_NOT_OPEN: 'That trade is no longer open for changes.',
  MEETUP_NOT_SET: 'Agree on a meetup place and time first.',
  MEETUP_NOT_DUE: 'You can confirm the meetup only at or after the agreed time.',
  ALREADY_CONFIRMED: 'You have already confirmed this meetup.',
  NOT_RENEWABLE: 'This listing cannot be renewed right now.',
  WISHLIST_LIMIT: 'Your wishlist is full — remove something first.',
  OWN_ITEM: 'That item is already yours.',
  TRADE_NOT_COMPLETED: 'Ratings unlock after both sides confirm the meetup.',
  ALREADY_RATED: 'You already rated this trade.',
  INVALID_STARS: 'Choose between 1 and 5 stars.',
}

/** Map a PostgREST / RPC error to an ActionError with safe copy. */
export function mapDbError(
  err: { message?: string; code?: string } | null | undefined,
  fallback = 'Something went wrong. Please try again.',
  ref: string = REF.SERVER,
): ActionError {
  const msg = err?.message ?? ''
  for (const [key, copy] of Object.entries(DB_COPY)) {
    if (msg.includes(key)) return new ActionError(ref, copy)
  }
  if (err?.code === '23505') return new ActionError(ref, 'That already exists.', undefined)
  if (err?.code === '23503') return new ActionError(ref, 'A related record is missing.', undefined)
  if (err?.code === '23514') return new ActionError(ref, 'One of the values is not allowed.', undefined)
  console.error('[db]', err)
  return new ActionError(ref, fallback)
}

/** Wrap any thrown value for use at the action boundary. */
export function toActionError(e: unknown, ref: string = REF.SERVER): ActionError {
  if (e instanceof ActionError) return e
  if (e instanceof Error) {
    const mapped = mapDbError({ message: e.message }, undefined, ref)
    // mapDbError logs unknown messages; keep the original message only if it
    // matched a known guard, otherwise genericise.
    if (mapped.message !== 'Something went wrong. Please try again.') return mapped
    console.error('[action]', e)
    return new ActionError(ref, 'Something went wrong. Please try again.')
  }
  console.error('[action]', e)
  return new ActionError(ref, 'Something went wrong. Please try again.')
}
