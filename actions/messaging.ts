'use server'

import type { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireVerified, requireSignedIn } from '@/lib/auth/guards'
import { sendMessageSchema, notificationPrefsSchema } from '@/lib/validators/message'
import { rateLimit } from '@/lib/ratelimit'
import { readUpload, randomName, UploadError, MAX_UPLOAD_BYTES } from '@/lib/uploads'
import { uploadFile, signedUrl, BUCKETS } from '@/lib/storage'
import { REF, toActionError } from '@/lib/errors'
import type { ActionResult } from '@/actions/onboarding'

async function assertParty(offerId: string, userId: string) {
  // `error` must not masquerade as "no such offer": callers treat null as a
  // permission miss and render an empty thread. Only a real row decides.
  for (let attempt = 0; ; attempt++) {
    const { data, error } = await supabaseAdmin()
      .from('offers')
      .select('id, from_user_id, to_user_id, status')
      .eq('id', offerId)
      .maybeSingle()
    if (!error) {
      if (!data) return null
      if (data.from_user_id !== userId && data.to_user_id !== userId) return null
      return data
    }
    if (attempt >= 2) throw error
    await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
  }
}

async function blocked(either: string, other: string) {
  const { data } = await supabaseAdmin()
    .from('blocks')
    .select('user_id')
    .or(`and(user_id.eq.${either},blocked_id.eq.${other}),and(user_id.eq.${other},blocked_id.eq.${either})`)
    .limit(1)
  return Boolean(data?.length)
}

/** docs/03 3.8: send text or one photo; block + verified checks on send. */
export async function sendMessage(
  input: { offerId: string; body?: string },
  photo?: File | null,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId } = await requireVerified()
    await rateLimit('messages', userId)
    const parsed = sendMessageSchema.safeParse({
      offerId: input.offerId,
      body: input.body,
      hasPhoto: Boolean(photo),
    })
    if (!parsed.success) {
      return { ok: false, code: REF.MESSAGE, error: parsed.error.issues[0]?.message ?? 'Write a message.' }
    }
    const offer = await assertParty(parsed.data.offerId, userId)
    if (!offer) return { ok: false, code: REF.MESSAGE, error: 'That conversation is not yours.' }

    const other = offer.from_user_id === userId ? offer.to_user_id : offer.from_user_id
    if (await blocked(userId, other)) {
      return { ok: false, code: REF.MESSAGE, error: 'You blocked this member (or they blocked you).' }
    }

    let photoPath: string | null = null
    if (photo && photo.size > 0) {
      if (photo.size > MAX_UPLOAD_BYTES) {
        return { ok: false, code: REF.MESSAGE, error: 'That photo is over 5 MB.' }
      }
      let up: { bytes: Uint8Array; ext: string }
      try {
        up = await readUpload(photo, ['jpg', 'png'])
      } catch (e) {
        if (e instanceof UploadError) return { ok: false, code: REF.MESSAGE, error: e.message }
        throw e
      }
      photoPath = await uploadFile(
        BUCKETS.chatPhotos,
        parsed.data.offerId,
        up.bytes,
        randomName(up.ext),
        up.ext === 'jpg' ? 'image/jpeg' : 'image/png',
      )
    }

    const { data, error } = await supabaseAdmin()
      .from('messages')
      .insert({
        offer_id: parsed.data.offerId,
        sender_id: userId,
        body: parsed.data.body ?? null,
        photo_path: photoPath,
      })
      .select('id')
      .single()
    if (error) throw error
    return { ok: true, data: { id: data.id } }
  } catch (e) {
    const err = toActionError(e, REF.MESSAGE)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function markRead(offerId: string): Promise<ActionResult> {
  try {
    const { userId } = await requireSignedIn()
    const offer = await assertParty(offerId, userId)
    if (!offer) return { ok: false, code: REF.MESSAGE, error: 'Not your conversation.' }
    const { error } = await supabaseAdmin()
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('offer_id', offerId)
      .neq('sender_id', userId)
      .is('read_at', null)
    if (error) throw error
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.MESSAGE)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  try {
    const { userId } = await requireSignedIn()
    const { error } = await supabaseAdmin()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .is('read_at', null)
    if (error) throw error
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.MESSAGE)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function markAllRead(): Promise<ActionResult> {
  try {
    const { userId } = await requireSignedIn()
    const { error } = await supabaseAdmin()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)
    if (error) throw error
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.MESSAGE)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function updatePreferences(
  prefs: Array<z.input<typeof notificationPrefsSchema>>,
): Promise<ActionResult> {
  try {
    const { userId } = await requireSignedIn()
    const rows = prefs
      .map((p) => notificationPrefsSchema.safeParse(p))
      .filter((r) => r.success)
      .map((r) => ({
        user_id: userId,
        type: (r as { data: { type: string; inApp: boolean; email: boolean } }).data.type,
        in_app: (r as { data: { inApp: boolean } }).data.inApp,
        email: (r as { data: { email: boolean } }).data.email,
      }))
    if (!rows.length) return { ok: false, code: REF.MESSAGE, error: 'Nothing to update.' }
    const { error } = await supabaseAdmin()
      .from('notification_preferences')
      .upsert(rows, { onConflict: 'user_id,type' })
    if (error) throw error
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.MESSAGE)
    return { ok: false, code: err.code, error: err.message }
  }
}

/* ─────────────────────── reads (docs/07) ─────────────────────── */

/** Conversations for the caller: offers they party to, with the other side,
 *  the listing, last message and unread count. */
export async function listConversations(): Promise<ActionResult<{ rows: Array<Record<string, unknown>>; unread: number }>> {
  try {
    const { userId } = await requireSignedIn()
    const db = supabaseAdmin()
    const { data: offers, error } = await db
      .from('offers')
      .select('id, status, from_user_id, to_user_id, wanted_item_id')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .in('status', ['pending', 'accepted', 'rejected', 'cancelled', 'completed', 'countered'])
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    const offerIds = (offers ?? []).map((o) => o.id)
    if (!offerIds.length) return { ok: true, data: { rows: [], unread: 0 } }

    const [{ data: msgs }, { data: items }, { data: parties }, { count: unread }] = await Promise.all([
      db.from('messages').select('id, offer_id, sender_id, body, photo_path, read_at, created_at')
        .in('offer_id', offerIds).order('created_at', { ascending: false }).limit(300),
      db.from('items').select('id, title').in('id', [...new Set((offers ?? []).map((o) => o.wanted_item_id))]),
      db.from('public_profiles').select('id, full_name, avatar_url')
        .in('id', [...new Set((offers ?? []).flatMap((o) => [o.from_user_id, o.to_user_id]))]),
      db.from('messages').select('id', { count: 'exact', head: true })
        .in('offer_id', offerIds).neq('sender_id', userId).is('read_at', null),
    ])
    const iTitle = new Map((items ?? []).map((i) => [i.id, i.title]))
    const pById = new Map((parties ?? []).map((p) => [p.id, p]))

    const rows = (offers ?? []).map((o) => {
      const thread = (msgs ?? []).filter((m) => m.offer_id === o.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
      const last = thread[0] ?? null
      const unreadCount = thread.filter((m) => m.sender_id !== userId && !m.read_at).length
      const otherId = o.from_user_id === userId ? o.to_user_id : o.from_user_id
      return {
        offer_id: o.id,
        status: o.status,
        item_title: iTitle.get(o.wanted_item_id) ?? 'Listing',
        other: pById.get(otherId) ?? null,
        last_message: last,
        unread: unreadCount,
      }
    })
    rows.sort((a, b) =>
      (b.last_message?.created_at ?? '').localeCompare(a.last_message?.created_at ?? ''),
    )
    return { ok: true, data: { rows, unread: unread ?? 0 } }
  } catch (e) {
    const err = toActionError(e, REF.MESSAGE)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** Message thread for one offer (party only) with photo signed URLs (60 s). */
export async function getMessages(offerId: string): Promise<ActionResult<{ rows: Array<Record<string, unknown>> }>> {
  try {
    const { userId } = await requireSignedIn()
    const offer = await assertParty(offerId, userId)
    if (!offer) return { ok: false, code: REF.MESSAGE, error: 'Not your conversation.' }
    // The thread page maps a failed result to an empty list, and a realtime
    // refresh hits this on every message — a transient PostgREST error would
    // silently blank the conversation. Retry before giving up.
    let data: Array<Record<string, unknown>> | null = null
    for (let attempt = 0; ; attempt++) {
      const res = await supabaseAdmin()
        .from('messages')
        .select('id, offer_id, sender_id, body, photo_path, read_at, created_at')
        .eq('offer_id', offerId)
        .order('created_at', { ascending: true })
        .limit(500)
      if (!res.error) {
        data = res.data
        break
      }
      if (attempt >= 2) throw res.error
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
    }

    const rows = await Promise.all((data ?? []).map(async (m) => {
      if (!m.photo_path) return m
      try {
        const url = await signedUrl(BUCKETS.chatPhotos, m.photo_path as string, 60)
        return { ...m, photo_url: url }
      } catch {
        return { ...m, photo_url: null }
      }
    }))
    return { ok: true, data: { rows } }
  } catch (e) {
    console.error('[getMessages]', offerId, e)
    const err = toActionError(e, REF.MESSAGE)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** Notifications for the caller, optional type filter, newest first. */
export async function listNotifications(
  type?: string,
  page = 1,
): Promise<ActionResult<{ rows: Array<Record<string, unknown>>; total: number; unread: number; page: number }>> {
  try {
    const { userId } = await requireSignedIn()
    const db = supabaseAdmin()
    const PAGE = 20
    let query = db.from('notifications').select('*', { count: 'exact' }).eq('user_id', userId)
    if (type) query = query.eq('type', type)
    const [{ data, count, error }, { count: unread }] = await Promise.all([
      query.order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1),
      db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null),
    ])
    if (error) throw error
    return { ok: true, data: { rows: data ?? [], total: count ?? 0, unread: unread ?? 0, page } }
  } catch (e) {
    const err = toActionError(e, REF.MESSAGE)
    return { ok: false, code: err.code, error: err.message }
  }
}
