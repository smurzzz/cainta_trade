'use server'

import { clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireSignedIn, requireVerified } from '@/lib/auth/guards'
import { updateProfileSchema, deleteAccountSchema } from '@/lib/validators/settings'
import { rateLimit } from '@/lib/ratelimit'
import { readUpload, randomName, safeFolder, UploadError } from '@/lib/uploads'
import { uploadFile, removeFiles, publicUrl, BUCKETS } from '@/lib/storage'
import { notifyUser } from '@/lib/notify'
import { REF, toActionError } from '@/lib/errors'
import type { ActionResult } from '@/actions/onboarding'

/** docs/03 3.12: name change → back to approval; barangay change re-triggers
 *  the residency check; privacy toggles apply immediately. */
export async function updateProfile(input: unknown): Promise<ActionResult<{ status: string }>> {
  try {
    const { userId } = await requireSignedIn()
    await rateLimit('onboarding', userId)
    const parsed = updateProfileSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        code: REF.SETTINGS,
        error: parsed.error.issues[0]?.message ?? 'Check the form.',
        fields: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])),
      }
    }
    const v = parsed.data
    const db = supabaseAdmin()
    const { data: current } = await db
      .from('profiles')
      .select('full_name, barangay_id, status')
      .eq('id', userId)
      .maybeSingle()
    if (!current) return { ok: false, code: REF.SETTINGS, error: 'Profile not found.' }

    const nameChanged = v.fullName !== undefined && v.fullName !== current.full_name
    const barangayChanged = v.barangayId !== undefined && v.barangayId !== current.barangay_id

    const row: Record<string, unknown> = {}
    if (v.fullName !== undefined) row.full_name = v.fullName
    if (v.bio !== undefined) row.bio = v.bio
    if (v.mobile !== undefined) row.mobile = v.mobile
    if (v.barangayId !== undefined) row.barangay_id = v.barangayId
    if (v.street !== undefined) row.street_address = v.street
    if (v.showMobile !== undefined) row.show_mobile = v.showMobile
    if (v.allowPreOfferMsg !== undefined) row.allow_pre_offer_msg = v.allowPreOfferMsg
    if (v.showTradeCount !== undefined) row.show_trade_count = v.showTradeCount
    if (v.showBarangay !== undefined) row.show_barangay = v.showBarangay
    if (v.showLastActive !== undefined) row.show_last_active = v.showLastActive
    if (v.showUsualMeetup !== undefined) row.show_usual_meetup = v.showUsualMeetup
    if (v.hideFromSearch !== undefined) row.hide_from_search = v.hideFromSearch

    let newStatus: string | null = null
    if (current.status === 'verified' && (nameChanged || barangayChanged)) {
      row.status = 'pending'
      row.approved_at = null
      row.approved_by = null
      newStatus = 'pending'
    }

    if (Object.keys(row).length) {
      const { error } = await db.from('profiles').update(row).eq('id', userId)
      if (error) throw error
    }

    if (newStatus === 'pending') {
      await notifyUser({
        userId,
        type: 'admin_notice',
        title: 'Your changes need a quick re-check',
        body: barangayChanged
          ? 'You changed barangay — please upload a proof of residency for the new barangay.'
          : 'You changed your name — an administrator will re-check your details.',
        link: '/account-status',
      })
    }
    revalidatePath('/settings')
    return { ok: true, data: { status: newStatus ?? current.status } }
  } catch (e) {
    const err = toActionError(e, REF.SETTINGS)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** Avatar upload (jpg/png ≤ 2 MB) into the public avatars bucket. */
export async function uploadPhoto(photo: File | null | undefined): Promise<ActionResult<{ url: string }>> {
  try {
    const { userId } = await requireSignedIn()
    if (!photo) return { ok: false, code: REF.SETTINGS, error: 'Choose a photo first.' }
    const { bytes, ext } = await readUpload(photo, ['jpg', 'png'])
    const path = await uploadFile('avatars', safeFolder(userId), bytes, randomName(ext), photo.type)
    const url = publicUrl('avatars', path)
    const { error } = await supabaseAdmin().from('profiles').update({ avatar_url: url }).eq('id', userId)
    if (error) throw error
    revalidatePath('/settings')
    return { ok: true, data: { url } }
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, code: REF.SETTINGS, error: e.message }
    const err = toActionError(e, REF.SETTINGS)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** docs/03 3.12: export profile, listings, offers, messages as JSON. */
export async function requestDataExport(): Promise<ActionResult<{ filename: string; json: string }>> {
  try {
    const { userId } = await requireVerified()
    const db = supabaseAdmin()
    const [{ data: profile }, { data: listings }, { data: offers }, { data: notifications }] = await Promise.all([
      db.from('profiles').select('id, full_name, email, mobile, barangay_id, street_address, bio, role, status, created_at, onboarded_at, approved_at').eq('id', userId).maybeSingle(),
      db.from('items').select('id, code, title, description, condition, looking_for, trade_type, status, created_at').eq('owner_id', userId),
      db.from('offers').select('id, wanted_item_id, offered_item_id, status, message, created_at, responded_at').or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`),
      db.from('notifications').select('id, type, title, body, link, read_at, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(500),
    ])
    const [{ data: photos }, { data: messages }] = await Promise.all([
      db.from('item_photos').select('id, item_id, storage_path, sort_order, is_main')
        .in('item_id', (listings ?? []).map((l) => l.id)).order('sort_order'),
      db.from('messages').select('id, offer_id, body, photo_path, read_at, created_at, sender_id')
        .in('offer_id', (offers ?? []).map((o) => o.id)),
    ])
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      listings,
      listingPhotos: photos,
      offers,
      messages,
      notifications,
    }
    return {
      ok: true,
      data: { filename: `caintatrade-export-${new Date().toISOString().slice(0, 10)}.json`, json: JSON.stringify(payload, null, 2) },
    }
  } catch (e) {
    const err = toActionError(e, REF.SETTINGS)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** Delete the caller's residency proof now (docs/03 3.12). */
export async function deleteResidencyDocument(docId: string): Promise<ActionResult> {
  try {
    const { userId } = await requireVerified()
    const db = supabaseAdmin()
    const { data: doc } = await db
      .from('residency_documents')
      .select('id, storage_path, status')
      .eq('id', docId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!doc) return { ok: false, code: REF.SETTINGS, error: 'Document not found.' }
    if (doc.status === 'approved') {
      return { ok: false, code: REF.SETTINGS, error: 'Your approved proof is on record — contact an administrator to remove it.' }
    }
    await removeFiles(BUCKETS.residencyDocs, [doc.storage_path])
    const { error } = await db.from('residency_documents').delete().eq('id', doc.id)
    if (error) throw error
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.SETTINGS)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** docs/03 3.12: blocked with open trades; anonymise data, then delete the
 *  Clerk user (the webhook marks the profile deleted as a backstop). */
export async function deleteAccount(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await requireVerified()
    const parsed = deleteAccountSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, code: REF.SETTINGS, error: parsed.error.issues[0]?.message ?? 'Check the form.' }
    }
    const db = supabaseAdmin()

    // blocked while any trade is still open
    const [{ count: openOffers }, { count: openTrades }] = await Promise.all([
      db.from('offers').select('id', { count: 'exact', head: true })
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .in('status', ['pending', 'accepted']),
      db.from('trades').select('id, offers!inner(from_user_id, to_user_id)', { count: 'exact', head: true })
        .in('status', ['meetup_pending', 'meetup_set', 'both_confirmed', 'disputed'])
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`, { foreignTable: 'offers' }),
    ])
    if ((openOffers ?? 0) > 0 || (openTrades ?? 0) > 0) {
      return {
        ok: false,
        code: REF.SETTINGS,
        error: 'You still have open trades. Complete or cancel them before deleting your account.',
      }
    }

    // 1. remove private data: residency docs (+files), listings (+photos), messages history stays
    const [{ data: docs }, { data: items }] = await Promise.all([
      db.from('residency_documents').select('storage_path').eq('user_id', userId),
      db.from('items').select('id').eq('owner_id', userId),
    ])
    if (docs?.length) await removeFiles(BUCKETS.residencyDocs, docs.map((d) => d.storage_path))
    if (items?.length) {
      const { data: photos } = await db.from('item_photos')
        .select('storage_path')
        .in('item_id', items.map((i) => i.id))
      if (photos?.length) await removeFiles(BUCKETS.listingPhotos, photos.map((p) => p.storage_path))
      const { error } = await db.from('items').delete().in('id', items.map((i) => i.id))
      if (error) throw error
    }

    // 2. anonymise the profile row (keeps FK history intact for trade partners)
    const { error: anonErr } = await db
      .from('profiles')
      .update({
        full_name: 'Deleted member',
        email: null,
        mobile: null,
        street_address: null,
        bio: null,
        avatar_url: null,
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        hide_from_search: true,
      })
      .eq('id', userId)
    if (anonErr) throw anonErr

    // 3. delete the Clerk user — a deleted account can never sign in again
    try {
      const client = await clerkClient()
      await client.users.deleteUser(userId)
    } catch (e) {
      console.error('[deleteAccount clerk]', e)
      return {
        ok: false,
        code: REF.SETTINGS,
        error: 'Your data was removed but the sign-in account could not be deleted. Please contact support.',
      }
    }
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.SETTINGS)
    return { ok: false, code: err.code, error: err.message }
  }
}
