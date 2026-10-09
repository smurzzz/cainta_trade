import { NextRequest } from 'next/server'
import { runCron } from '@/lib/cron'
import { notifyUser } from '@/lib/notify'
import { adminNoticeEmail } from '@/lib/email/templates'

/** docs/03 3.14 · expire-listings (hourly): past `expires_at` → expired
 *  (auto-renewed listings get +30 days instead), plus one-time reminders at
 *  12 and 3 days before expiry, deduped by items.reminder_{12d,3d}_at (024). */

export const dynamic = 'force-dynamic'

const DAY = 86_400_000
const ACTIVE = ['available', 'pending'] as const

export async function GET(req: NextRequest) {
  return runCron(req, 'expire-listings', async ({ db, dryRun }) => {
    const now = new Date()
    const nowIso = now.toISOString()

    // ── 1) expire (or extend) listings past their deadline ─────────────────
    const { data: past } = await db
      .from('items')
      .select('id, owner_id, title, auto_renew, expires_at')
      .in('status', [...ACTIVE])
      .lt('expires_at', nowIso)
      .limit(1000)

    const rows = past ?? []
    const keep = rows.filter((r) => r.auto_renew)
    const drop = rows.filter((r) => !r.auto_renew)

    if (!dryRun && drop.length) {
      const { error } = await db.from('items').update({ status: 'expired' }).in('id', drop.map((r) => r.id))
      if (error) throw error
    }
    if (!dryRun && keep.length) {
      const extended = new Date(now.getTime() + 30 * DAY).toISOString()
      const { error } = await db
        .from('items')
        .update({ expires_at: extended, reminder_12d_at: null, reminder_3d_at: null })
        .in('id', keep.map((r) => r.id))
      if (error) throw error
    }

    // ── 2) one-time reminders: 12-day window stops where the 3-day begins ──
    const in12 = new Date(now.getTime() + 12 * DAY).toISOString()
    const in3 = new Date(now.getTime() + 3 * DAY).toISOString()

    const { data: remind12Rows } = await db
      .from('items')
      .select('id, owner_id, title, expires_at')
      .in('status', [...ACTIVE])
      .gt('expires_at', nowIso)
      .lte('expires_at', in12)
      .gt('expires_at', in3)
      .is('reminder_12d_at', null)
      .limit(200)

    const { data: remind3Rows } = await db
      .from('items')
      .select('id, owner_id, title, expires_at')
      .in('status', [...ACTIVE])
      .gt('expires_at', nowIso)
      .lte('expires_at', in3)
      .is('reminder_3d_at', null)
      .limit(200)

    const r12 = remind12Rows ?? []
    const r3 = remind3Rows ?? []

    if (!dryRun) {
      const owners = new Set([...r12, ...r3].map((r) => r.owner_id))
      const profiles = owners.size
        ? (
            await db.from('profiles').select('id, email, full_name').in('id', [...owners])
          ).data ?? []
        : []
      const byId = new Map(profiles.map((p) => [p.id, p]))

      for (const [list, days, marker] of [
        [r12, 12, 'reminder_12d_at'],
        [r3, 3, 'reminder_3d_at'],
      ] as const) {
        if (!list.length) continue
        const { error } = await db
          .from('items')
          .update({ [marker]: nowIso })
          .in('id', list.map((r) => r.id))
        if (error) throw error

        for (const item of list) {
          const owner = byId.get(item.owner_id)
          if (!owner) continue
          const when = item.expires_at ? new Date(item.expires_at).toLocaleString('en-PH') : 'soon'
          await notifyUser({
            userId: item.owner_id,
            type: 'listing_expiring',
            title: `Your listing expires in ${days} days`,
            body: `"${item.title}" expires ${when}.`,
            link: `/items/${item.id}`,
            email: owner.email
              ? {
                  to: owner.email,
                  subject: `Your listing expires in ${days} days`,
                  text: `Your listing "${item.title}" expires ${when}.`,
                  template: () =>
                    adminNoticeEmail(
                      `Your listing expires in ${days} days`,
                      `"${item.title}" expires ${when}. Renew it from My listings or let it expire.`,
                    ),
                }
              : undefined,
          })
        }
      }
    }

    return {
      expired: drop.length,
      renewed: keep.length,
      reminded12: r12.length,
      reminded3: r3.length,
      expiredIds: drop.slice(0, 50).map((r) => r.id),
      reminderIds: [...r12, ...r3].slice(0, 50).map((r) => r.id),
    }
  })
}
