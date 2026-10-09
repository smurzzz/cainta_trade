import type { Metadata } from 'next'
import { listReports } from '@/actions/moderation'
import { ReportsScreen, type AdminReportRow } from '@/components/admin/reports-screen'

export const metadata: Metadata = {
  title: 'Reports — Admin — CaintaTrade',
}

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** docs/02 D28 · report queue (oldest first, urgent flag) with assign and
 *  decision actions. */
export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams
  const statusParam = one(sp.status)
  const status =
    statusParam === 'open' ||
    statusParam === 'assigned' ||
    statusParam === 'upheld' ||
    statusParam === 'dismissed'
      ? statusParam
      : undefined
  const page = Number(one(sp.page)) || 1

  const res = await listReports({ status, page })
  const rows = (res.ok && res.data ? (res.data as { rows?: AdminReportRow[] }).rows ?? [] : [])
  const total = res.ok && res.data ? (res.data as { total?: number }).total ?? 0 : 0

  return (
    <div>
      <div className="mb-6">
        <div className="t-meta mb-1.5">Admin / reports</div>
        <h1 className="t-h1">Moderation queue</h1>
        <p className="t-small text-ink70 mt-2">
          Oldest first. Every decision needs a note and is written to the audit log.
        </p>
      </div>

      <ReportsScreen
        rows={rows}
        total={total}
        page={page}
        status={status ?? 'all'}
        error={res.ok ? null : res.error}
      />
    </div>
  )
}
