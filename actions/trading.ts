'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireVerified } from '@/lib/auth/guards'
import {
  createOfferSchema,
  respondOfferSchema,
  updateMeetupSchema,
  confirmTradeSchema,
  disputeTradeSchema,
  rateTradeSchema,
} from '@/lib/validators/offer'
import { rateLimit } from '@/lib/ratelimit'
import { emailIfAllowed, type NotifyType } from '@/lib/notify'
import { REF, mapDbError, toActionError } from '@/lib/errors'
import type { ActionResult } from '@/actions/onboarding'

function fail(e: Parameters<typeof mapDbError>[0], ref: string = REF.OFFER) {
  const err = mapDbError(e, undefined, ref)
  return { ok: false as const, code: err.code, error: err.message }
}

/** Preference-aware email for a trade event (the SQL fns already write the
 *  in-app row — docs/03 3.8/3.13). */
async function emailParty(
  userId: string,
  type: NotifyType,
  subject: string,
  text: string,
) {
  const { data } = await supabaseAdmin()
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle()
  if (data?.email) await emailIfAllowed({ userId, type, to: data.email, subject, text })
}

export async function createOffer(
  input: unknown,
): Promise<ActionResult<{ offerId: string }>> {
  try {
    const { userId } = await requireVerified()
    await rateLimit('offers', userId)
    const parsed = createOfferSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        code: REF.OFFER,
        error: parsed.error.issues[0]?.message ?? 'Check the offer.',
      }
    }
    const v = parsed.data
    const { data, error } = await supabaseAdmin().rpc('create_offer', {
      p_wanted: v.wantedItemId,
      p_offered: v.offeredItemId,
      p_requester: userId,
      p_message: v.message ?? null,
      p_spot: v.proposedSpotId || null,
      p_proposed_at: v.proposedAt || null,
      p_flexibility: v.flexibility ?? null,
    })
    if (error) return fail(error)
    const { data: wanted } = await supabaseAdmin()
      .from('items')
      .select('title, owner_id')
      .eq('id', v.wantedItemId)
      .maybeSingle()
    if (wanted) {
      await emailParty(wanted.owner_id, 'new_offer', 'New trade offer on CaintaTrade',
        `A neighbour made an offer for your listing "${wanted.title}". Sign in to respond.`)
    }
    return { ok: true, data: { offerId: data as string } }
  } catch (e) {
    const err = toActionError(e, REF.OFFER)
    return { ok: false, code: err.code, error: err.message }
  }
}

async function respond(
  rpcName: 'accept_offer' | 'reject_offer' | 'cancel_offer',
  input: unknown,
  notifyOwner: boolean,
): Promise<ActionResult> {
  try {
    const { userId } = await requireVerified()
    const parsed = respondOfferSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: REF.OFFER, error: 'Missing offer.' }
    const args =
      rpcName === 'accept_offer'
        ? { p_offer_id: parsed.data.offerId, p_requester: userId }
        : {
            p_offer_id: parsed.data.offerId,
            p_requester: userId,
            p_reason: parsed.data.reason ?? null,
          }
    const { error } = await supabaseAdmin().rpc(rpcName, args)
    if (error) return fail(error)

    if (notifyOwner && rpcName === 'accept_offer') {
      const { data: off } = await supabaseAdmin()
        .from('offers')
        .select('from_user_id')
        .eq('id', parsed.data.offerId)
        .maybeSingle()
      if (off) {
        await emailParty(off.from_user_id, 'offer_accepted', 'Your offer was accepted',
          'Your offer was accepted — agree on a meetup place and time next.')
      }
    }
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.OFFER)
    return { ok: false, code: err.code, error: err.message }
  }
}

export const acceptOffer = async (input: unknown) => respond('accept_offer', input, true)
export const rejectOffer = async (input: unknown) => respond('reject_offer', input, false)
export const cancelOffer = async (input: unknown) => respond('cancel_offer', input, false)

export async function updateMeetup(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await requireVerified()
    const parsed = updateMeetupSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, code: REF.OFFER, error: parsed.error.issues[0]?.message ?? 'Check the meetup.' }
    }
    const { error } = await supabaseAdmin().rpc('update_meetup', {
      p_trade_id: parsed.data.tradeId,
      p_requester: userId,
      p_spot: parsed.data.spotId,
      p_at: new Date(parsed.data.at).toISOString(),
      p_note: parsed.data.note ?? null,
    })
    if (error) return fail(error)
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.OFFER)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function confirmTrade(input: unknown): Promise<ActionResult<{ completed: boolean }>> {
  try {
    const { userId } = await requireVerified()
    const parsed = confirmTradeSchema.safeParse(input)
    if (!parsed.success) return { ok: false, code: REF.OFFER, error: 'Missing trade.' }
    const { data, error } = await supabaseAdmin().rpc('confirm_trade', {
      p_trade_id: parsed.data.tradeId,
      p_requester: userId,
    })
    if (error) return fail(error)
    if (data === true) {
      const { data: tr } = await supabaseAdmin()
        .from('trades')
        .select('code, offer_id!inner(from_user_id, to_user_id)')
        .eq('id', parsed.data.tradeId)
        .maybeSingle()
      const parties = (tr?.offer_id as unknown as { from_user_id: string; to_user_id: string }) ?? null
      if (parties) {
        for (const uid of [parties.from_user_id, parties.to_user_id]) {
          await emailParty(uid, 'trade_completed', 'Trade completed!',
            'Both sides confirmed the meetup — rate your trading partner.')
        }
      }
    }
    return { ok: true, data: { completed: data === true } }
  } catch (e) {
    const err = toActionError(e, REF.OFFER)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function disputeTrade(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await requireVerified()
    const parsed = disputeTradeSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, code: REF.OFFER, error: parsed.error.issues[0]?.message ?? 'Tell us what happened.' }
    }
    const { error } = await supabaseAdmin().rpc('dispute_trade', {
      p_trade_id: parsed.data.tradeId,
      p_requester: userId,
      p_reason: parsed.data.reason,
    })
    if (error) return fail(error)
    return { ok: true }
  } catch (e) {
    const err = toActionError(e, REF.OFFER)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function rateTrade(input: unknown): Promise<ActionResult<{ ratingId: string }>> {
  try {
    const { userId } = await requireVerified()
    const parsed = rateTradeSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, code: REF.OFFER, error: parsed.error.issues[0]?.message ?? 'Check the rating.' }
    }
    const v = parsed.data
    const { data, error } = await supabaseAdmin().rpc('rate_trade', {
      p_trade_id: v.tradeId,
      p_requester: userId,
      p_stars: v.stars,
      p_comment: v.comment ?? null,
      p_tags: JSON.stringify(v.tags ?? []),
      p_described: v.described ?? null,
      p_communication: v.communication ?? null,
      p_on_time: v.onTime ?? null,
      p_friendly: v.friendly ?? null,
    })
    if (error) return fail(error)
    return { ok: true, data: { ratingId: data as string } }
  } catch (e) {
    const err = toActionError(e, REF.OFFER)
    return { ok: false, code: err.code, error: err.message }
  }
}

/* ─────────────────────── reads (docs/07) ─────────────────────── */

const OFFER_PAGE = 20

/** Offers in view: received (to me), sent (from me), closed (answered/
 *  expired/cancelled either way). Parties only. */
export async function listOffers(
  view: 'received' | 'sent' | 'closed',
  page = 1,
): Promise<ActionResult<{ rows: Array<Record<string, unknown>>; total: number; page: number; unread: number }>> {
  try {
    const { userId } = await requireVerified()
    const db = supabaseAdmin()
    let query = db.from('offers').select(
      'id, status, message, created_at, expires_at, responded_at, from_user_id, to_user_id, wanted_item_id, offered_item_id, proposed_at, flexibility',
      { count: 'exact' },
    )
    if (view === 'received') query = query.eq('to_user_id', userId).eq('status', 'pending')
    else if (view === 'sent') query = query.eq('from_user_id', userId).eq('status', 'pending')
    else
      query = query
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .neq('status', 'pending')
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * OFFER_PAGE, page * OFFER_PAGE - 1)
    if (error) throw error

    // hydrate item titles + the other party + unread message count
    const itemIds = new Set<string>()
    const partyIds = new Set<string>()
    for (const o of data ?? []) {
      itemIds.add(o.wanted_item_id)
      itemIds.add(o.offered_item_id)
      partyIds.add(o.from_user_id)
      partyIds.add(o.to_user_id)
    }
    const [{ data: items }, { data: parties }] = await Promise.all([
      itemIds.size ? db.from('items').select('id, title, status').in('id', [...itemIds]) : Promise.resolve({ data: [] }),
      partyIds.size ? db.from('public_profiles').select('id, full_name, avatar_url').in('id', [...partyIds]) : Promise.resolve({ data: [] }),
    ])
    const iTitle = new Map((items ?? []).map((i) => [i.id, i]))
    const pName = new Map((parties ?? []).map((p) => [p.id, p]))
    const offerIds = (data ?? []).map((o) => o.id)
    const { count: unread } = offerIds.length
      ? await db.from('messages')
          .select('id', { count: 'exact', head: true })
          .in('offer_id', offerIds)
          .neq('sender_id', userId)
          .is('read_at', null)
      : { count: 0 }

    const rows = (data ?? []).map((o) => ({
      ...o,
      wanted: iTitle.get(o.wanted_item_id) ?? null,
      offered: iTitle.get(o.offered_item_id) ?? null,
      from: pName.get(o.from_user_id) ?? null,
      to: pName.get(o.to_user_id) ?? null,
    }))
    return { ok: true, data: { rows, total: count ?? 0, page, unread: unread ?? 0 } }
  } catch (e) {
    const err = toActionError(e, REF.OFFER)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** One trade with its offer, parties, items and meetup details (party only). */
export async function getTrade(tradeId: string): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const { userId } = await requireVerified()
    const db = supabaseAdmin()
    const { data: trade } = await db
      .from('trades')
      .select('id, code, status, meetup_at, meetup_note, owner_confirmed_at, requester_confirmed_at, cancel_reason, completed_at, created_at, meetup_spot_id, offer_id')
      .eq('id', tradeId)
      .maybeSingle()
    if (!trade) return { ok: false, code: REF.OFFER, error: 'That trade no longer exists.' }

    const { data: offer } = await db
      .from('offers')
      .select('id, from_user_id, to_user_id, wanted_item_id, offered_item_id, message, status')
      .eq('id', trade.offer_id as string)
      .maybeSingle()
    if (!offer || (offer.from_user_id !== userId && offer.to_user_id !== userId)) {
      return { ok: false, code: REF.OFFER, error: 'That trade no longer exists.' }
    }

    const [{ data: items }, { data: parties }, { data: spot }] = await Promise.all([
      db.from('items').select('id, code, title, status, owner_id').in('id', [offer.wanted_item_id, offer.offered_item_id]),
      db.from('public_profiles').select('id, full_name, avatar_url, avg_rating, completed_trades').in('id', [offer.from_user_id, offer.to_user_id]),
      trade.meetup_spot_id ? db.from('meetup_spots').select('id, name, barangay_id').eq('id', trade.meetup_spot_id as string).maybeSingle() : Promise.resolve({ data: null }),
    ])
    const iById = new Map((items ?? []).map((i) => [i.id, i]))
    const pById = new Map((parties ?? []).map((p) => [p.id, p]))
    const { data: rating } = await db
      .from('ratings')
      .select('id, stars, rater_id')
      .eq('trade_id', tradeId)
      .in('rater_id', [offer.from_user_id, offer.to_user_id])

    return {
      ok: true,
      data: {
        ...trade,
        offer: {
          ...offer,
          from: pById.get(offer.from_user_id) ?? null,
          to: pById.get(offer.to_user_id) ?? null,
          wanted: iById.get(offer.wanted_item_id) ?? null,
          offered: iById.get(offer.offered_item_id) ?? null,
        },
        spot: spot ?? null,
        ratings: rating ?? [],
        isOwner: offer.to_user_id === userId,
      },
    }
  } catch (e) {
    const err = toActionError(e, REF.OFFER)
    return { ok: false, code: err.code, error: err.message }
  }
}
