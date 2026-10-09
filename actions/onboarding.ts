'use server'

import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireSignedIn } from '@/lib/auth/guards'
import { onboardingSchema } from '@/lib/validators/onboarding'
import { appealSchema } from '@/lib/validators/settings'
import { readUpload, randomName, safeFolder, UploadError } from '@/lib/uploads'
import { uploadFile, BUCKETS } from '@/lib/storage'
import { rateLimit } from '@/lib/ratelimit'
import { notifyUser } from '@/lib/notify'
import { REF, toActionError } from '@/lib/errors'

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code: string; fields?: Record<string, string> }

/** docs/03 3.3: validate (zod) → upload proof to the private bucket →
 *  residency_documents row → profile pending + onboarded_at. */
export async function completeOnboarding(
  input: z.infer<typeof onboardingSchema>,
  proof: File,
): Promise<ActionResult<{ documentId: string }>> {
  try {
    // A live session is enough here — do NOT require an existing profile row:
    // this action is what creates it. The user.created webhook normally wins
    // the race, but finalize() and this submit can land in the same second
    // (and in local dev the webhook cannot reach the machine at all), so
    // gating on the row would strand every freshly verified resident.
    const { userId } = await auth()
    if (!userId) {
      return {
        ok: false,
        code: REF.ONBOARD,
        error: 'Your session expired — go back to step 1 and try again.',
      }
    }
    await rateLimit('onboarding', userId)

    const parsed = onboardingSchema.safeParse(input)
    if (!parsed.success) {
      const fields: Record<string, string> = {}
      for (const issue of parsed.error.issues) fields[String(issue.path[0])] = issue.message
      return { ok: false, code: REF.ONBOARD, error: 'Check the highlighted fields.', fields }
    }
    const v = parsed.data

    // docs/11 §5: JPG/PNG/PDF ≤5 MB, real type sniffed, random name, own folder
    let upload: { bytes: Uint8Array; ext: string }
    try {
      upload = await readUpload(proof, ['jpg', 'png', 'pdf'])
    } catch (e) {
      if (e instanceof UploadError) {
        return { ok: false, code: REF.ONBOARD, error: e.message, fields: { proof: e.message } }
      }
      throw e
    }

    const db = supabaseAdmin()
    const { data: enabled } = await db
      .from('barangays')
      .select('id')
      .eq('id', v.barangayId)
      .eq('is_enabled', true)
      .maybeSingle()
    if (!enabled) {
      return {
        ok: false,
        code: REF.ONBOARD,
        error: 'Coverage is limited to the seven barangays of Cainta.',
        fields: { barangayId: 'Choose one of the seven Cainta barangays.' },
      }
    }

    // Upsert, not update: the user.created webhook normally creates this row,
    // but if it hasn't landed (local dev, delivery lag) an update affecting
    // 0 rows would silently drop everything the resident just entered while
    // still reporting success. Only the submitted columns are written, so an
    // admin-set role/status is never touched (same shape as the webhook).
    const { error: profErr } = await db.from('profiles').upsert(
      {
        id: userId,
        full_name: v.fullName,
        mobile: `+63${v.mobile}`,
        barangay_id: v.barangayId,
        street_address: v.street,
        onboarded_at: new Date().toISOString(),
        consents: {
          terms: { accepted: true, at: new Date().toISOString() },
          privacy: { accepted: true, at: new Date().toISOString() },
          updates: Boolean(v.consentUpdates),
        },
      },
      { onConflict: 'id' },
    )
    if (profErr) throw profErr

    const folder = safeFolder(userId)
    const name = randomName(upload.ext)
    const path = await uploadFile(
      BUCKETS.residencyDocs,
      folder,
      upload.bytes,
      name,
      upload.ext === 'pdf' ? 'application/pdf' : `image/${upload.ext === 'jpg' ? 'jpeg' : 'png'}`,
    )

    const { data: doc, error: docErr } = await db
      .from('residency_documents')
      .insert({ user_id: userId, storage_path: path, proof_type: upload.ext, status: 'submitted' })
      .select('id')
      .single()
    if (docErr) throw docErr

    return { ok: true, data: { documentId: doc.id } }
  } catch (e) {
    const err = toActionError(e, REF.ONBOARD)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** docs/07: P users resend their details / appeal a suspension. */
export async function resendDetails(): Promise<ActionResult> {
  try {
    const { userId, profile } = await requireSignedIn()
    await rateLimit('onboarding', userId)
    const { data: doc } = await supabaseAdmin()
      .from('residency_documents')
      .select('id, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    await notifyUser({
      userId,
      type: 'admin_notice',
      title: 'Your details are with the administrators',
      body: doc
        ? `Reference document status: ${doc.status}. Approval usually happens within 24 hours.`
        : 'Upload your proof of residency to complete your application.',
      link: '/account-status',
    })
    void profile
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.ONBOARD)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function submitAppeal(
  message: string,
): Promise<ActionResult<{ reportId: string }>> {
  try {
    const { userId, profile } = await requireSignedIn()
    await rateLimit('reports', userId)
    const parsed = appealSchema.safeParse({ message })
    if (!parsed.success) {
      return { ok: false, code: REF.ONBOARD, error: parsed.error.issues[0].message }
    }
    const db = supabaseAdmin()
    const { data: report, error } = await db
      .from('reports')
      .insert({
        reporter_id: userId,
        is_anonymous: false,
        target_type: 'member',
        target_id: userId,
        reason: 'other',
        details: `Appeal against ${profile.status}: ${parsed.data.message}`.slice(0, 1000),
        status: 'open',
      })
      .select('id')
      .single()
    if (error) throw error

    const { data: staff } = await db
      .from('profiles')
      .select('id')
      .in('role', ['moderator', 'admin'])
    for (const s of staff ?? []) {
      await notifyUser({
        userId: s.id,
        type: 'admin_notice',
        title: 'New account appeal',
        body: `${profile.full_name ?? 'A member'} appealed their account status.`,
        link: `/admin/reports`,
      })
    }
    return { ok: true, data: { reportId: report.id } }
  } catch (e) {
    const err = toActionError(e, REF.ONBOARD)
    return { ok: false, code: err.code, error: err.message }
  }
}
