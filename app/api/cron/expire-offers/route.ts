import { NextRequest } from 'next/server'
import { runCron } from '@/lib/cron'

/** docs/03 3.14 · expire-offers (hourly): pending offers past `expires_at`
 *  (created + 3 days, set by the accept/offer path) become expired. */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return runCron(req, 'expire-offers', async ({ db, dryRun }) => {
    const nowIso = new Date().toISOString()

    const { data: past } = await db
      .from('offers')
      .select('id')
      .eq('status', 'pending')
      .lt('expires_at', nowIso)
      .limit(5000)

    const ids = (past ?? []).map((r) => r.id)
    if (dryRun) return { wouldExpire: ids.length, ids: ids.slice(0, 50) }
    if (!ids.length) return { expired: 0, ids: [] }

    const { error } = await db.from('offers').update({ status: 'expired' }).in('id', ids)
    if (error) throw error
    return { expired: ids.length, ids: ids.slice(0, 50) }
  })
}
