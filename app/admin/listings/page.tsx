import type { Metadata } from 'next'
import { listAdminListings } from '@/actions/admin-console'
import { ListingsScreen, type AdminListingRow } from '@/components/admin/listings-screen'

export const metadata: Metadata = {
  title: 'Listings — Admin — CaintaTrade',
}

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** docs/02 D26 · listing moderation: tabs, search, flag and remove with
 *  reason (removal cancels an accepted trade — warned in the dialog). */
export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<Params>
}) {
  const sp = await searchParams
  const statusParam = one(sp.status)
  const status =
    statusParam === 'available' ||
    statusParam === 'pending' ||
    statusParam === 'exchanged' ||
    statusParam === 'removed' ||
    statusParam === 'draft' ||
    statusParam === 'paused' ||
    statusParam === 'expired'
      ? statusParam
      : undefined
  const flagged = one(sp.flagged) === '1'
  const q = one(sp.q) ?? ''
  const page = Number(one(sp.page)) || 1

  const res = await listAdminListings({ status, flagged: flagged || undefined, q: q || undefined, page })
  const rows = (res.ok && res.data ? res.data.rows : []) as unknown as AdminListingRow[]
  const total = res.ok && res.data ? res.data.total : 0

  return (
    <div>
      <div className="mb-6">
        <div className="t-meta mb-1.5">Admin / listings</div>
        <h1 className="t-h1">Listing moderation</h1>
        <p className="t-small text-ink70 mt-2">{total} listing{total === 1 ? '' : 's'} in this view.</p>
      </div>

      <ListingsScreen
        rows={rows}
        total={total}
        page={page}
        status={status ?? 'all'}
        flagged={flagged}
        q={q}
        error={res.ok ? null : res.error}
      />
    </div>
  )
}
