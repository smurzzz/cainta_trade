'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import {
  categorySchema,
  keywordSchema,
  announcementSchema,
  legalDocSchema,
  barangaySchema,
  meetupSpotSchema,
} from '@/lib/validators/admin'
import { logAdminAction } from '@/lib/audit'
import { REF, toActionError } from '@/lib/errors'
import { adminRemoveListing } from '@/actions/listings'
import type { ActionResult } from '@/actions/onboarding'

const PAGE = 20

function ok(): ActionResult {
  return { ok: true }
}
function bad(code: string, error: string): ActionResult {
  return { ok: false, code, error }
}

const uuid = z.string().uuid()
const listQuery = z.object({
  status: z.string().trim().max(30).optional(),
  flagged: z.coerce.boolean().optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
})

/* ─────────────────────────── 3.11 stats ─────────────────────────── */

/** docs/03 3.11: KPIs, signups vs trades by month, trades per barangay,
 *  top categories, health checks. Moderator-readable (the dashboard landing). */
export async function getAdminStats(): Promise<ActionResult<Record<string, unknown>>> {
  try {
    await requireRole('moderator')
    const db = supabaseAdmin()
    const now = new Date()
    const since = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString()
    const head = { count: 'exact' as const, head: true as const }

    const [
      usersTotal, usersPending, usersVerified, usersSuspended,
      listingsLive, tradesCompleted, reportsOpen, categoriesLive,
      profilesRes, tradesRes, itemsRes, spotsRes,
      expiringListings, expiredOffers, overdueDocs, stalledTrades,
    ] = await Promise.all([
      db.from('profiles').select('id', head).neq('status', 'deleted'),
      db.from('profiles').select('id', { ...head }).eq('status', 'pending'),
      db.from('profiles').select('id', { ...head }).eq('status', 'verified'),
      db.from('profiles').select('id', { ...head }).eq('status', 'suspended'),
      db.from('items').select('id', { ...head }).in('status', ['available', 'pending']),
      db.from('trades').select('id', { ...head }).eq('status', 'completed'),
      db.from('reports').select('id', { ...head }).in('status', ['open', 'assigned']),
      db.from('categories').select('id', { ...head }).eq('is_enabled', true),
      db.from('profiles').select('created_at').gte('created_at', since),
      db.from('trades').select('id, created_at, offer_id').gte('created_at', since),
      db.from('items').select('id, category_id').in('status', ['available', 'pending', 'exchanged']),
      db.from('meetup_spots').select('id, barangay_id'),
      db.from('items').select('id, title, expires_at').in('status', ['available', 'pending'])
        .not('expires_at', 'is', null).lt('expires_at', new Date(now.getTime() + 3 * 86_400_000).toISOString())
        .order('expires_at').limit(10),
      db.from('offers').select('id', { ...head }).eq('status', 'pending')
        .lt('expires_at', now.toISOString()),
      db.from('residency_documents').select('id', { ...head })
        .not('delete_after', 'is', null).lt('delete_after', now.toISOString()),
      db.from('trades').select('id, code, meetup_at').in('status', ['meetup_pending', 'meetup_set'])
        .lt('meetup_at', now.toISOString()).limit(20),
    ])
    for (const r of [usersTotal, usersPending, usersVerified, usersSuspended, listingsLive, tradesCompleted, reportsOpen, categoriesLive, profilesRes, tradesRes, itemsRes, spotsRes, expiringListings, expiredOffers, overdueDocs, stalledTrades]) {
      if (r.error) throw r.error
    }

    // signups vs trades by month (12 buckets)
    const monthKey = (iso: string) => iso.slice(0, 7)
    const buckets: Array<{ month: string; signups: number; trades: number }> = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, signups: 0, trades: 0 })
    }
    const index = new Map(buckets.map((b) => [b.month, b]))
    for (const p of profilesRes.data ?? []) {
      const b = index.get(monthKey(p.created_at))
      if (b) b.signups++
    }
    for (const t of tradesRes.data ?? []) {
      const b = index.get(monthKey(t.created_at))
      if (b) b.trades++
    }

    // trades per barangay: group by the listing's barangay (join via offer)
    const offerIds = (tradesRes.data ?? []).map((t) => t.offer_id)
    let byBarangay: Array<{ name: string; count: number }> = []
    if (offerIds.length) {
      const [{ data: offers }, { data: barangays }, { data: itemsB }] = await Promise.all([
        db.from('offers').select('id, wanted_item_id').in('id', offerIds),
        db.from('barangays').select('id, name'),
        db.from('items').select('id, barangay_id'),
      ])
      const bName = new Map((barangays ?? []).map((b) => [b.id, b.name]))
      const iBar = new Map((itemsB ?? []).map((i) => [i.id, i.barangay_id]))
      const counts = new Map<string, number>()
      for (const o of offers ?? []) {
        const bar = o.wanted_item_id ? iBar.get(o.wanted_item_id) : null
        const name = bar ? (bName.get(bar) ?? 'Unknown') : 'Unset'
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
      byBarangay = [...counts.entries()].map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    }

    // top categories
    const catCounts = new Map<string, number>()
    for (const i of itemsRes.data ?? []) {
      if (i.category_id) catCounts.set(i.category_id, (catCounts.get(i.category_id) ?? 0) + 1)
    }
    let topCategories: Array<{ name: string; count: number }> = []
    if (catCounts.size) {
      const { data: cats } = await db.from('categories').select('id, name').in('id', [...catCounts.keys()])
      const cName = new Map((cats ?? []).map((c) => [c.id, c.name]))
      topCategories = [...catCounts.entries()]
        .map(([id, count]) => ({ name: cName.get(id) ?? 'Unknown', count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
    }

    const pendingOverdue = await db.from('profiles').select('id', { ...head })
      .eq('status', 'pending')
      .lt('onboarded_at', new Date(now.getTime() - 24 * 3600_000).toISOString())

    const health = [
      { key: 'overdue_approvals', label: 'Approvals pending > 24 h', count: pendingOverdue.count ?? 0, ok: (pendingOverdue.count ?? 0) === 0 },
      { key: 'expiring_listings', label: 'Listings expiring in 3 days', count: expiringListings.data?.length ?? 0, ok: !(expiringListings.data?.length) },
      { key: 'expired_offers', label: 'Offers past expiry still pending', count: expiredOffers.count ?? 0, ok: (expiredOffers.count ?? 0) === 0 },
      { key: 'retention_docs', label: 'Residency docs past delete_after', count: overdueDocs.count ?? 0, ok: (overdueDocs.count ?? 0) === 0 },
      { key: 'stalled_trades', label: 'Trades past meetup time unconfirmed', count: stalledTrades.data?.length ?? 0, ok: !(stalledTrades.data?.length) },
    ]

    return {
      ok: true,
      data: {
        kpis: {
          users: usersTotal.count ?? 0,
          usersPending: usersPending.count ?? 0,
          usersVerified: usersVerified.count ?? 0,
          usersSuspended: usersSuspended.count ?? 0,
          listingsLive: listingsLive.count ?? 0,
          tradesCompleted: tradesCompleted.count ?? 0,
          reportsOpen: reportsOpen.count ?? 0,
          categoriesLive: categoriesLive.count ?? 0,
        },
        monthly: buckets,
        byBarangay,
        topCategories,
        health,
        expiring: expiringListings.data ?? [],
        stalledTrades: stalledTrades.data ?? [],
      },
    }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

/* ─────────────────────── listings moderation ─────────────────────── */

export async function listAdminListings(input: unknown): Promise<
  ActionResult<{ rows: Array<Record<string, unknown>>; total: number; page: number }>
> {
  try {
    await requireRole('moderator')
    const parsed = listQuery.safeParse(input ?? {})
    if (!parsed.success) return bad(REF.ADMIN, 'Bad query.')
    const q = parsed.data
    let query = supabaseAdmin()
      .from('items')
      .select('id, code, title, status, flagged, views_count, expires_at, created_at, owner_id, category_id, barangay_id, removed_reason, profiles!items_owner_id_fkey(full_name, email), categories(name), item_photos(id)', { count: 'exact' })
    if (q.status) query = query.eq('status', q.status)
    if (q.flagged) query = query.eq('flagged', true)
    if (q.q) query = query.or(`title.ilike.%${q.q}%,code.ilike.%${q.q}%`)
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((q.page - 1) * PAGE, q.page * PAGE - 1)
    if (error) throw error
    return { ok: true, data: { rows: data ?? [], total: count ?? 0, page: q.page } }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function flagListing(input: unknown): Promise<ActionResult> {
  try {
    const { userId: adminId } = await requireRole('moderator')
    const parsed = z.object({ itemId: uuid, flagged: z.boolean() }).safeParse(input)
    if (!parsed.success) return bad(REF.ADMIN, 'Missing listing.')
    const { error } = await supabaseAdmin()
      .from('items')
      .update({ flagged: parsed.data.flagged, updated_at: new Date().toISOString() })
      .eq('id', parsed.data.itemId)
    if (error) throw error
    await logAdminAction({
      adminId,
      action: parsed.data.flagged ? 'listing_flagged' : 'listing_unflagged',
      subjectType: 'item',
      subjectId: parsed.data.itemId,
    })
    return ok()
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** removeListing: admin wrapper around listings.adminRemoveListing (cancels an
 *  accepted trade, returns both items, notifies both parties, audits). */
export async function removeListing(input: unknown): Promise<ActionResult> {
  try {
    const { userId: adminId } = await requireRole('moderator')
    const parsed = z.object({ itemId: uuid, reason: z.string().trim().min(5, 'Give a reason.').max(300) }).safeParse(input)
    if (!parsed.success) return bad(REF.ADMIN, parsed.error.issues[0]?.message ?? 'Give a reason.')
    const result = await adminRemoveListing(parsed.data.itemId, parsed.data.reason, adminId)
    if (result.ok) revalidatePath('/admin')
    return result
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

/* ───────────────────────── trades moderation ───────────────────────── */

export async function listAdminTrades(input: unknown): Promise<ActionResult<Record<string, unknown>>> {
  try {
    await requireRole('moderator')
    const parsed = z.object({
      status: z.string().trim().max(30).optional(),
      page: z.coerce.number().int().min(1).default(1),
    }).safeParse(input ?? {})
    if (!parsed.success) return bad(REF.ADMIN, 'Bad query.')
    const db = supabaseAdmin()
    const q = parsed.data

    // funnel + cancellation reasons (full scan, small table)
    const [allRes, reasonRes] = await Promise.all([
      db.from('trades').select('id, status, cancel_reason'),
      db.from('trades').select('cancel_reason').eq('status', 'cancelled').not('cancel_reason', 'is', null),
    ])
    if (allRes.error) throw allRes.error
    if (reasonRes.error) throw reasonRes.error
    const funnel = new Map<string, number>()
    for (const t of allRes.data ?? []) funnel.set(t.status, (funnel.get(t.status) ?? 0) + 1)
    const cancelReasons = new Map<string, number>()
    for (const t of reasonRes.data ?? []) {
      const key = (t.cancel_reason ?? '').slice(0, 60) || 'Unspecified'
      cancelReasons.set(key, (cancelReasons.get(key) ?? 0) + 1)
    }

    let query = db
      .from('trades')
      .select('id, code, status, meetup_at, created_at, completed_at, cancel_reason, offer_id, meetup_spot_id, offers!inner(from_user_id, to_user_id, wanted_item_id, offered_item_id, message)')
    if (q.status) query = query.eq('status', q.status)
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range((q.page - 1) * PAGE, q.page * PAGE - 1)
    if (error) throw error

    const partyIds = new Set<string>()
    const itemIds = new Set<string>()
    for (const t of data ?? []) {
      const off = Array.isArray(t.offers) ? t.offers[0] : t.offers
      if (!off) continue
      partyIds.add(off.from_user_id)
      partyIds.add(off.to_user_id)
      itemIds.add(off.wanted_item_id)
      itemIds.add(off.offered_item_id)
    }
    const [{ data: profiles }, { data: items }] = await Promise.all([
      partyIds.size ? db.from('profiles').select('id, full_name').in('id', [...partyIds]) : Promise.resolve({ data: [] }),
      itemIds.size ? db.from('items').select('id, title').in('id', [...itemIds]) : Promise.resolve({ data: [] }),
    ])
    const pName = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? 'Member']))
    const iTitle = new Map((items ?? []).map((i) => [i.id, i.title]))

    const rows = (data ?? []).map((t) => {
      const off = Array.isArray(t.offers) ? t.offers[0] : t.offers
      return {
        ...t,
        offers: off ?? null,
        from_name: pName.get(off?.from_user_id) ?? 'Member',
        to_name: pName.get(off?.to_user_id) ?? 'Member',
        wanted_title: iTitle.get(off?.wanted_item_id) ?? '—',
        offered_title: iTitle.get(off?.offered_item_id) ?? '—',
      }
    })

    return {
      ok: true,
      data: {
        rows,
        page: q.page,
        funnel: Object.fromEntries(funnel),
        cancelReasons: [...cancelReasons.entries()].map(([reason, count]) => ({ reason, count })),
      },
    }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

/* ──────────────── reference data CRUD (admin-only) ──────────────── */

async function adminWrite(
  adminId: string,
  action: string,
  subjectType: string,
  subjectId: string,
  run: () => PromiseLike<{ error: { message: string; code?: string } | null }>,
): Promise<ActionResult> {
  const { error } = await run()
  if (error) {
    if (error.code === '23503') return bad(REF.ADMIN, 'That record is still in use and cannot be deleted.')
    if (error.code === '23505') return bad(REF.ADMIN, 'That already exists.')
    throw error
  }
  await logAdminAction({ adminId, action, subjectType, subjectId })
  revalidatePath('/admin')
  return ok()
}

export async function saveCategory(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId: adminId } = await requireRole('admin')
    const parsed = categorySchema.safeParse(input)
    if (!parsed.success) return bad(REF.ADMIN, parsed.error.issues[0]?.message ?? 'Check the category.')
    const v = parsed.data
    const row = {
      name: v.name,
      parent_id: v.parentId || null,
      sort_order: v.sortOrder,
      is_enabled: v.isEnabled,
    }
    const db = supabaseAdmin()
    if (v.id) {
      const r = await adminWrite(adminId, 'category_updated', 'category', v.id, () =>
        db.from('categories').update(row).eq('id', v.id).select('id').single().then((x) => ({ error: x.error })),
      )
      return r.ok ? { ok: true, data: { id: v.id } } : r
    }
    const { data, error } = await db.from('categories').insert(row).select('id').single()
    if (error) throw error
    await logAdminAction({ adminId, action: 'category_created', subjectType: 'category', subjectId: data.id })
    revalidatePath('/admin')
    return { ok: true, data: { id: data.id } }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function reorderCategories(input: unknown): Promise<ActionResult> {
  try {
    const { userId: adminId } = await requireRole('admin')
    const parsed = z.object({
      items: z.array(z.object({ id: uuid, sortOrder: z.coerce.number().int().min(0).max(9999) })).min(1).max(100),
    }).safeParse(input)
    if (!parsed.success) return bad(REF.ADMIN, 'Bad reorder payload.')
    const db = supabaseAdmin()
    for (const it of parsed.data.items) {
      const { error } = await db.from('categories').update({ sort_order: it.sortOrder }).eq('id', it.id)
      if (error) throw error
    }
    await logAdminAction({ adminId, action: 'categories_reordered', subjectType: 'category', subjectId: 'bulk' })
    revalidatePath('/admin')
    return ok()
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** Delete only when empty: no items reference it and it has no children. */
export async function deleteCategory(input: unknown): Promise<ActionResult> {
  try {
    const { userId: adminId } = await requireRole('admin')
    const parsed = z.object({ id: uuid }).safeParse(input)
    if (!parsed.success) return bad(REF.ADMIN, 'Missing category.')
    const db = supabaseAdmin()
    const [{ count: items }, { count: children }] = await Promise.all([
      db.from('items').select('id', { count: 'exact', head: true }).eq('category_id', parsed.data.id),
      db.from('categories').select('id', { count: 'exact', head: true }).eq('parent_id', parsed.data.id),
    ])
    if ((items ?? 0) > 0 || (children ?? 0) > 0) {
      return bad(REF.ADMIN, 'Move or remove the listings and subcategories in this category first.')
    }
    return adminWrite(adminId, 'category_deleted', 'category', parsed.data.id, () =>
      db.from('categories').delete().eq('id', parsed.data.id).then((x) => ({ error: x.error })),
    )
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function saveKeyword(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId: adminId } = await requireRole('admin')
    const parsed = keywordSchema.safeParse(input)
    if (!parsed.success) return bad(REF.ADMIN, parsed.error.issues[0]?.message ?? 'Check the keyword.')
    const v = parsed.data
    const row = { word: v.word.toLowerCase(), action: v.action, is_enabled: v.isEnabled }
    const db = supabaseAdmin()
    if (v.id) {
      const r = await adminWrite(adminId, 'keyword_updated', 'keyword', v.id, () =>
        db.from('prohibited_keywords').update(row).eq('id', v.id).select('id').single().then((x) => ({ error: x.error })),
      )
      return r.ok ? { ok: true, data: { id: v.id } } : r
    }
    const { data, error } = await db.from('prohibited_keywords').insert(row).select('id').single()
    if (error) throw error
    await logAdminAction({ adminId, action: 'keyword_created', subjectType: 'keyword', subjectId: data.id })
    revalidatePath('/admin')
    return { ok: true, data: { id: data.id } }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function deleteKeyword(input: unknown): Promise<ActionResult> {
  try {
    const { userId: adminId } = await requireRole('admin')
    const parsed = z.object({ id: uuid }).safeParse(input)
    if (!parsed.success) return bad(REF.ADMIN, 'Missing keyword.')
    const db = supabaseAdmin()
    return adminWrite(adminId, 'keyword_deleted', 'keyword', parsed.data.id, () =>
      db.from('prohibited_keywords').delete().eq('id', parsed.data.id).then((x) => ({ error: x.error })),
    )
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function saveBarangay(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId: adminId } = await requireRole('admin')
    const parsed = barangaySchema.safeParse(input)
    if (!parsed.success) return bad(REF.ADMIN, parsed.error.issues[0]?.message ?? 'Check the barangay.')
    const v = parsed.data
    const row = { name: v.name, description: v.description || null, is_enabled: v.isEnabled }
    const db = supabaseAdmin()
    if (v.id) {
      const r = await adminWrite(adminId, 'barangay_updated', 'barangay', v.id, () =>
        db.from('barangays').update(row).eq('id', v.id).select('id').single().then((x) => ({ error: x.error })),
      )
      return r.ok ? { ok: true, data: { id: v.id } } : r
    }
    const { data, error } = await db.from('barangays').insert(row).select('id').single()
    if (error) throw error
    await logAdminAction({ adminId, action: 'barangay_created', subjectType: 'barangay', subjectId: data.id })
    revalidatePath('/admin')
    return { ok: true, data: { id: data.id } }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function deleteBarangay(input: unknown): Promise<ActionResult> {
  try {
    const { userId: adminId } = await requireRole('admin')
    const parsed = z.object({ id: uuid }).safeParse(input)
    if (!parsed.success) return bad(REF.ADMIN, 'Missing barangay.')
    const db = supabaseAdmin()
    const [{ count: profiles }, { count: items }] = await Promise.all([
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('barangay_id', parsed.data.id),
      db.from('items').select('id', { count: 'exact', head: true }).eq('barangay_id', parsed.data.id),
    ])
    if ((profiles ?? 0) > 0 || (items ?? 0) > 0) {
      return bad(REF.ADMIN, 'Members or listings still use this barangay.')
    }
    return adminWrite(adminId, 'barangay_deleted', 'barangay', parsed.data.id, () =>
      db.from('barangays').delete().eq('id', parsed.data.id).then((x) => ({ error: x.error })),
    )
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function saveMeetupSpot(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId: adminId } = await requireRole('admin')
    const parsed = meetupSpotSchema.safeParse(input)
    if (!parsed.success) return bad(REF.ADMIN, parsed.error.issues[0]?.message ?? 'Check the spot.')
    const v = parsed.data
    const row = { name: v.name, barangay_id: v.barangayId, flag: v.flag || null, is_enabled: v.isEnabled }
    const db = supabaseAdmin()
    if (v.id) {
      const r = await adminWrite(adminId, 'meetup_spot_updated', 'meetup_spot', v.id, () =>
        db.from('meetup_spots').update(row).eq('id', v.id).select('id').single().then((x) => ({ error: x.error })),
      )
      return r.ok ? { ok: true, data: { id: v.id } } : r
    }
    const { data, error } = await db.from('meetup_spots').insert(row).select('id').single()
    if (error) throw error
    await logAdminAction({ adminId, action: 'meetup_spot_created', subjectType: 'meetup_spot', subjectId: data.id })
    revalidatePath('/admin')
    return { ok: true, data: { id: data.id } }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function deleteMeetupSpot(input: unknown): Promise<ActionResult> {
  try {
    const { userId: adminId } = await requireRole('admin')
    const parsed = z.object({ id: uuid }).safeParse(input)
    if (!parsed.success) return bad(REF.ADMIN, 'Missing spot.')
    const db = supabaseAdmin()
    const [{ count: used }] = await Promise.all([
      db.from('items').select('id', { count: 'exact', head: true }).eq('meetup_spot_id', parsed.data.id),
    ])
    if ((used ?? 0) > 0) return bad(REF.ADMIN, 'Listings still reference this meetup spot.')
    return adminWrite(adminId, 'meetup_spot_deleted', 'meetup_spot', parsed.data.id, () =>
      db.from('meetup_spots').delete().eq('id', parsed.data.id).then((x) => ({ error: x.error })),
    )
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function saveAnnouncement(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId: adminId } = await requireRole('admin')
    const parsed = announcementSchema.safeParse(input)
    if (!parsed.success) return bad(REF.ADMIN, parsed.error.issues[0]?.message ?? 'Check the announcement.')
    const v = parsed.data
    const row = {
      title: v.title,
      body: v.body,
      is_enabled: v.isEnabled,
      starts_at: v.startsAt || null,
      ends_at: v.endsAt || null,
    }
    const db = supabaseAdmin()
    if (v.id) {
      const r = await adminWrite(adminId, 'announcement_updated', 'announcement', v.id, () =>
        db.from('announcements').update(row).eq('id', v.id).select('id').single().then((x) => ({ error: x.error })),
      )
      return r.ok ? { ok: true, data: { id: v.id } } : r
    }
    const { data, error } = await db.from('announcements').insert({ ...row, created_by: adminId }).select('id').single()
    if (error) throw error
    await logAdminAction({ adminId, action: 'announcement_created', subjectType: 'announcement', subjectId: data.id })
    revalidatePath('/admin')
    return { ok: true, data: { id: data.id } }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

export async function deleteAnnouncement(input: unknown): Promise<ActionResult> {
  try {
    const { userId: adminId } = await requireRole('admin')
    const parsed = z.object({ id: uuid }).safeParse(input)
    if (!parsed.success) return bad(REF.ADMIN, 'Missing announcement.')
    const db = supabaseAdmin()
    return adminWrite(adminId, 'announcement_deleted', 'announcement', parsed.data.id, () =>
      db.from('announcements').delete().eq('id', parsed.data.id).then((x) => ({ error: x.error })),
    )
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** Legal documents are append-only versions (unique type+version). */
export async function saveLegalDoc(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId: adminId } = await requireRole('admin')
    const parsed = legalDocSchema.safeParse(input)
    if (!parsed.success) return bad(REF.ADMIN, parsed.error.issues[0]?.message ?? 'Check the document.')
    const v = parsed.data
    const { data, error } = await supabaseAdmin()
      .from('legal_documents')
      .insert({
        type: v.type,
        version: v.version,
        effective_date: v.effectiveDate,
        body: v.body,
        created_by: adminId,
      })
      .select('id')
      .single()
    if (error) {
      if (error.code === '23505') return bad(REF.ADMIN, 'That version already exists — bump the version number.')
      throw error
    }
    await logAdminAction({ adminId, action: 'legal_published', subjectType: 'legal_document', subjectId: data.id, ruleRef: `${v.type}@${v.version}` })
    revalidatePath('/admin')
    return { ok: true, data: { id: data.id } }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

/* ───────────────────────────── audit ───────────────────────────── */

const auditQuery = z.object({
  action: z.string().trim().max(60).optional(),
  adminId: z.string().trim().max(64).optional(),
  subjectType: z.string().trim().max(40).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
})

function auditFilter(input: unknown) {
  const parsed = auditQuery.safeParse(input ?? {})
  if (!parsed.success) return null
  const q = parsed.data
  let query = supabaseAdmin().from('admin_actions').select('*', { count: 'exact' })
  if (q.action) query = query.ilike('action', `%${q.action}%`)
  if (q.adminId) query = query.eq('admin_id', q.adminId)
  if (q.subjectType) query = query.eq('subject_type', q.subjectType)
  if (q.from) query = query.gte('created_at', q.from)
  if (q.to) query = query.lte('created_at', q.to)
  return { query, q }
}

export async function listAudit(input: unknown): Promise<
  ActionResult<{ rows: Array<Record<string, unknown>>; total: number; page: number }>
> {
  try {
    await requireRole('admin')
    const built = auditFilter(input)
    if (!built) return bad(REF.ADMIN, 'Bad query.')
    const { data, count, error } = await built.query
      .order('created_at', { ascending: false })
      .range((built.q.page - 1) * PAGE, built.q.page * PAGE - 1)
    if (error) throw error
    return { ok: true, data: { rows: data ?? [], total: count ?? 0, page: built.q.page } }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}

/** CSV export of the audit log (admin-only, read-only). */
export async function exportAuditCsv(input: unknown): Promise<ActionResult<{ csv: string }>> {
  try {
    await requireRole('admin')
    const built = auditFilter(input)
    if (!built) return bad(REF.ADMIN, 'Bad query.')
    const { data, error } = await built.query
      .order('created_at', { ascending: false })
      .limit(5000)
    if (error) throw error
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = ['created_at,admin_id,action,subject_type,subject_id,rule_ref,reason']
    for (const r of data ?? []) {
      lines.push([r.created_at, r.admin_id, r.action, r.subject_type, r.subject_id, r.rule_ref, r.reason].map(esc).join(','))
    }
    return { ok: true, data: { csv: lines.join('\n') } }
  } catch (e) {
    const err = toActionError(e, REF.ADMIN)
    return { ok: false, code: err.code, error: err.message }
  }
}
