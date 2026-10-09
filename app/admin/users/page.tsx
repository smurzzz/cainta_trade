import type { Metadata } from 'next'
import { listUsers } from '@/actions/admin-users'
import { UsersScreen, type AdminUserRow } from '@/components/admin/users-screen'

export const metadata: Metadata = {
  title: 'Users — Admin — CaintaTrade',
}

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** docs/02 D25 · user queue: status tabs, filters, approve/reject/suspend with
 *  reasons, proof viewing (signed URL, audited) and details. */
export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams
  const statusParam = one(sp.status)
  const status =
    statusParam === 'pending' ||
    statusParam === 'verified' ||
    statusParam === 'suspended' ||
    statusParam === 'deleted'
      ? statusParam
      : undefined
  const q = one(sp.q) ?? ''
  const page = Number(one(sp.page)) || 1

  const res = await listUsers({ status, q: q || undefined, page })
  const rows = (res.ok && res.data ? res.data.rows : []) as unknown as AdminUserRow[]
  const total = res.ok && res.data ? res.data.total : 0

  return (
    <div>
      <div className="mb-6">
        <div className="t-meta mb-1.5">Admin / users</div>
        <h1 className="t-h1">Residency approvals</h1>
        <p className="t-small text-ink70 mt-2">
          {total} member{total === 1 ? '' : 's'} · proof viewing is logged to the audit trail.
        </p>
      </div>

      <UsersScreen
        rows={rows}
        total={total}
        page={page}
        status={status ?? 'all'}
        q={q}
        error={res.ok ? null : res.error}
      />
    </div>
  )
}
