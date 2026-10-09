import { NextRequest } from 'next/server'
import { runCron } from '@/lib/cron'
import { createNotification } from '@/lib/notify'
import { logAdminAction } from '@/lib/audit'

/** docs/03 3.14 · overdue-approvals (hourly): profiles still `pending` more
 *  than 24 hours after onboarding are flagged once per day — an automatic
 *  audit row plus an in-app notice to every moderator/admin. */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return runCron(req, 'overdue-approvals', async ({ db, dryRun }) => {
    const now = new Date()
    const cutoff = new Date(now.getTime() - 86_400_000).toISOString()

    const { data: rows } = await db
      .from('profiles')
      .select('id, full_name, created_at, onboarded_at')
      .eq('status', 'pending')
      .is('deleted_at', null)
      .limit(500)

    // A profile is overdue 24 h after it was onboarded (or created, if the
    // onboarding form was never submitted).
    const overdue = (rows ?? []).filter(
      (r) => new Date(r.onboarded_at ?? r.created_at).getTime() < now.getTime() - 86_400_000,
    )
    if (!overdue.length) return { pending: (rows ?? []).length, flagged: 0, ids: [] }

    // dedupe: one flag per profile per 24 h (previous run already logged it)
    const { data: recent } = await db
      .from('admin_actions')
      .select('subject_id')
      .eq('action', 'cron_overdue_approval')
      .gte('created_at', cutoff)
      .limit(500)
    const already = new Set((recent ?? []).map((r) => r.subject_id))
    const todo = overdue.filter((r) => !already.has(r.id))

    if (dryRun) {
      return { pending: (rows ?? []).length, wouldFlag: todo.length, ids: todo.slice(0, 50).map((r) => r.id) }
    }
    if (!todo.length) return { pending: (rows ?? []).length, flagged: 0, ids: [] }

    const { data: staff } = await db
      .from('profiles')
      .select('id')
      .in('role', ['moderator', 'admin'])
    const staffIds = (staff ?? []).map((s) => s.id)

    for (const p of todo) {
      await logAdminAction({
        adminId: null,
        action: 'cron_overdue_approval',
        subjectType: 'profile',
        subjectId: p.id,
        reason: 'Pending approval older than 24 hours',
      })
      for (const staffId of staffIds) {
        await createNotification({
          userId: staffId,
          type: 'admin_notice',
          title: 'Approval overdue',
          body: `${p.full_name ?? 'A resident'} has been waiting over 24 hours for residency review.`,
          link: '/admin',
        })
      }
    }

    return { pending: (rows ?? []).length, flagged: todo.length, staffNotified: staffIds.length, ids: todo.slice(0, 50).map((r) => r.id) }
  })
}
