'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireVerified, requireRole } from '@/lib/auth/guards'
import { createReportSchema, decideReportSchema } from '@/lib/validators/report'
import { adminReportQuery } from '@/lib/validators/admin'
import { rateLimit } from '@/lib/ratelimit'
import { logAdminAction } from '@/lib/audit'
import { notifyUser, emailIfAllowed } from '@/lib/notify'
import { readUpload, randomName, UploadError } from '@/lib/uploads'
import { uploadFile, BUCKETS, signedUrl } from '@/lib/storage'
import { REF, toActionError } from '@/lib/errors'
import { adminRemoveListing } from '@/actions/listings'
import type { ActionResult } from '@/actions/onboarding'

/** docs/03 3.10: create a report (3 target types, 8 reasons, evidence, anonymous,
 *  urgent flag for money/prohibited), notify moderators. */
export async function createReport(
  input: unknown,
  evidence: File[] = [],
): Promise<ActionResult<{ reportId: string }>> {
  try {
    const { userId } = await requireVerified()
    await rateLimit('reports', userId)
    const parsed = createReportSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, code: REF.REPORT, error: parsed.error.issues[0]?.message ?? 'Check the report.' }
    }
    const v = parsed.data
    if (evidence.length > 5) {
      return { ok: false, code: REF.REPORT, error: 'Up to 5 evidence files.' }
    }

    const db = supabaseAdmin()
    const { data, error } = await db
      .from('reports')
      .insert({
        reporter_id: userId,
        is_anonymous: v.isAnonymous,
        target_type: v.targetType,
        target_id: v.targetId,
        reason: v.reason,
        details: v.details ?? null,
        attach_chat: v.attachChat,
        is_urgent: v.reason === 'prohibited' || v.reason === 'asking_money',
        status: 'open',
      })
      .select('id')
      .single()
    if (error) throw error

    for (const file of evidence.slice(0, 5)) {
      try {
        const up = await readUpload(file, ['jpg', 'png', 'pdf'])
        const path = await uploadFile(
          BUCKETS.reportEvidence,
          data.id,
          up.bytes,
          randomName(up.ext),
          up.ext === 'pdf' ? 'application/pdf' : up.ext === 'jpg' ? 'image/jpeg' : 'image/png',
        )
        await db.from('report_evidence').insert({ report_id: data.id, storage_path: path })
      } catch (e) {
        if (e instanceof UploadError) {
          return { ok: false, code: REF.REPORT, error: e.message }
        }
        throw e
      }
    }

    const { data: staff } = await db.from('profiles').select('id, email').in('role', ['moderator', 'admin'])
    for (const s of staff ?? []) {
      await notifyUser({
        userId: s.id,
        type: 'admin_notice',
        title: 'New report in the queue',
        body: `Reason: ${v.reason}${v.isAnonymous ? ' (anonymous reporter)' : ''}`,
        link: '/admin/reports',
      })
    }
    return { ok: true, data: { reportId: data.id } }
  } catch (e) {
    const err = toActionError(e, REF.REPORT)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function assignReport(reportId: string): Promise<ActionResult> {
  try {
    const { userId } = await requireRole('moderator')
    const { error } = await supabaseAdmin()
      .from('reports')
      .update({ status: 'assigned', assigned_to: userId })
      .eq('id', reportId)
      .eq('status', 'open')
    if (error) throw error
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.REPORT)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** Ask the reporter a follow-up question (adds to details, keeps status). */
export async function askReporter(reportId: string, question: string): Promise<ActionResult> {
  try {
    const { userId } = await requireRole('moderator')
    const db = supabaseAdmin()
    const { data: report } = await db
      .from('reports')
      .select('reporter_id, profiles!reports_reporter_id_fkey(email)')
      .eq('id', reportId)
      .maybeSingle()
    if (!report) return { ok: false, code: REF.REPORT, error: 'Report not found.' }
    const reporter = report.profiles as unknown as { email: string | null } | null
    await notifyUser({
      userId: report.reporter_id,
      type: 'admin_notice',
      title: 'A moderator has a question about your report',
      body: question.slice(0, 300),
      link: '/account-status',
      email: reporter?.email
        ? { to: reporter.email, subject: 'Question about your CaintaTrade report', text: question }
        : undefined,
    })
    await logAdminAction({ adminId: userId, action: 'report_asked', subjectType: 'report', subjectId: reportId })
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.REPORT)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** docs/03 3.10: dismiss / warn / remove listing / suspend — note required,
 *  both parties notified, audit row written. */
export async function decideReport(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await requireRole('moderator')
    const parsed = decideReportSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, code: REF.REPORT, error: parsed.error.issues[0]?.message ?? 'Add a moderation note.' }
    }
    const v = parsed.data
    const db = supabaseAdmin()
    const { data: report } = await db
      .from('reports')
      .select('id, reporter_id, target_type, target_id, status, is_anonymous, assigned_to')
      .eq('id', v.reportId)
      .maybeSingle()
    if (!report) return { ok: false, code: REF.REPORT, error: 'Report not found.' }
    if (report.status !== 'open' && report.status !== 'assigned') {
      return { ok: false, code: REF.REPORT, error: 'That report is already resolved.' }
    }

    const status = v.decision === 'dismiss' ? 'dismissed' : 'upheld'
    const { error } = await db
      .from('reports')
      .update({
        status,
        decision: v.decision,
        moderation_note: v.moderationNote,
        resolved_at: new Date().toISOString(),
        assigned_to: report.assigned_to ?? userId,
      })
      .eq('id', v.reportId)
    if (error) throw error

    // target side effects
    let targetUserId: string | null = null
    if (v.decision === 'remove_listing' && report.target_type === 'listing') {
      await adminRemoveListing(report.target_id, v.moderationNote, userId)
      const { data: item } = await db.from('items').select('owner_id').eq('id', report.target_id).maybeSingle()
      targetUserId = item?.owner_id ?? null
    } else if (report.target_type === 'member') {
      targetUserId = report.target_id
    } else if (report.target_type === 'message') {
      const { data: msg } = await db
        .from('messages')
        .select('sender_id, offer_id')
        .eq('id', report.target_id)
        .maybeSingle()
      targetUserId = msg?.sender_id ?? null
    }

    if (v.decision === 'suspend' && targetUserId) {
      const until = new Date(Date.now() + (v.suspendDays ?? 30) * 86_400_000).toISOString()
      await db
        .from('profiles')
        .update({ status: 'suspended', suspended_until: until })
        .eq('id', targetUserId)
      const { data: prof } = await db.from('profiles').select('email, full_name').eq('id', targetUserId).maybeSingle()
      if (prof?.email) {
        await emailIfAllowed({
          userId: targetUserId,
          type: 'account_suspended',
          to: prof.email,
          subject: 'Your CaintaTrade account is suspended',
          text: `Reason: ${v.moderationNote}\nUntil: ${until}`,
        })
      }
    }

    // notify both sides (anonymous reports never reveal the reporter)
    if (!report.is_anonymous && report.target_type !== 'member' && targetUserId) {
      await notifyUser({
        userId: report.target_id === targetUserId ? targetUserId : report.reporter_id,
        type: 'report_outcome',
        title: 'Your report was reviewed',
        body: `Outcome: ${v.decision}.`,
        link: '/account-status',
      })
    }
    if (report.target_type !== 'member') {
      await notifyUser({
        userId: report.reporter_id,
        type: 'report_outcome',
        title: 'Your report was reviewed',
        body: `Outcome: ${v.decision}.`,
        link: '/account-status',
      })
    }

    await logAdminAction({
      adminId: userId,
      action: `report_${v.decision}`,
      subjectType: 'report',
      subjectId: v.reportId,
      reason: v.moderationNote,
    })
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.REPORT)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** docs/03 3.9: block / unblock a member. */
export async function blockMember(memberId: string): Promise<ActionResult> {
  try {
    const { userId } = await requireVerified()
    if (memberId === userId) return { ok: false, code: REF.REPORT, error: 'You cannot block yourself.' }
    const { error } = await supabaseAdmin()
      .from('blocks')
      .insert({ user_id: userId, blocked_id: memberId })
    if (error && error.code !== '23505') throw error
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.REPORT)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function unblockMember(memberId: string): Promise<ActionResult> {
  try {
    const { userId } = await requireVerified()
    const { error } = await supabaseAdmin()
      .from('blocks')
      .delete()
      .eq('user_id', userId)
      .eq('blocked_id', memberId)
    if (error) throw error
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.REPORT)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** Evidence download for staff/reporter (60 s signed URL). */
export async function evidenceUrl(evidenceId: string): Promise<ActionResult<{ url: string }>> {
  try {
    const { userId } = await requireVerified()
    const db = supabaseAdmin()
    const { data } = await db
      .from('report_evidence')
      .select('id, storage_path, reports!inner(reporter_id)')
      .eq('id', evidenceId)
      .maybeSingle()
    const report = data?.reports as unknown as { reporter_id: string } | null
    const { data: prof } = await db.from('profiles').select('role').eq('id', userId).maybeSingle()
    const staff = prof?.role === 'moderator' || prof?.role === 'admin'
    if (!data || (!staff && report?.reporter_id !== userId)) {
      return { ok: false, code: REF.REPORT, error: 'Not allowed.' }
    }
    const url = await signedUrl(BUCKETS.reportEvidence, data.storage_path, 60)
    return { ok: true, data: { url } }
  } catch (e) {
    const err = toActionError(e, REF.REPORT)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** docs/03 3.10: moderation queue — oldest first, filter by status/reason/
 *  urgency, plus per-target member history for context. */
export async function listReports(input: unknown): Promise<ActionResult<Record<string, unknown>>> {
  try {
    await requireRole('moderator')
    const parsed = adminReportQuery.safeParse(input ?? {})
    if (!parsed.success) return { ok: false, code: REF.REPORT, error: 'Bad query.' }
    const q = parsed.data
    const db = supabaseAdmin()
    let query = db.from('reports').select('*', { count: 'exact' })
    if (q.status) query = query.eq('status', q.status)
    if (q.reason) query = query.eq('reason', q.reason)
    if (q.urgentOnly) query = query.eq('is_urgent', true)
    const { data, count, error } = await query
      .order('created_at', { ascending: true }) // oldest first
      .range((q.page - 1) * 20, q.page * 20 - 1)
    if (error) throw error

    // hydrate reporter/target + member history for the queue
    const reporterIds = [...new Set((data ?? []).map((r) => r.reporter_id))]
    const targetIds = [...new Set((data ?? []).map((r) => r.target_id))]
    const [{ data: reporters }, { data: targets }, { data: evidence }] = await Promise.all([
      reporterIds.length ? db.from('public_profiles').select('id, full_name, avatar_url').in('id', reporterIds) : Promise.resolve({ data: [] }),
      targetIds.length ? db.from('public_profiles').select('id, full_name, avatar_url, status, avg_rating, completed_trades').in('id', targetIds) : Promise.resolve({ data: [] }),
      data?.length ? db.from('report_evidence').select('id, report_id').in('report_id', data.map((r) => r.id)) : Promise.resolve({ data: [] }),
    ])
    const rById = new Map((reporters ?? []).map((p) => [p.id, p]))
    const tById = new Map((targets ?? []).map((p) => [p.id, p]))
    const evidenceCount = new Map<string, number>()
    for (const e of evidence ?? []) evidenceCount.set(e.report_id, (evidenceCount.get(e.report_id) ?? 0) + 1)

    const rows = (data ?? []).map((r) => ({
      ...r,
      reporter: r.is_anonymous ? null : (rById.get(r.reporter_id) ?? null),
      target: r.target_type === 'member' ? (tById.get(r.target_id) ?? null) : null,
      evidence_count: evidenceCount.get(r.id) ?? 0,
    }))
    return { ok: true, data: { rows, total: count ?? 0, page: q.page } }
  } catch (e) {
    const err = toActionError(e, REF.REPORT)
    return { ok: false, code: err.code, error: err.message }
  }
}
