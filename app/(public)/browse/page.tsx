import type { Metadata } from 'next'
import { BrowseScreen } from '@/components/items/browse-screen'
import { listItems } from '@/lib/queries/catalog'

export const metadata: Metadata = {
  title: 'Browse items — CaintaTrade',
}

type Params = Record<string, string | string[] | undefined>

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** docs/07 · listItems: URL filters → real catalog query → BrowseScreen. */
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Params>
}) {
  const sp = await searchParams
  const sort = one(sp.sort)
  const since = one(sp.since)

  const result = await listItems({
    q: one(sp.q),
    category: one(sp.category),
    barangay: one(sp.barangay),
    condition: one(sp.condition),
    includeExchanged: one(sp.exchanged) === '1',
    since: since === 'day' || since === 'week' ? since : null,
    sort: sort === 'views' || sort === 'saves' ? sort : null,
    page: Number(one(sp.page)) || 1,
  })

  return <BrowseScreen initial={result} />
}
