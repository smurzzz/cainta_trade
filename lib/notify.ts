import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import type { BuiltMail } from '@/lib/email/templates'

/** Notification types shared with notification_preferences and the UI. */
export const NOTIFY_TYPES = [
  'new_offer',
  'offer_accepted',
  'offer_rejected',
  'offer_cancelled',
  'meetup_updated',
  'trade_completed',
  'account_approved',
  'account_rejected',
  'account_suspended',
  'listing_removed',
  'listing_expiring',
  'report_outcome',
  'message_received',
  'trade_disputed',
  'admin_notice',
] as const
export type NotifyType = (typeof NOTIFY_TYPES)[number]

async function pref(userId: string, type: string) {
  const { data } = await supabaseAdmin()
    .from('notification_preferences')
    .select('in_app, email')
    .eq('user_id', userId)
    .eq('type', type)
    .maybeSingle()
  return { inApp: data?.in_app ?? true, email: data?.email ?? true }
}

/** Create an in-app notification (SQL functions do their own via notify_in_app;
 *  use this from server code paths that do not run inside an RPC). */
export async function createNotification(n: {
  userId: string
  type: NotifyType
  title: string
  body?: string
  link?: string
}) {
  const p = await pref(n.userId, n.type)
  if (!p.inApp) return
  const { error } = await supabaseAdmin().from('notifications').insert({
    user_id: n.userId,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
  })
  if (error) console.error('[notify]', error)
}

/** Dispatch an email only when the preference allows (docs/03 3.13).
 *  Pass a React Email `template` to send branded HTML with a text fallback. */
export async function emailIfAllowed(n: {
  userId: string
  type: NotifyType
  to: string
  subject: string
  text: string
  html?: string
  template?: () => Promise<BuiltMail>
}) {
  if (!n.to) return
  const p = await pref(n.userId, n.type)
  if (!p.email) return
  if (n.template) {
    const mail = await n.template()
    await sendEmail({ to: n.to, subject: mail.subject, text: mail.text, html: mail.html })
    return
  }
  await sendEmail({ to: n.to, subject: n.subject, text: n.text, html: n.html })
}

/** Convenience: in-app + email in one call. */
export async function notifyUser(n: {
  userId: string
  type: NotifyType
  title: string
  body?: string
  link?: string
  email?: { to: string; subject: string; text: string; html?: string; template?: () => Promise<BuiltMail> }
}) {
  await createNotification(n)
  if (n.email) await emailIfAllowed({ userId: n.userId, type: n.type, ...n.email })
}
