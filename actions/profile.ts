'use server'

import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getProfile, requireSignedIn } from '@/lib/auth/guards'
import { REF, toActionError } from '@/lib/errors'
import type { ActionResult } from '@/actions/onboarding'

/** docs/03 3.9: public profile via public_profiles (privacy toggles applied in
 *  the view — mobile/street never leave the server). hide_from_search hides
 *  the member from search but not a direct profile visit. */
export async function getMember(memberId: string): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const { userId } = await requireSignedIn()
    if (memberId === userId) {
      const { data } = await supabaseAdmin()
        .from('profiles')
        .select('id, full_name, email, mobile, barangay_id, street_address, bio, role, status, avatar_url, show_mobile, allow_pre_offer_msg, show_trade_count, show_barangay, show_last_active, show_usual_meetup, hide_from_search, last_active_at, approved_at, barangays(name)')
        .eq('id', userId)
        .maybeSingle()
      if (!data) return { ok: false, code: REF.AUTH, error: 'Profile not found.' }
      return { ok: true, data: { ...data, isSelf: true } }
    }

    const { data } = await supabaseAdmin()
      .from('public_profiles')
      .select('*')
      .eq('id', memberId)
      .maybeSingle()
    if (!data || data.status === 'deleted') {
      return { ok: false, code: REF.AUTH, error: 'That member no longer exists.' }
    }
    const { data: bar } = data.barangay_id
      ? await supabaseAdmin().from('barangays').select('name').eq('id', data.barangay_id as string).maybeSingle()
      : { data: null }

    // response rate: offers received that got an answer / all received
    const [{ count: received }, { count: answered }, { data: blocked }] = await Promise.all([
      supabaseAdmin().from('offers').select('id', { count: 'exact', head: true }).eq('to_user_id', memberId),
      supabaseAdmin().from('offers').select('id', { count: 'exact', head: true }).eq('to_user_id', memberId).not('responded_at', 'is', null),
      supabaseAdmin().from('blocks').select('blocked_id').eq('user_id', userId).eq('blocked_id', memberId).maybeSingle(),
    ])
    const responseRate = (received ?? 0) > 0 ? Math.round(((answered ?? 0) / (received ?? 0)) * 100) : null

    return {
      ok: true,
      data: { ...data, barangay_name: bar?.name ?? null, isSelf: false, responseRate, blockedByYou: Boolean(blocked) },
    }
  } catch (e) {
    const err = toActionError(e, REF.AUTH)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** Ratings received by a member (public table, viewer identity of raters is
 *  shown per mockup: name + avatar only). Paginated, newest first. */
export async function listMemberRatings(
  memberId: string,
  page = 1,
): Promise<ActionResult<{ rows: Array<Record<string, unknown>>; total: number; avg: number | null; page: number }>> {
  try {
    await requireSignedIn()
    const db = supabaseAdmin()
    const PAGE = 10
    const [{ data, count, error }, { data: member }] = await Promise.all([
      db
        .from('ratings')
        .select('id, stars, tags, comment, described, communication, on_time, friendly, created_at, rater_id', { count: 'exact' })
        .eq('ratee_id', memberId)
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE, page * PAGE - 1),
      db.from('public_profiles').select('avg_rating, rating_count, completed_trades').eq('id', memberId).maybeSingle(),
    ])
    if (error) throw error
    // rater mini-profiles (view embeds don't resolve through PostgREST)
    const raterIds = [...new Set((data ?? []).map((r) => r.rater_id))]
    const { data: raters } = raterIds.length
      ? await db.from('public_profiles').select('id, full_name, avatar_url').in('id', raterIds)
      : { data: [] as Array<{ id: string; full_name: string | null; avatar_url: string | null }> }
    const raterById = new Map((raters ?? []).map((r) => [r.id, r]))
    const rows = (data ?? []).map((r) => ({
      ...r,
      rater_name: raterById.get(r.rater_id)?.full_name ?? 'Member',
      rater_avatar: raterById.get(r.rater_id)?.avatar_url ?? null,
    }))
    return {
      ok: true,
      data: {
        rows,
        total: count ?? 0,
        avg: (member?.avg_rating as number | null) ?? null,
        page,
      },
    }
  } catch (e) {
    const err = toActionError(e, REF.AUTH)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** docs/02 B7: where a signed-in user lands once authentication completes —
 *  no profile yet → /onboarding, pending/suspended → /account-status,
 *  staff → /admin, verified resident → /home (C10). The sign-in form calls
 *  this after Clerk reports `status: complete` instead of always pushing
 *  /home, so a pending account never sees a guarded member route. */
export async function resolvePostAuthPath(): Promise<ActionResult<string>> {
  try {
    const { userId } = await auth()
    if (!userId) return { ok: false, code: REF.AUTH, error: 'Not signed in.' }
    const profile = await getProfile(userId)
    if (!profile) return { ok: true, data: '/onboarding' }
    if (profile.status === 'deleted') return { ok: true, data: '/' }
    if (profile.status !== 'verified') return { ok: true, data: '/account-status' }
    if (profile.role === 'admin' || profile.role === 'moderator') return { ok: true, data: '/admin' }
    return { ok: true, data: '/home' } // verified resident — C10 dashboard
  } catch (e) {
    const err = toActionError(e, REF.AUTH)
    return { ok: false, code: err.code, error: err.message }
  }
}
