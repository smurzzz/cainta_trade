'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireSignedIn } from '@/lib/auth/guards'
import { REF, toActionError } from '@/lib/errors'
import type { ActionResult } from '@/actions/onboarding'

export type DashboardData = {
  counts: {
    active: number
    drafts: number
    listingsPending: number
    offersToAnswer: number
    offersSent: number
    tradesCompleted: number
  }
  pendingOffers: Array<{
    id: string
    createdAt: string
    wantedTitle: string
    fromName: string
  }>
  activity: Array<{
    id: string
    type: string
    title: string
    body: string | null
    link: string | null
    read: boolean
    createdAt: string
  }>
  expiring: Array<{ id: string; title: string; expiresAt: string }>
}

/** docs/07 · getDashboard (V): my listing counts, offers waiting on me, recent
 *  notifications and listing health (docs/02 C10). */
export async function getDashboard(): Promise<ActionResult<DashboardData>> {
  try {
    const { userId } = await requireSignedIn()
    const db = supabaseAdmin()

    const [itemsRes, recvRes, sentCountRes, notifsRes] = await Promise.all([
      db
        .from('items')
        .select('id, title, status, expires_at')
        .eq('owner_id', userId)
        .limit(1000),
      db
        .from('offers')
        .select('id, created_at, wanted_item_id, from_user_id')
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5),
      db
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('from_user_id', userId)
        .eq('status', 'pending'),
      db
        .from('notifications')
        .select('id, type, title, body, link, read_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6),
    ])
    if (itemsRes.error) throw itemsRes.error
    const items = itemsRes.data ?? []
    const recv = recvRes.data ?? []

    const wantedIds = [...new Set(recv.map((o) => o.wanted_item_id))]
    const fromIds = [...new Set(recv.map((o) => o.from_user_id))]
    const [{ data: wanted }, { data: people }] = await Promise.all([
      db.from('items').select('id, title').in('id', wantedIds),
      db.from('public_profiles').select('id, full_name').in('id', fromIds),
    ])
    const titleOf = new Map((wanted ?? []).map((i) => [i.id, i.title]))
    const nameOf = new Map((people ?? []).map((p) => [p.id, p.full_name]))

    // completed trades that involve one of my offers
    const { data: myOffers } = await db
      .from('offers')
      .select('id')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .limit(1000)
    const myOfferIds = (myOffers ?? []).map((o) => o.id)
    const completedRes = myOfferIds.length
      ? await db
          .from('trades')
          .select('id', { count: 'exact', head: true })
          .in('offer_id', myOfferIds)
          .eq('status', 'completed')
      : { count: 0 }

    const byStatus: Record<string, number> = {}
    for (const i of items) byStatus[i.status] = (byStatus[i.status] ?? 0) + 1

    const weekOut = Date.now() + 7 * 86_400_000
    const expiring = items
      .filter(
        (i) =>
          i.status === 'available' &&
          i.expires_at &&
          new Date(i.expires_at).getTime() <= weekOut,
      )
      .slice(0, 5)
      .map((i) => ({ id: i.id, title: i.title, expiresAt: i.expires_at as string }))

    return {
      ok: true,
      data: {
        counts: {
          active: byStatus.available ?? 0,
          drafts: byStatus.draft ?? 0,
          listingsPending: byStatus.pending ?? 0,
          offersToAnswer: recvRes.count ?? recv.length,
          offersSent: sentCountRes.count ?? 0,
          tradesCompleted: completedRes.count ?? 0,
        },
        pendingOffers: recv.map((o) => ({
          id: o.id,
          createdAt: o.created_at,
          wantedTitle: titleOf.get(o.wanted_item_id) ?? 'a listing',
          fromName: nameOf.get(o.from_user_id) ?? 'A neighbour',
        })),
        activity: (notifsRes.data ?? []).map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          link: n.link,
          read: Boolean(n.read_at),
          createdAt: n.created_at,
        })),
        expiring,
      },
    }
  } catch (e) {
    const err = toActionError(e, REF.SERVER)
    return { ok: false, code: err.code, error: err.message }
  }
}
