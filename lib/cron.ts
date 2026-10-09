import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'

/** docs/03 3.14: every /api/cron/* route is guarded by CRON_SECRET
 *  (Vercel sends `Authorization: Bearer $CRON_SECRET`), accepts `?dryRun=1`,
 *  and logs each run to admin_actions with admin_id = null ("automatic").
 *
 *  Usage:
 *    export async function GET(req: NextRequest) {
 *      return runCron(req, 'expire-listings', async ({ db, dryRun }) => {
 *        ... return { expired: 3, ids: [...] }
 *      })
 *    }
 */

export type CronContext = {
  db: ReturnType<typeof supabaseAdmin>
  dryRun: boolean
}

export type CronReport = Record<string, unknown>

/** Constant-time secret comparison (docs/11: cron endpoints must reject a
 *  missing or wrong bearer token). */
function secretMatches(provided: string, expected: string) {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function runCron(
  req: NextRequest,
  job: string,
  fn: (ctx: CronContext) => Promise<CronReport>,
) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET is not configured.' },
      { status: 503 },
    )
  }
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!secretMatches(given, secret)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get('dryRun')
  const dryRun = q === '1' || q === 'true'
  const db = supabaseAdmin()

  try {
    const report = await fn({ db, dryRun })
    // Audit every run as automatic (admin_id null), with a bounded summary so
    // dry runs and live runs are both reviewable in the audit log.
    await logAdminAction({
      adminId: null,
      action: `cron_${job}`,
      subjectType: 'cron',
      subjectId: job,
      reason: `${dryRun ? 'dry-run' : 'live'} ${JSON.stringify(report).slice(0, 800)}`,
    })
    return NextResponse.json({ ok: true, job, dryRun, report })
  } catch (e) {
    console.error(`[cron ${job}]`, e)
    const message = e instanceof Error ? e.message : 'Job failed.'
    return NextResponse.json({ ok: false, job, error: message }, { status: 500 })
  }
}
