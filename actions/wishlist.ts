'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireSignedIn } from '@/lib/auth/guards'
import { REF, mapDbError, toActionError } from '@/lib/errors'
import type { ActionResult } from '@/actions/onboarding'

/** docs/03 3.6: save/unsave wrap the save_item RPC (limit 10 pending /
 *  20 verified enforced in SQL). Owners never see who saved their item —
 *  wishlist rows are owner-only readable. */
export async function saveItem(itemId: string): Promise<ActionResult> {
  try {
    const { userId } = await requireSignedIn()
    const { error } = await supabaseAdmin().rpc('save_item', {
      p_item_id: itemId,
      p_requester: userId,
    })
    if (error) {
      const err = mapDbError(error, undefined, REF.LISTING)
      return { ok: false, code: err.code, error: err.message }
    }
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.LISTING)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function unsaveItem(itemId: string): Promise<ActionResult> {
  try {
    const { userId } = await requireSignedIn()
    const { error } = await supabaseAdmin().rpc('unsave_item', {
      p_item_id: itemId,
      p_requester: userId,
    })
    if (error) {
      const err = mapDbError(error, undefined, REF.LISTING)
      return { ok: false, code: err.code, error: err.message }
    }
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.LISTING)
    return { ok: false, code: err.code, error: err.message }
  }
}

export type WishlistRow = {
  item_id: string
  saved_at: string
  code: string | null
  title: string | null
  status: string | null
  main_photo_path: string | null
  /** change note for the UI: pending / removed / exchanged / null */
  note: 'pending' | 'removed' | 'exchanged' | null
}

/** Saved items with change notes (drafts never appear; only the caller's own
 *  wishlist is visible). */
export async function listWishlist(): Promise<ActionResult<{ rows: WishlistRow[] }>> {
  try {
    const { userId } = await requireSignedIn()
    const { data, error } = await supabaseAdmin()
      .from('wishlist')
      .select(
        'item_id, saved_at, items!inner(id, code, title, status, item_photos(sort_order, is_main, storage_path))',
      )
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })
    if (error) throw error

    const rows: WishlistRow[] = (data ?? []).map((w) => {
      const item = w.items as unknown as {
        code: string
        title: string
        status: string
        item_photos: Array<{ sort_order: number; is_main: boolean; storage_path: string }>
      } | null
      const photos = [...(item?.item_photos ?? [])].sort(
        (a, b) => Number(b.is_main) - Number(a.is_main) || a.sort_order - b.sort_order,
      )
      const status = item?.status ?? null
      const note =
        status === 'pending' ? 'pending'
        : status === 'exchanged' ? 'exchanged'
        : status === 'removed' || status === 'expired' ? 'removed'
        : null
      return {
        item_id: w.item_id,
        saved_at: w.saved_at,
        code: item?.code ?? null,
        title: item?.title ?? null,
        status,
        main_photo_path: photos[0]?.storage_path ?? null,
        note,
      }
    })
    return { ok: true, data: { rows } }
  } catch (e) {
    const err = toActionError(e, REF.LISTING)
    return { ok: false, code: err.code, error: err.message }
  }
}
