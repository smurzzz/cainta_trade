import type { Metadata } from 'next'
import { forbidden } from 'next/navigation'
import { listAudit } from '@/actions/admin-console'
import { AuditScreen, type AuditRow } from '@/components/admin/audit-screen'
import { requireAdmin } from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Audit log — Admin — CaintaTrade',
}

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** docs/02 D30 · append-only audit log (24-month retention): filters, table
 *  and CSV export. Read-only for moderators; export is admin-only. */
export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  // admin-only page: moderators get the 403 (docs/03 phase 3, docs/09 T-R3)
  const { profile } = await requireAdmin()
  if (profile.role !== 'admin') forbidden()

  const sp = await searchParams
  const filters = {
    action: one(sp.action) || undefined,
    adminId: one(sp.adminId) || undefined,
    subjectType: one(sp.subjectType) || undefined,
    from: one(sp.from) || undefined,
    to: one(sp.to) || undefined,
    page: Number(one(sp.page)) || 1,
  }

  const res = await listAudit(filters)
  const rows = (res.ok && res.data ? res.data.rows : []) as unknown as AuditRow[]
  const total = res.ok && res.data ? res.data.total : 0

  return (
    <div>
      <div className="mb-6">
        <div className="t-meta mb-1.5">Admin / audit</div>
        <h1 className="t-h1">Activity log</h1>
        <p className="t-small text-ink70 mt-2">
          {total} entr{total === 1 ? 'y' : 'ies'} · append-only, kept 24 months · every admin
          action is recorded here.
        </p>
      </div>

      <AuditScreen
        rows={rows}
        total={total}
        page={filters.page}
        filters={filters}
        error={res.ok ? null : res.error}
      />
    </div>
  )
}
