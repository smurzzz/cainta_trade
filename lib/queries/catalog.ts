import 'server-only'
import { cache } from 'react'
import { supabaseUser } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { photoUrl } from '@/lib/photos'
import { timeAgo } from '@/lib/time'

export { photoUrl, timeAgo }

/** docs/07 · catalog reads: listItems (FTS + filters + facets), getItem
 *  (detail + owner mini-profile + spots + similar), getMyListings.
 *
 *  Public reads use the anon client with NO Clerk bearer (docs/05): RLS
 *  `items_public_select` and the public views expose exactly what guests may
 *  see. getMyListings runs the service client — callers guard first. */

export type Facet = { key: string; label: string; n: number }

export type BrowseCard = {
  id: string
  code: string
  title: string
  status: string // 'Available' | 'Pending' | 'Exchanged' | 'Paused' | 'Expired'
  statusKey: string // raw enum value
  category: string
  barangay: string
  owner: string
  ownerAvatar: string
  time: string // "2d ago"
  lookingFor: string
  photo: string | null
  photoLabel: string
  views: number
  saveCount: number
}

export type ListItemsInput = {
  q?: string | null
  category?: string | null // category name ("Furniture") or slug ("books-school")
  barangay?: string | null // barangay name or slug
  condition?: string | null // enum ("like_new") or label ("Like new")
  includeExchanged?: boolean
  since?: 'day' | 'week' | null // posted within the last 24 h / 7 d
  sort?: 'newest' | 'views' | 'saves' | null
  page?: number
  pageSize?: number
}

export type ListItemsResult = {
  items: BrowseCard[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  /** echo of the filters that produced this page (drives the UI controls) */
  applied: {
    q: string
    category: string | null
    barangay: string | null
    condition: string | null
    includeExchanged: boolean
    since: 'day' | 'week' | null
    sort: 'newest' | 'views' | 'saves'
    page: number
  }
  facets: {
    categories: Facet[]
    barangays: Facet[]
    conditions: Facet[]
    exchanged: number
  }
}

/* ── helpers ───────────────────────────────────────────────────────────── */

const CONDITION_LABELS: Record<string, string> = {
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
  for_repair: 'For repair',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  available: 'Available',
  pending: 'Pending',
  exchanged: 'Exchanged',
  removed: 'Removed',
  expired: 'Expired',
  paused: 'Paused',
}

const TRADE_LABELS: Record<string, string> = {
  item_for_item: 'Item for item',
  multiple_smaller: 'Multiple smaller items',
}

export function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function statusLabel(key: string) {
  return STATUS_LABELS[key] ?? key
}

export function conditionLabel(key: string) {
  return CONDITION_LABELS[key] ?? key
}

export function tradeTypeLabel(key: string) {
  return TRADE_LABELS[key] ?? key
}

// photoUrl/timeAgo live in client-safe modules (lib/photos, lib/time) and are
// re-exported above so server callers keep one import site; client components
// import those modules directly (this file is server-only).

function avatarFor(id: string, url: string | null | undefined) {
  if (url) return url
  const n = (id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 3) + 1
  return `/assets/avatar-${n}.svg`
}

function firstName(full: string | null | undefined) {
  if (!full) return 'A neighbour'
  return full.split(/\s+/)[0] ?? full
}

function normalizeCondition(input: string) {
  const raw = input.toLowerCase().replace(/[-\s]+/g, '_')
  if (raw in CONDITION_LABELS) return raw
  const byLabel = Object.entries(CONDITION_LABELS).find(([, l]) => l.toLowerCase() === input.toLowerCase())
  return byLabel?.[0] ?? '__none__'
}

/** Sanitised keyword for the ILIKE fallback (PostgREST or= cannot take
 *  commas/parentheses). */
function ilikeNeedle(q: string) {
  return q.replace(/[%_,()\\]/g, ' ').trim().slice(0, 80)
}

/** Apply keyword search: websearch FTS on the generated `search` column with
 *  an ILIKE fallback if the PostgREST instance lacks the websearch operator. */
async function runSearch<T>(
  make: (useFts: boolean) => { query: PromiseLike<{ data: T | null; error: unknown; count?: number | null }> },
  q: string,
) {
  const hasQ = /\w/.test(q)
  if (!hasQ) return make(false).query
  const first = await make(true).query
  if (!first.error) return first
  return make(false).query
}

/* ── listItems ─────────────────────────────────────────────────────────── */

export async function listItems(input: ListItemsInput = {}): Promise<ListItemsResult> {
  const db = supabaseUser()
  const pageSize = Math.min(Math.max(input.pageSize ?? 12, 1), 48)
  const page = Math.max(1, Math.floor(input.page ?? 1))
  const q = (input.q ?? '').trim()
  const hasQ = /\w/.test(q)
  const statuses = input.includeExchanged
    ? ['available', 'pending', 'exchanged']
    : ['available', 'pending']

  // lookup tables for facet labels + filter resolution
  const [catsRes, brgyRes] = await Promise.all([
    db.from('categories').select('id, name, parent_id, sort_order').order('sort_order'),
    db.from('barangays').select('id, name').order('name'),
  ])
  const categories = (catsRes.data ?? []) as Array<{ id: string; name: string; parent_id: string | null; sort_order: number }>
  const barangays = (brgyRes.data ?? []) as Array<{ id: string; name: string }>

  // category filter matches name or slug, then includes child categories
  let categoryIds: string[] | null = null
  if (input.category) {
    const needle = input.category.toLowerCase()
    const roots = categories
      .filter((c) => c.name.toLowerCase() === needle || slug(c.name) === needle)
      .map((c) => c.id)
    if (roots.length) {
      categoryIds = categories
        .filter((c) => roots.includes(c.id) || (c.parent_id && roots.includes(c.parent_id)))
        .map((c) => c.id)
    } else {
      categoryIds = []
    }
  }

  const barangayId = input.barangay
    ? (barangays.find(
        (b) => b.name.toLowerCase() === input.barangay!.toLowerCase() || slug(b.name) === slug(input.barangay!),
      )?.id ?? '__none__')
    : null

  const condition = input.condition ? normalizeCondition(input.condition) : null
  const sinceCutoff =
    input.since === 'day'
      ? new Date(Date.now() - 86_400_000).toISOString()
      : input.since === 'week'
        ? new Date(Date.now() - 7 * 86_400_000).toISOString()
        : null

  // ── facet rows: q + status only (facet counts stay useful while the user
  //    narrows other dimensions) ────────────────────────────────────────────
  const facetRes = await runSearch<Array<{ id: string; category_id: string | null; barangay_id: string | null; condition: string; status: string }>>(
    (fts) => {
      let b = db.from('items').select('id, category_id, barangay_id, condition, status').in('status', ['available', 'pending', 'exchanged'])
      if (fts && hasQ) b = b.textSearch('search', q, { config: 'english', type: 'websearch' })
      else if (!fts && hasQ) b = b.or(`title.ilike.%${ilikeNeedle(q)}%,description.ilike.%${ilikeNeedle(q)}%`)
      return { query: b.limit(10_000) }
    },
    q,
  )
  const facetRows = facetRes.data ?? []

  // top-level category = walk parent chain
  const rootOf = new Map<string, string>()
  for (const c of categories) {
    let node = c
    while (node.parent_id) {
      const parent = categories.find((p) => p.id === node.parent_id)
      if (!parent) break
      node = parent
    }
    rootOf.set(c.id, node.id)
  }

  const catCount = new Map<string, number>()
  const brgyCount = new Map<string, number>()
  const condCount = new Map<string, number>()
  let exchanged = 0
  for (const r of facetRows) {
    if (r.status === 'exchanged') exchanged++
    if (r.category_id) {
      const root = rootOf.get(r.category_id) ?? r.category_id
      catCount.set(root, (catCount.get(root) ?? 0) + 1)
    }
    if (r.barangay_id) brgyCount.set(r.barangay_id, (brgyCount.get(r.barangay_id) ?? 0) + 1)
    condCount.set(r.condition, (condCount.get(r.condition) ?? 0) + 1)
  }

  const facets = {
    categories: categories
      .filter((c) => !c.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({ key: slug(c.name), label: c.name, n: catCount.get(c.id) ?? 0 })),
    barangays: barangays.map((b) => ({ key: slug(b.name), label: b.name, n: brgyCount.get(b.id) ?? 0 })),
    conditions: Object.entries(CONDITION_LABELS).map(([key, label]) => ({
      key,
      label,
      n: condCount.get(key) ?? 0,
    })),
    exchanged,
  }

  // ── result ids (FTS + every filter + sort + pagination + total) ─────────
  const idRes = await runSearch<Array<{ id: string; views_count: number; created_at: string }>>(
    (fts) => {
      let b = db.from('items').select('id, views_count, created_at', { count: 'exact' }).in('status', statuses)
      if (categoryIds) b = b.in('category_id', categoryIds)
      if (barangayId) b = b.eq('barangay_id', barangayId)
      if (condition) b = b.eq('condition', condition)
      if (sinceCutoff) b = b.gte('created_at', sinceCutoff)
      if (fts && hasQ) b = b.textSearch('search', q, { config: 'english', type: 'websearch' })
      else if (!fts && hasQ) b = b.or(`title.ilike.%${ilikeNeedle(q)}%,description.ilike.%${ilikeNeedle(q)}%`)
      if (input.sort === 'views') b = b.order('views_count', { ascending: false }).order('created_at', { ascending: false })
      else b = b.order('created_at', { ascending: false }).order('id', { ascending: true })
      return { query: b.range((page - 1) * pageSize, page * pageSize - 1) }
    },
    q,
  )
  if (idRes.error) {
    const msg = (idRes.error as { message?: string })?.message ?? 'Search failed.'
    throw new Error(`listItems: ${msg}`)
  }
  const total = idRes.count ?? 0
  const ids = (idRes.data ?? []).map((r) => r.id)

  // ── hydrate display rows via the public view (names, main photo, saves)
  const rowsById = new Map<string, Record<string, unknown>>()
  const ownersById = new Map<string, Record<string, unknown>>()
  if (ids.length) {
    const pubRes = await db.from('public_items').select('*').in('id', ids)
    if (pubRes.error) {
      const msg = (pubRes.error as { message?: string }).message ?? 'Failed to load items.'
      throw new Error(`listItems: ${msg}`)
    }
    for (const row of (pubRes.data ?? []) as Array<Record<string, unknown>>) {
      rowsById.set(row.id as string, row)
    }
    const ownerIds = [...new Set([...rowsById.values()].map((r) => r.owner_id as string))]
    if (ownerIds.length) {
      const owners = await db.from('public_profiles').select('id, full_name, avatar_url').in('id', ownerIds)
      for (const o of (owners.data ?? []) as Array<Record<string, unknown>>) ownersById.set(o.id as string, o)
    }
  }

  const items: BrowseCard[] = ids
    .map((id) => rowsById.get(id))
    .filter((r): r is Record<string, unknown> => Boolean(r))
    .map((r) => {
      const owner = ownersById.get(r.owner_id as string)
      return {
        id: r.id as string,
        code: r.code as string,
        title: r.title as string,
        status: statusLabel(r.status as string),
        statusKey: r.status as string,
        category: (r.category_name as string | null) ?? 'Other',
        barangay: (r.barangay_name as string | null) ?? 'Cainta',
        owner: firstName(owner?.full_name as string | null),
        ownerAvatar: avatarFor(r.owner_id as string, owner?.avatar_url as string | null),
        time: timeAgo(r.created_at as string),
        lookingFor: (r.looking_for as string | null) ?? '',
        photo: photoUrl(r.main_photo_path as string | null),
        photoLabel: r.title as string,
        views: (r.views_count as number) ?? 0,
        saveCount: (r.save_count as number) ?? 0,
      }
    })

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    applied: {
      q,
      category: input.category ?? null,
      barangay: input.barangay ?? null,
      condition: input.condition ?? null,
      includeExchanged: Boolean(input.includeExchanged),
      since: input.since ?? null,
      sort: input.sort ?? 'newest',
      page,
    },
    facets,
  }
}

/* ── getItem ───────────────────────────────────────────────────────────── */

export type ItemDetail = {
  id: string
  code: string
  title: string
  status: string
  statusKey: string
  category: string
  categoryId: string | null
  barangay: string
  condition: string
  tradeType: string
  description: string
  lookingFor: string
  views: number
  saveCount: number
  createdAt: string
  photos: string[]
  owner: {
    id: string
    name: string
    avatar: string
    barangay: string | null
    memberSince: string | null
    avgRating: number | null
    ratingCount: number
    completedTrades: number
    bio: string | null
  } | null
  similar: BrowseCard[]
  spots: Array<{ name: string; meta: string }>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Detail fetch, React-cached so generateMetadata and the page share one
 *  round trip per request. */
export const getItem = cache(async (idOrCode: string): Promise<ItemDetail | null> => {
  const db = supabaseUser()
  if (!idOrCode) return null

  const itemQuery = UUID_RE.test(idOrCode)
    ? db.from('public_items').select('*').eq('id', idOrCode).maybeSingle()
    : db.from('public_items').select('*').eq('code', idOrCode).maybeSingle()
  const { data: item } = await itemQuery
  if (!item) return null

  const [photosRes, ownerRes, catRes, brgyRes, similarRes, spotsRes, allBrgys] = await Promise.all([
    db.from('item_photos').select('storage_path, sort_order, is_main').eq('item_id', item.id).order('is_main', { ascending: false }).order('sort_order'),
    db
      .from('public_profiles')
      .select('id, full_name, avatar_url, barangay_id, avg_rating, rating_count, completed_trades, bio, approved_at')
      .eq('id', item.owner_id)
      .maybeSingle(),
    item.category_id
      ? db.from('categories').select('id, name').eq('id', item.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
    item.barangay_id
      ? db.from('barangays').select('id, name').eq('id', item.barangay_id).maybeSingle()
      : Promise.resolve({ data: null }),
    item.category_id
      ? db
          .from('public_items')
          .select('*')
          .eq('category_id', item.category_id)
          .neq('id', item.id)
          .in('status', ['available', 'pending'])
          .order('created_at', { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    db.from('meetup_spots').select('id, name, barangay_id, uses_count').eq('is_enabled', true).order('uses_count', { ascending: false }).limit(10),
    db.from('barangays').select('id, name'),
  ])

  const photos = (photosRes.data ?? [])
    .map((p) => photoUrl(p.storage_path))
    .filter((p): p is string => Boolean(p))

  const ownerRow = ownerRes.data
  const ownerBrgy = ownerRow?.barangay_id
    ? ((allBrgys.data ?? []).find((b) => b.id === ownerRow.barangay_id)?.name ?? null)
    : null

  // similar-items cards need owner names + barangay labels
  const similarRows = (similarRes.data ?? []) as Array<Record<string, unknown>>
  const similarOwners = similarRows.length
    ? (
        await db
          .from('public_profiles')
          .select('id, full_name, avatar_url')
          .in('id', [...new Set(similarRows.map((r) => r.owner_id as string))])
      ).data ?? []
    : []
  const ownerMap = new Map(similarOwners.map((o) => [o.id, o]))
  const similar: BrowseCard[] = similarRows.map((r) => {
    const o = ownerMap.get(r.owner_id as string)
    return {
      id: r.id as string,
      code: r.code as string,
      title: r.title as string,
      status: statusLabel(r.status as string),
      statusKey: r.status as string,
      category: (r.category_name as string | null) ?? 'Other',
      barangay: (r.barangay_name as string | null) ?? 'Cainta',
      owner: firstName(o?.full_name as string | null),
      ownerAvatar: avatarFor(r.owner_id as string, o?.avatar_url as string | null),
      time: timeAgo(r.created_at as string),
      lookingFor: (r.looking_for as string | null) ?? '',
      photo: photoUrl(r.main_photo_path as string | null),
      photoLabel: r.title as string,
      views: (r.views_count as number) ?? 0,
      saveCount: (r.save_count as number) ?? 0,
    }
  })

  // spots: prefer the item's barangay, then busiest
  const spotRows = (spotsRes.data ?? []) as Array<{ id: string; name: string; barangay_id: string | null; uses_count: number }>
  const brgyName = (id: string | null) => (allBrgys.data ?? []).find((b) => b.id === id)?.name ?? 'Cainta'
  const ordered = [
    ...spotRows.filter((s) => s.barangay_id === item.barangay_id),
    ...spotRows.filter((s) => s.barangay_id !== item.barangay_id),
  ].slice(0, 3)

  return {
    id: item.id,
    code: item.code,
    title: item.title,
    status: statusLabel(item.status),
    statusKey: item.status,
    category: catRes.data?.name ?? 'Other',
    categoryId: item.category_id,
    barangay: brgyRes.data?.name ?? 'Cainta',
    condition: conditionLabel(item.condition),
    tradeType: tradeTypeLabel(item.trade_type),
    description: item.description ?? '',
    lookingFor: item.looking_for ?? '',
    views: item.views_count ?? 0,
    saveCount: item.save_count ?? 0,
    createdAt: item.created_at,
    photos: photos.length ? photos : [],
    owner: ownerRow
      ? {
          id: ownerRow.id,
          name: ownerRow.full_name ?? 'A neighbour',
          avatar: avatarFor(ownerRow.id, ownerRow.avatar_url),
          barangay: ownerBrgy,
          memberSince: ownerRow.approved_at ?? null,
          avgRating: ownerRow.avg_rating,
          ratingCount: ownerRow.rating_count ?? 0,
          completedTrades: ownerRow.completed_trades ?? 0,
          bio: ownerRow.bio,
        }
      : null,
    similar,
    spots: ordered.map((s) => ({ name: s.name, meta: brgyName(s.barangay_id) })),
  }
})

/* ── getMyListings (guarded caller; service client for owner+draft rows) ─ */

export type MyListing = {
  id: string
  code: string
  title: string
  statusKey: string
  status: string
  createdAt: string
  expiresAt: string | null
  views: number
  saveCount: number
  photo: string | null
}

export type MyListingResult = {
  rows: MyListing[]
  /** per-status counts over every listing the owner has (docs/03 3.5) */
  counts: Record<string, number>
  total: number
}

export async function getMyListings(ownerId: string): Promise<MyListingResult> {
  const db = supabaseAdmin()
  const { data: rows, error } = await db
    .from('items')
    .select('id, code, title, status, created_at, expires_at, views_count')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(`getMyListings: ${error.message}`)
  const list = rows ?? []

  // status counts cover every listing (beyond the 100-row page)
  const { data: statusRows, error: cErr } = await db
    .from('items')
    .select('status')
    .eq('owner_id', ownerId)
    .limit(1000)
  if (cErr) throw new Error(`getMyListings: ${cErr.message}`)
  const counts: Record<string, number> = {}
  for (const r of statusRows ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1

  if (!list.length) return { rows: [], counts, total: statusRows?.length ?? 0 }

  const [photosRes, savesRes] = await Promise.all([
    db.from('item_photos').select('item_id, storage_path, is_main, sort_order').in('item_id', list.map((r) => r.id)).order('is_main', { ascending: false }).order('sort_order'),
    db.from('item_saved_counts').select('item_id, saves').in('item_id', list.map((r) => r.id)),
  ])
  const mainPhoto = new Map<string, string>()
  for (const p of photosRes.data ?? []) if (!mainPhoto.has(p.item_id)) mainPhoto.set(p.item_id, p.storage_path)
  const saves = new Map((savesRes.data ?? []).map((s) => [s.item_id, s.saves]))

  const mapped = list.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    statusKey: r.status,
    status: statusLabel(r.status),
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    views: r.views_count,
    saveCount: saves.get(r.id) ?? 0,
    photo: photoUrl(mainPhoto.get(r.id) ?? null),
  }))
  return { rows: mapped, counts, total: statusRows?.length ?? mapped.length }
}
