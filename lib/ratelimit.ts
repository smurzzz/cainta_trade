import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const LIMITS = {
  onboarding: { limit: 5, windowMs: 15 * 60_000 },
  offers: { limit: 20, windowMs: 10 * 60_000 },
  messages: { limit: 60, windowMs: 10 * 60_000 },
  reports: { limit: 5, windowMs: 60 * 60_000 },
  uploads: { limit: 40, windowMs: 10 * 60_000 },
  auth: { limit: 10, windowMs: 15 * 60_000 },
} as const

export type LimitName = keyof typeof LIMITS

/** Fixed-window limiter backed by Postgres (survives serverless cold starts).
 *  Throws ActionError RATE when the caller is over the limit. */
export async function rateLimit(name: LimitName, subject: string) {
  const { limit, windowMs } = LIMITS[name]
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs)
  const { data, error } = await supabaseAdmin().rpc('rate_limit_take', {
    p_key: `${name}:${subject}`,
    p_window: windowStart.toISOString(),
    p_limit: limit,
  })
  if (error) {
    if (error.message.includes('RATE_LIMITED')) {
      const { ActionError, REF } = await import('@/lib/errors')
      throw new ActionError(REF.RATE, 'Too many attempts — please wait a few minutes and try again.')
    }
    console.error('[ratelimit]', error) // fail open: bookkeeping must not block users
    return
  }
  return data as number
}
