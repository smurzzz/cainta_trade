import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** Append an audit row (docs/03 3.4/3.11: every admin write also logs here).
 *  admin_actions is append-only — INSERT only; UPDATE/DELETE raise (009). */
export async function logAdminAction(entry: {
  adminId: string | null // null = system/automatic (cron)
  action: string
  subjectType: string
  subjectId: string
  ruleRef?: string | null
  reason?: string | null
}) {
  const { error } = await supabaseAdmin().from('admin_actions').insert({
    admin_id: entry.adminId,
    action: entry.action,
    subject_type: entry.subjectType,
    subject_id: entry.subjectId,
    rule_ref: entry.ruleRef ?? null,
    reason: entry.reason ?? null,
  })
  if (error) {
    console.error('[audit]', error)
    throw new Error('Failed to write audit log')
  }
}
