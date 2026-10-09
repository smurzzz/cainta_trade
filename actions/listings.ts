'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireVerified } from '@/lib/auth/guards'
import { createItemSchema, updateItemSchema, flagCashWords } from '@/lib/validators/item'
import { rateLimit } from '@/lib/ratelimit'
import { logAdminAction } from '@/lib/audit'
import { notifyUser } from '@/lib/notify'
import { REF, mapDbError, toActionError } from '@/lib/errors'
import { removeFiles, BUCKETS } from '@/lib/storage'
import type { ActionResult } from '@/actions/onboarding'

async function ownedItem(itemId: string, userId: string) {
  const { data } = await supabaseAdmin()
    .from('items')
    .select('id, owner_id, status, title')
    .eq('id', itemId)
    .maybeSingle()
  if (!data || data.owner_id !== userId) return null
  return data
}

/** Map a PostgREST error onto the ActionResult shape. */
function fail(
  e: Parameters<typeof mapDbError>[0],
  fallback?: string,
  ref: string = REF.LISTING,
): ActionResult {
  const err = mapDbError(e, fallback, ref)
  return { ok: false, code: err.code, error: err.message }
}

/** docs/03 3.5: create draft or publish (CT-xxx-xxxx code, cash-word flag). */
export async function createItem(
  input: z.infer<typeof createItemSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId } = await requireVerified()
    await rateLimit('offers', userId) // same shape as post throttling
    const parsed = createItemSchema.safeParse(input)
    if (!parsed.success) {
      const fields: Record<string, string> = {}
      for (const i of parsed.error.issues) fields[String(i.path[0])] = i.message
      return { ok: false, code: REF.LISTING, error: 'Check the highlighted fields.', fields }
    }
    const v = parsed.data
    const code = `CT-${Math.floor(100 + Math.random() * 900)}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`
    const cash = flagCashWords(`${v.title} ${v.description ?? ''} ${v.lookingFor ?? ''}`)

    const { data, error } = await supabaseAdmin()
      .from('items')
      .insert({
        code,
        owner_id: userId,
        category_id: v.categoryId,
        title: v.title,
        description: v.description ?? null,
        condition: v.condition,
        looking_for: v.lookingFor ?? null,
        trade_type: v.tradeType,
        barangay_id: v.barangayId,
        meetup_spot_id: v.meetupSpotId || null,
        status: v.status,
        flagged: cash.length > 0,
        expires_at: v.status === 'available' ? addDays(30) : null,
      })
      .select('id')
      .single()
    if (error) return fail(error, 'Could not save the listing.', REF.LISTING)
    revalidatePath('/browse')
    return { ok: true, data: { id: data.id } }
  } catch (e) {
    const err = toActionError(e, REF.LISTING)
    return { ok: false, code: err.code, error: err.message }
  }
}

function addDays(n: number) {
  return new Date(Date.now() + n * 86_400_000).toISOString()
}

export async function updateItem(
  input: z.infer<typeof updateItemSchema>,
): Promise<ActionResult> {
  try {
    const { userId } = await requireVerified()
    const parsed = updateItemSchema.safeParse(input)
    if (!parsed.success) {
      const fields: Record<string, string> = {}
      for (const i of parsed.error.issues) fields[String(i.path[0])] = i.message
      return { ok: false, code: REF.LISTING, error: 'Check the highlighted fields.', fields }
    }
    const item = await ownedItem(parsed.data.id, userId)
    if (!item) return { ok: false, code: REF.LISTING, error: 'That listing is not yours.' }

    // status stays locked to pending while an accepted offer exists (docs/03 3.5)
    if (parsed.data.status && parsed.data.status !== 'available') {
      const locked = await hasAcceptedOffer(parsed.data.id)
      if (locked) {
        return { ok: false, code: REF.LISTING, error: 'Finish the accepted trade before changing this listing.' }
      }
    }

    const { id, ...rest } = parsed.data
    const { error } = await supabaseAdmin()
      .from('items')
      .update({
        ...(rest.title !== undefined ? { title: rest.title } : {}),
        ...(rest.description !== undefined ? { description: rest.description } : {}),
        ...(rest.categoryId !== undefined ? { category_id: rest.categoryId } : {}),
        ...(rest.condition !== undefined ? { condition: rest.condition } : {}),
        ...(rest.lookingFor !== undefined ? { looking_for: rest.lookingFor } : {}),
        ...(rest.barangayId !== undefined ? { barangay_id: rest.barangayId } : {}),
        ...(rest.meetupSpotId !== undefined
          ? { meetup_spot_id: rest.meetupSpotId || null }
          : {}),
        ...(rest.status !== undefined ? { status: rest.status } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) return fail(error, undefined, REF.LISTING)
    revalidatePath('/browse')
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.LISTING)
    return { ok: false, code: err.code, error: err.message }
  }
}

async function hasAcceptedOffer(itemId: string) {
  const { data } = await supabaseAdmin()
    .from('offers')
    .select('id')
    .or(`wanted_item_id.eq.${itemId},offered_item_id.eq.${itemId}`)
    .eq('status', 'accepted')
    .limit(1)
  return Boolean(data?.length)
}

export async function setItemStatus(
  itemId: string,
  status: 'available' | 'paused' | 'exchanged',
): Promise<ActionResult> {
  try {
    const { userId } = await requireVerified()
    const item = await ownedItem(itemId, userId)
    if (!item) return { ok: false, code: REF.LISTING, error: 'That listing is not yours.' }
    if (status !== 'exchanged' && (await hasAcceptedOffer(itemId))) {
      return { ok: false, code: REF.LISTING, error: 'Finish the accepted trade first.' }
    }
    const { error } = await supabaseAdmin()
      .from('items')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', itemId)
    if (error) return fail(error, undefined, REF.LISTING)
    revalidatePath('/browse')
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.LISTING)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function removeItem(itemId: string, reason: string): Promise<ActionResult> {
  try {
    const { userId, profile } = await requireVerified()
    const item = await ownedItem(itemId, userId)
    if (!item) return { ok: false, code: REF.LISTING, error: 'That listing is not yours.' }
    if (await hasAcceptedOffer(itemId)) {
      return { ok: false, code: REF.LISTING, error: 'Cancel the accepted trade before removing this listing.' }
    }
    const { error } = await supabaseAdmin()
      .from('items')
      .update({
        status: 'removed',
        removed_reason: reason.slice(0, 300),
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
    if (error) return fail(error, undefined, REF.LISTING)
    void profile
    revalidatePath('/browse')
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.LISTING)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function renewItem(itemId: string): Promise<ActionResult<{ expiresAt: string }>> {
  try {
    const { userId } = await requireVerified()
    const item = await ownedItem(itemId, userId)
    if (!item) return { ok: false, code: REF.LISTING, error: 'That listing is not yours.' }
    const { data, error } = await supabaseAdmin().rpc('renew_item', {
      p_item_id: itemId,
      p_requester: userId,
    })
    if (error) return fail(error, undefined, REF.LISTING)
    return { ok: true, data: { expiresAt: data as string } }
  } catch (e) {
    const err = toActionError(e, REF.LISTING)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** Photo delete + reorder (upload lives in /api/uploads/item-photos). */
export async function deleteItemPhoto(photoId: string): Promise<ActionResult> {
  try {
    const { userId } = await requireVerified()
    const { data: photo } = await supabaseAdmin()
      .from('item_photos')
      .select('id, item_id, storage_path, items!inner(owner_id)')
      .eq('id', photoId)
      .maybeSingle()
    const owner = photo ? (photo.items as unknown as { owner_id: string }).owner_id : null
    if (!photo || owner !== userId) return { ok: false, code: REF.LISTING, error: 'Not allowed.' }
    await removeFiles(BUCKETS.listingPhotos, [photo.storage_path])
    const { error } = await supabaseAdmin().from('item_photos').delete().eq('id', photoId)
    if (error) return fail(error, undefined, REF.LISTING)
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.LISTING)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function reorderItemPhotos(
  itemId: string,
  orderedPhotoIds: string[],
): Promise<ActionResult> {
  try {
    const { userId } = await requireVerified()
    const item = await ownedItem(itemId, userId)
    if (!item) return { ok: false, code: REF.LISTING, error: 'That listing is not yours.' }
    const db = supabaseAdmin()
    for (let i = 0; i < orderedPhotoIds.length; i++) {
      await db
        .from('item_photos')
        .update({ sort_order: i, is_main: i === 0 })
        .eq('id', orderedPhotoIds[i])
        .eq('item_id', itemId)
    }
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.LISTING)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** Exposed for admin flag/remove in actions/admin.ts. */
export async function adminRemoveListing(
  itemId: string,
  reason: string,
  adminId: string,
): Promise<ActionResult> {
  const { error } = await supabaseAdmin()
    .from('items')
    .update({
      status: 'removed',
      removed_reason: reason.slice(0, 300),
      removed_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
  if (error) return fail(error, undefined, REF.LISTING)
  // an accepted offer on the item: cancel the trade, return both items (docs/09 §5 T-R2)
  const { data: accepted } = await supabaseAdmin()
    .from('offers')
    .select('id, wanted_item_id, offered_item_id, to_user_id, from_user_id')
    .or(`wanted_item_id.eq.${itemId},offered_item_id.eq.${itemId}`)
    .eq('status', 'accepted')
  for (const off of accepted ?? []) {
    await supabaseAdmin()
      .from('trades')
      .update({
        status: 'cancelled',
        cancel_reason: `Listing removed: ${reason}`.slice(0, 300),
        cancelled_by: adminId,
      })
      .eq('offer_id', off.id)
      .in('status', ['meetup_pending', 'meetup_set', 'both_confirmed'])
    await supabaseAdmin().from('offers').update({ status: 'cancelled' }).eq('id', off.id)
    await supabaseAdmin()
      .from('items')
      .update({ status: 'available' })
      .in('id', [off.wanted_item_id, off.offered_item_id])
      .neq('id', itemId)
    for (const uid of [off.from_user_id, off.to_user_id]) {
      await notifyUser({
        userId: uid,
        type: 'listing_removed',
        title: 'A listing in your trade was removed',
        body: reason.slice(0, 300),
        link: '/offers',
      })
    }
  }
  await logAdminAction({
    adminId,
    action: 'listing_removed',
    subjectType: 'item',
    subjectId: itemId,
    reason: reason.slice(0, 300),
  })
  revalidatePath('/browse')
  return { ok: true }
}
