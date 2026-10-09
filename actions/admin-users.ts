'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import {
  userListQuery,
  approveUserSchema,
  rejectUserSchema,
  suspendUserSchema,
  reinstateUserSchema,
  requestDocumentSchema,
} from '@/lib/validators/admin'
import { logAdminAction } from '@/lib/audit'
import { notifyUser, emailIfAllowed } from '@/lib/notify'
import { accountApprovedEmail, accountSuspendedEmail, adminNoticeEmail } from '@/lib/email/templates'
import { REF, toActionError } from '@/lib/errors'
import type { ActionResult } from '@/actions/onboarding'
import type { BuiltMail } from '@/lib/email/templates'

const PAGE = 20

async function sendSafe(userId: string, to: string, subject: string, text: string, type: 'account_approved' | 'account_rejected' | 'account_suspended' | 'admin_notice' = 'admin_notice', template?: () => Promise<BuiltMail>) {
  await emailIfAllowed({ userId, type, to, subject, text, template })
}

/** docs/03 3.4 listUsers: status / barangay / search / pagination. */
export async function listUsers(input: unknown): Promise<
  ActionResult<{ rows: Array<Record<string, unknown>>; total: number; page: number }>
> {
  try {
    await requireRole('moderator')
    const parsed = userListQuery.safeParse(input ?? {})
    if (!parsed.success) return { ok: false, code: REF.ADMIN, error: 'Bad query.' }
    const q = parsed.data
    let query = supabaseAdmin()
      .from('profiles')
      .select('id, full_name, email, mobile, status, role, barangay_id, approved_at, onboarded_at, suspended_until, barangays(name)', { count: 'exact' })
    if (q.status) query = query.eq('status', q.status)
    if (q.barangay) query = query.eq('barangay_id', q.barangay)
    if (q.q) query = query.or(`full_name.ilike.%${q.q}%,email.ilike.%${q.q}%`)
    const { data, count, error } = await query
      .order('onboarded_at', { ascending: false, nullsFirst: false })
      .range((q.page - 1) * PAGE, q.page * PAGE - 1)
    if (error) throw error
    return { ok: true, data: { rows: data ?? [], total: count ?? 0, page: q.page } }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function getUser(userId: string): Promise<ActionResult<Record<string, unknown>>> {
  try {
    await requireRole('moderator')
    const db = supabaseAdmin()
    const { data: profile } = await db
      .from('profiles')
      .select('*, barangays(name)')
      .eq('id', userId)
      .maybeSingle()
    if (!profile) return { ok: false, code: REF.ADMIN, error: 'No such user.' }
    const [{ data: listings }, { data: trades }, { data: reports }, { data: docs }] = await Promise.all([
      db.from('items').select('id, code, title, status, created_at').eq('owner_id', userId).order('created_at', { ascending: false }).limit(20),
      db.from('trades').select('id, code, status, created_at, offers!inner(from_user_id, to_user_id)').or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`).limit(20),
      db.from('reports').select('id, reason, status, target_type, target_id, created_at').or(`reporter_id.eq.${userId},target_id.eq.${userId}`).limit(20),
      db.from('residency_documents').select('id, storage_path, proof_type, status, reviewed_at, delete_after').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    ])
    return { ok: true, data: { profile, listings, trades, reports, documents: docs } }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** approveUser: verified + approved_at/by, doc delete_after = +90 d, email, audit. */
export async function approveUser(input: unknown): Promise<ActionResult> {
  try {
    const { userId: adminId } = await requireRole('moderator')
    const parsed = approveUserSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: REF.ADMIN, error: 'Missing user.' }
    const db = supabaseAdmin()
    const now = new Date().toISOString()
    const deleteAfter = new Date(Date.now() + 90 * 86_400_000).toISOString()

    const { error } = await db
      .from('profiles')
      .update({ status: 'verified', approved_at: now, approved_by: adminId, suspended_until: null })
      .eq('id', parsed.data.userId)
      .neq('status', 'deleted')
    if (error) throw error

    // latest proof: approved + 90-day deletion clock (docs/11 §5)
    const { data: latest, error: latestErr } = await db
      .from('residency_documents')
      .select('id')
      .eq('user_id', parsed.data.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestErr) throw latestErr
    if (latest) {
      const { error: docErr } = await db
        .from('residency_documents')
        .update({ status: 'approved', reviewed_by: adminId, reviewed_at: now, delete_after: deleteAfter, reject_reason: null })
        .eq('id', latest.id)
      if (docErr) throw docErr
    }

    const { data: approvedProfile } = await db.from('profiles').select('full_name').eq('id', parsed.data.userId).maybeSingle()
    await sendSafe(parsed.data.userId, await emailOf(parsed.data.userId), 'Your CaintaTrade account is approved',
      'Welcome! Your residency was verified — you can now post items, make offers and trade with neighbours.',
      'account_approved',
      () => accountApprovedEmail(approvedProfile?.full_name ?? 'neighbour'))
    await notifyUser({
      userId: parsed.data.userId,
      type: 'account_approved',
      title: 'Your account is approved',
      body: 'You can now post items, make offers and trade with neighbours.',
      link: '/home',
    })
    await logAdminAction({ adminId, action: 'user_approved', subjectType: 'profile', subjectId: parsed.data.userId })
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

async function emailOf(userId: string): Promise<string> {
  const { data } = await supabaseAdmin().from('profiles').select('email').eq('id', userId).maybeSingle()
  return data?.email ?? ''
}

export async function rejectUser(input: unknown): Promise<ActionResult> {
  try {
    const { userId: adminId } = await requireRole('moderator')
    const parsed = rejectUserSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, code: REF.ADMIN, error: parsed.error.issues[0]?.message ?? 'Give a reason.' }
    }
    const db = supabaseAdmin()
    const now = new Date().toISOString()
    const { data: latest, error: latestErr } = await db
      .from('residency_documents')
      .select('id')
      .eq('user_id', parsed.data.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestErr) throw latestErr
    if (latest) {
      const { error: docErr } = await db
        .from('residency_documents')
        .update({ status: 'rejected', reviewed_by: adminId, reviewed_at: now, reject_reason: parsed.data.reason })
        .eq('id', latest.id)
      if (docErr) throw docErr
    }
    // profile stays pending: the member may re-upload (status enum has no 'rejected')
    await sendSafe(parsed.data.userId, await emailOf(parsed.data.userId), 'More is needed for your CaintaTrade account',
      `Reason: ${parsed.data.reason}\nYou can upload a new proof of residency from your account status page.`,
      'account_rejected',
      () => adminNoticeEmail('We need a clearer proof of residency', `Reason: ${parsed.data.reason}\nYou can upload a new proof of residency from your account status page.`))
    await notifyUser({
      userId: parsed.data.userId,
      type: 'account_rejected',
      title: 'Proof of residency needs a re-upload',
      body: parsed.data.reason,
      link: '/onboarding',
    })
    await logAdminAction({ adminId, action: 'user_rejected', subjectType: 'profile', subjectId: parsed.data.userId, reason: parsed.data.reason })
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function requestDocument(input: unknown): Promise<ActionResult> {
  try {
    const { userId: adminId } = await requireRole('moderator')
    const parsed = requestDocumentSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: REF.ADMIN, error: 'Missing user.' }
    await sendSafe(parsed.data.userId, await emailOf(parsed.data.userId), 'A clearer residency document, please',
      parsed.data.note || 'Please upload a clearer photo of your residency document so we can finish the review.',
      'admin_notice')
    await notifyUser({
      userId: parsed.data.userId,
      type: 'admin_notice',
      title: 'Please upload a clearer document',
      body: parsed.data.note ?? undefined,
      link: '/onboarding',
    })
    await logAdminAction({ adminId, action: 'document_requested', subjectType: 'profile', subjectId: parsed.data.userId, reason: parsed.data.note ?? null })
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function suspendUser(input: unknown): Promise<ActionResult> {
  try {
    const { userId: adminId } = await requireRole('moderator')
    const parsed = suspendUserSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, code: REF.ADMIN, error: parsed.error.issues[0]?.message ?? 'Give a reason.' }
    }
    const until = new Date(Date.now() + parsed.data.days * 86_400_000).toISOString()
    const { error } = await supabaseAdmin()
      .from('profiles')
      .update({ status: 'suspended', suspended_until: until })
      .eq('id', parsed.data.userId)
      .neq('status', 'deleted')
    if (error) throw error
    await sendSafe(parsed.data.userId, await emailOf(parsed.data.userId), 'Your CaintaTrade account is suspended',
      `Reason: ${parsed.data.reason}\nUntil: ${until}`, 'account_suspended',
      () => accountSuspendedEmail(parsed.data.reason, until))
    await notifyUser({
      userId: parsed.data.userId,
      type: 'account_suspended',
      title: 'Your account is suspended',
      body: parsed.data.reason,
      link: '/account-status',
    })
    await logAdminAction({ adminId, action: 'user_suspended', subjectType: 'profile', subjectId: parsed.data.userId, reason: parsed.data.reason })
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function reinstateUser(input: unknown): Promise<ActionResult> {
  try {
    const { userId: adminId } = await requireRole('moderator')
    const parsed = reinstateUserSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: REF.ADMIN, error: 'Missing user.' }
    const { error } = await supabaseAdmin()
      .from('profiles')
      .update({ status: 'verified', suspended_until: null })
      .eq('id', parsed.data.userId)
      .neq('status', 'deleted')
    if (error) throw error
    await sendSafe(parsed.data.userId, await emailOf(parsed.data.userId), 'Your CaintaTrade account is reinstated',
      'Welcome back — your account is active again.', 'account_approved')
    await logAdminAction({ adminId, action: 'user_reinstated', subjectType: 'profile', subjectId: parsed.data.userId })
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}
