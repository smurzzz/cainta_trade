import { beforeEach, describe, expect, it, vi } from 'vitest'

/** docs/09 §1 "Unit tests: … services": catalog reads against a fake
 *  Supabase client. Responses are FIFO per table, so tests register rows in
 *  the order the service issues queries; every builder call is recorded so
 *  filter/search/range composition can be asserted. */

const fake = vi.hoisted(() => {
  type Route = { data: unknown; count?: number; error?: { message: string } | null }
  const queues = new Map<string, Route[]>()
  const calls: Array<{ table: string; select: string; op: string; args: unknown[] }> = []

  function builder(table: string) {
    const rec = { select: '', single: false }
    const b: Record<string, unknown> = {}
    const chain = (op: string) =>
      (...args: unknown[]) => {
        if (op === 'select') rec.select = String(args[0] ?? '')
        calls.push({ table, select: rec.select, op, args })
        return b
      }
    for (const op of ['select', 'in', 'eq', 'neq', 'not', 'gt', 'gte', 'lt', 'lte', 'is', 'or', 'textSearch', 'order', 'limit', 'range']) {
      b[op] = chain(op)
    }
    b.maybeSingle = () => {
      rec.single = true
      calls.push({ table, select: rec.select, op: 'maybeSingle', args: [] })
      return b
    }
    b.then = (onOk: unknown, onErr: unknown) => {
      const q = queues.get(table)
      const route = q && q.length ? q.shift() : undefined
      let data = route?.data ?? []
      if (rec.single && Array.isArray(data)) data = data[0] ?? null
      const result = { data, error: route?.error ?? null, count: route?.count ?? null }
      return Promise.resolve(result).then(onOk as never, onErr as never)
    }
    return b
  }

  return {
    calls,
    queues,
    client: { from: builder },
    reset() {
      queues.clear()
      calls.length = 0
    },
    push(table: string, route: Route) {
      const q = queues.get(table) ?? []
      q.push(route)
      queues.set(table, q)
    },
    ops(table: string) {
      return calls.filter((c) => c.table === table)
    },
  }
})

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ supabaseUser: () => fake.client }))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: () => fake.client }))

import { getItem, getMyListings, listItems, slug, statusLabel, timeAgo } from './catalog'

const CAT_ROOT = 'aaaaaaaa-0000-4000-8000-000000000001'
const CAT_CHILD = 'aaaaaaaa-0000-4000-8000-000000000002'
const CAT_OTHER = 'aaaaaaaa-0000-4000-8000-000000000003'
const BRGY1 = 'bbbbbbbb-0000-4000-8000-000000000001'
const BRGY2 = 'bbbbbbbb-0000-4000-8000-000000000002'
const OWNER = 'user_owner1'
const ITEM1 = 'cccccccc-0000-4000-8000-000000000001'
const ITEM2 = 'cccccccc-0000-4000-8000-000000000002'

const categories = [
  { id: CAT_ROOT, name: 'Furniture', parent_id: null, sort_order: 1 },
  { id: CAT_CHILD, name: 'Sofas & chairs', parent_id: CAT_ROOT, sort_order: 10 },
  { id: CAT_OTHER, name: 'Kitchenware', parent_id: null, sort_order: 2 },
]
const barangays = [
  { id: BRGY1, name: 'San Juan' },
  { id: BRGY2, name: 'San Andres (Poblacion)' },
]

/** facet rows: 2 in the child category, 1 in Furniture root, 1 Kitchenware,
 *  plus one exchanged item so the exchanged counter has something to count. */
const facetRows = [
  { id: ITEM1, category_id: CAT_CHILD, barangay_id: BRGY1, condition: 'good', status: 'available' },
  { id: ITEM2, category_id: CAT_CHILD, barangay_id: BRGY1, condition: 'fair', status: 'available' },
  { id: 'cccccccc-0000-4000-8000-000000000003', category_id: CAT_ROOT, barangay_id: BRGY2, condition: 'good', status: 'pending' },
  { id: 'cccccccc-0000-4000-8000-000000000004', category_id: CAT_OTHER, barangay_id: BRGY2, condition: 'like_new', status: 'available' },
  { id: 'cccccccc-0000-4000-8000-000000000005', category_id: CAT_OTHER, barangay_id: BRGY1, condition: 'good', status: 'exchanged' },
]

const publicItemRows = [
  {
    id: ITEM1,
    code: 'CT-100-DEMO1',
    owner_id: OWNER,
    category_id: CAT_CHILD,
    title: 'Wooden dining set',
    description: 'Six-seater dining set.',
    condition: 'good',
    looking_for: 'A sofa',
    trade_type: 'item_for_item',
    barangay_id: BRGY1,
    status: 'available',
    views_count: 12,
    created_at: '2026-10-01T00:00:00.000Z',
    category_name: 'Furniture',
    barangay_name: 'San Juan',
    main_photo_path: 'user1/photo.jpg',
    save_count: 3,
  },
  {
    id: ITEM2,
    code: 'CT-100-DEMO2',
    owner_id: OWNER,
    category_id: CAT_CHILD,
    title: 'Box fan + extension cord',
    description: 'Two electric fans.',
    condition: 'fair',
    looking_for: 'Indoor plants',
    trade_type: 'item_for_item',
    barangay_id: BRGY1,
    status: 'available',
    views_count: 40,
    created_at: '2026-10-02T00:00:00.000Z',
    category_name: 'Furniture',
    barangay_name: 'San Juan',
    main_photo_path: null,
    save_count: 0,
  },
]

beforeEach(() => {
  fake.reset()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
})

/* ── helpers ───────────────────────────────────────────────────────────── */

describe('catalog helpers', () => {
  it('slug normalises labels', () => {
    expect(slug('Books & school')).toBe('books-school')
    expect(slug('San Andres (Poblacion)')).toBe('san-andres-poblacion')
  })
  it('status/condition labels drive the badges', () => {
    expect(statusLabel('available')).toBe('Available')
    expect(statusLabel('exchanged')).toBe('Exchanged')
  })
  it('timeAgo renders relative labels', () => {
    expect(timeAgo(new Date(Date.now() - 3 * 86_400_000).toISOString())).toBe('3d ago')
    expect(timeAgo(null)).toBe('recently')
  })
})

/* ── listItems ─────────────────────────────────────────────────────────── */

describe('listItems', () => {
  beforeEach(() => {
    fake.push('categories', { data: categories })
    fake.push('barangays', { data: barangays })
    fake.push('items', { data: facetRows }) // facet pass
    fake.push('items', { data: [{ id: ITEM1 }, { id: ITEM2 }], count: 13 }) // results pass
    fake.push('public_items', { data: publicItemRows })
    fake.push('public_profiles', { data: [{ id: OWNER, full_name: 'Demo Resident A', avatar_url: null }] })
  })

  it('maps rows into cards with labels, owner names and photo URLs', async () => {
    const res = await listItems()
    expect(res.total).toBe(13)
    expect(res.pageCount).toBe(2) // 13 / 12
    expect(res.items).toHaveLength(2)
    expect(res.items[0]).toMatchObject({
      id: ITEM1,
      code: 'CT-100-DEMO1',
      status: 'Available',
      category: 'Furniture',
      barangay: 'San Juan',
      owner: 'Demo',
      lookingFor: 'A sofa',
      views: 12,
      saveCount: 3,
    })
    expect(res.items[0].photo).toBe('https://test.supabase.co/storage/v1/object/public/listing-photos/user1/photo.jpg')
    expect(res.items[1].photo).toBeNull() // no photo → gradient placeholder
  })

  it('rolls child-category counts up to the top level and counts exchanged', async () => {
    const res = await listItems()
    const furniture = res.facets.categories.find((c) => c.key === 'furniture')
    const kitchen = res.facets.categories.find((c) => c.key === 'kitchenware')
    expect(furniture?.n).toBe(3) // 2 child + 1 root
    expect(kitchen?.n).toBe(2) // 1 available + 1 exchanged (facets include exchanged)
    expect(res.facets.exchanged).toBe(1)
    expect(res.facets.barangays.find((b) => b.key === 'san-juan')?.n).toBe(3)
    expect(res.facets.conditions.find((c) => c.key === 'good')?.n).toBe(3)
    expect(res.applied).toMatchObject({ q: '', category: null, sort: 'newest', page: 1 })
  })

  it('applies FTS + every filter + range for page 2 of size 4', async () => {
    const res = await listItems({
      q: 'fan',
      category: 'Furniture',
      barangay: 'San Juan',
      condition: 'Like new',
      page: 2,
      pageSize: 4,
    })
    const itemsOps = fake.ops('items')
    const search = itemsOps.find((c) => c.op === 'textSearch')
    expect(search?.args.slice(0, 2)).toEqual(['search', 'fan'])
    const catIn = itemsOps.find((c) => c.op === 'in' && c.args[0] === 'category_id')
    expect(catIn?.args[1]).toEqual([CAT_ROOT, CAT_CHILD]) // parent + children
    expect(itemsOps.find((c) => c.op === 'eq' && c.args[0] === 'barangay_id')?.args[1]).toBe(BRGY1)
    expect(itemsOps.find((c) => c.op === 'eq' && c.args[0] === 'condition')?.args[1]).toBe('like_new')
    expect(itemsOps.find((c) => c.op === 'range')?.args).toEqual([4, 7])
    expect(res.page).toBe(2)
    expect(res.applied).toMatchObject({ q: 'fan', category: 'Furniture', condition: 'Like new', page: 2 })
  })

  it('returns no rows for an unknown category instead of erroring', async () => {
    fake.reset()
    fake.push('categories', { data: categories })
    fake.push('barangays', { data: barangays })
    fake.push('items', { data: facetRows })
    fake.push('items', { data: [], count: 0 }) // id set resolves empty
    fake.push('public_items', { data: [] })
    fake.push('public_profiles', { data: [] })
    const res = await listItems({ category: 'nonexistent' })
    expect(res.items).toHaveLength(0)
    expect(res.total).toBe(0)
    const catIn = fake.ops('items').find((c) => c.op === 'in' && c.args[0] === 'category_id')
    expect(catIn?.args[1]).toEqual([])
  })

  it('surfaces query errors instead of rendering an empty page', async () => {
    // replace the results pass with an error
    fake.reset()
    fake.push('categories', { data: categories })
    fake.push('barangays', { data: barangays })
    fake.push('items', { data: [] })
    fake.push('items', { data: null, error: { message: 'syntax error in tsquery' } })
    await expect(listItems({ q: '%%%(' })).rejects.toThrow('syntax error in tsquery')
  })

  it('adds exchanged to the status set when asked', async () => {
    await listItems({ includeExchanged: true })
    const statusIn = fake.ops('items').filter((c) => c.op === 'in' && c.args[0] === 'status')
    expect(statusIn.every((c) => (c.args[1] as string[]).includes('exchanged'))).toBe(true)
    expect(statusIn).toHaveLength(2) // facet + results both widen
  })
})

/* ── getItem ───────────────────────────────────────────────────────────── */

describe('getItem', () => {
  function pushDetailRoutes() {
    fake.push('public_items', { data: [publicItemRows[0]] }) // main (maybeSingle)
    fake.push('item_photos', { data: [{ storage_path: 'user1/a.jpg', sort_order: 0, is_main: true }] })
    fake.push('public_profiles', {
      data: [
        {
          id: OWNER,
          full_name: 'Demo Resident A',
          avatar_url: null,
          barangay_id: BRGY1,
          avg_rating: 4.5,
          rating_count: 2,
          completed_trades: 3,
          bio: 'Long-time resident',
          approved_at: '2026-09-01T00:00:00.000Z',
        },
      ],
    })
    fake.push('categories', { data: [{ id: CAT_CHILD, name: 'Furniture' }] })
    fake.push('barangays', { data: [{ id: BRGY1, name: 'San Juan' }] })
    fake.push('public_items', { data: [publicItemRows[1]] }) // similar
    fake.push('meetup_spots', {
      data: [
        { id: 'spot1', name: 'Far hall', barangay_id: BRGY2, uses_count: 9 },
        { id: 'spot2', name: 'Local hall', barangay_id: BRGY1, uses_count: 1 },
      ],
    })
    fake.push('barangays', { data: barangays }) // all barangays for spot meta
    fake.push('public_profiles', { data: [{ id: OWNER, full_name: 'Demo Resident A', avatar_url: null }] })
  }

  it('hydrates detail, owner, photos, similar and nearby spots', async () => {
    pushDetailRoutes()
    const item = await getItem(ITEM1)
    expect(item).not.toBeNull()
    expect(item!.title).toBe('Wooden dining set')
    expect(item!.category).toBe('Furniture')
    expect(item!.barangay).toBe('San Juan')
    expect(item!.photos).toEqual([
      'https://test.supabase.co/storage/v1/object/public/listing-photos/user1/a.jpg',
    ])
    expect(item!.owner).toMatchObject({
      name: 'Demo Resident A',
      avgRating: 4.5,
      completedTrades: 3,
      memberSince: '2026-09-01T00:00:00.000Z',
    })
    expect(item!.similar.map((s) => s.id)).toEqual([ITEM2])
    // the item's own barangay spot sorts first despite lower uses_count
    expect(item!.spots.map((s) => s.name)).toEqual(['Local hall', 'Far hall'])
  })

  it('looks up by code for non-uuid ids', async () => {
    pushDetailRoutes()
    await getItem('CT-100-DEMO1')
    const ops = fake.ops('public_items')
    expect(ops.some((c) => c.op === 'eq' && c.args[0] === 'code' && c.args[1] === 'CT-100-DEMO1')).toBe(true)
  })

  it('returns null for a missing item', async () => {
    fake.push('public_items', { data: null })
    expect(await getItem('00000000-0000-4000-8000-000000000000')).toBeNull()
    expect(await getItem('')).toBeNull()
  })
})

/* ── getMyListings (service role path) ─────────────────────────────────── */

describe('getMyListings', () => {
  it('includes drafts for the owner with photo and save counts', async () => {
    fake.push('items', {
      data: [
        { id: ITEM1, code: 'CT-100-D1', title: 'Draft lamp', status: 'draft', created_at: '2026-10-01T00:00:00.000Z', expires_at: null, views_count: 0 },
        { id: ITEM2, code: 'CT-100-D2', title: 'Live fan', status: 'available', created_at: '2026-10-02T00:00:00.000Z', expires_at: '2026-11-01T00:00:00.000Z', views_count: 7 },
      ],
    })
    fake.push('item_photos', { data: [{ item_id: ITEM1, storage_path: 'user1/draft.jpg', is_main: true, sort_order: 0 }] })
    fake.push('item_saved_counts', { data: [{ item_id: ITEM2, saves: 5 }] })
    fake.push('items', { data: [{ status: 'draft' }, { status: 'draft' }, { status: 'available' }] }) // status counts

    const res = await getMyListings(OWNER)
    const rows = res.rows
    expect(rows).toHaveLength(2)
    expect(res.counts).toEqual({ draft: 2, available: 1 })
    expect(res.total).toBe(3)
    expect(rows[0]).toMatchObject({ statusKey: 'draft', status: 'Draft', saveCount: 0 })
    expect(rows[0].photo).toContain('/listing-photos/user1/draft.jpg')
    expect(rows[1]).toMatchObject({ status: 'Available', views: 7, saveCount: 5, photo: null })
    expect(fake.ops('items').some((c) => c.op === 'eq' && c.args[0] === 'owner_id' && c.args[1] === OWNER)).toBe(true)
  })
})
