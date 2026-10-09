import type { Metadata } from 'next'
import Link from 'next/link'
import { listAdminTrades } from '@/actions/admin-console'
import { Empty, Notice } from '@/components/ui/feedback'
import { timeAgo } from '@/lib/queries/catalog'
import { isOlderThan } from '@/lib/time'

export const metadata: Metadata = {
  title: 'Trades — Admin — CaintaTrade',
}

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

type TradeRow = {
  id: string
  code: string
  status: string
  meetup_at: string | null
  created_at: string
  completed_at: string | null
  cancel_reason: string | null
  from_name: string
  to_name: string
  wanted_title: string
  offered_title: string
}

type TradesData = {
  rows: TradeRow[]
  page: number
  funnel: Record<string, number>
  cancelReasons: Array<{ reason: string; count: number }>
}

const STATUS_TONE: Record<string, string> = {
  meetup_pending: 'border-[#e3d3ac] bg-brasstint text-[#5c4512]',
  meetup_set: 'border-[#e8cfc6] bg-accenttint text-[#7d3322]',
  both_confirmed: 'border-[#c3d1bb] bg-olivetint text-[#3f5236]',
  completed: 'border-[#c3d1bb] bg-olivetint text-[#3f5236]',
  cancelled: 'border-line bg-paper2 text-ink45',
  disputed: 'border-[#e2b9b2] bg-dangertint text-[#8c2f1d]',
}

/** docs/02 D27 · trades overview: funnel, cancellation reasons, stalled and
 *  unconfirmed queues. Actions (nudge/intervene) are Tier 2 (docs/05 §G). */
export default async function AdminTradesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams
  const statusParam = one(sp.status)
  const status =
    statusParam === 'meetup_pending' ||
    statusParam === 'meetup_set' ||
    statusParam === 'both_confirmed' ||
    statusParam === 'completed' ||
    statusParam === 'cancelled' ||
    statusParam === 'disputed'
      ? statusParam
      : undefined
  const page = Number(one(sp.page)) || 1

  const res = await listAdminTrades({ status, page })
  const d = (res.ok && res.data ? res.data : {}) as unknown as Partial<TradesData>
  const rows = d.rows ?? []
  const funnel = d.funnel ?? {}
  const cancelReasons = d.cancelReasons ?? []
  const funnelTotal = Object.values(funnel).reduce((a, b) => a + b, 0)
  const stalled = rows.filter(
    (r) =>
      (r.status === 'meetup_pending' || r.status === 'meetup_set') &&
      isOlderThan(r.meetup_at, 0) &&
      !r.completed_at,
  )

  return (
    <div>
      <div className="mb-6">
        <div className="t-meta mb-1.5">Admin / trades</div>
        <h1 className="t-h1">Offers and trades</h1>
      </div>

      {res.ok ? null : (
        <Notice tone="danger" icon="alert" className="mb-5">
          <p className="t-small">{res.error} Reference: CT-ADM-407</p>
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-6">
        {(
          [
            ['meetup_pending', 'Meetup pending'],
            ['meetup_set', 'Meetup set'],
            ['both_confirmed', 'Both confirmed'],
            ['completed', 'Completed'],
            ['cancelled', 'Cancelled'],
            ['disputed', 'Disputed'],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/trades?status=${status === key ? '' : key}`}
            className={`border rounded-md bg-surface p-3.5 transition-colors ${
              status === key ? 'border-ink' : 'border-line hover:border-ink45'
            }`}
          >
            <div className="t-meta">{label}</div>
            <div className="font-display text-2xl mt-1">{funnel[key] ?? 0}</div>
          </Link>
        ))}
      </div>

      {cancelReasons.length ? (
        <Notice tone="brass" icon="info" className="mb-6">
          <div className="font-medium">Why trades cancel</div>
          <ul className="t-small mt-1 grid gap-x-6 sm:grid-cols-2">
            {cancelReasons.slice(0, 6).map((c) => (
              <li key={c.reason}>
                {c.reason} — <b>{c.count}</b>
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}

      {stalled.length ? (
        <Notice tone="danger" icon="alert" className="mb-6">
          <div className="font-medium">{stalled.length} trade{stalled.length === 1 ? '' : 's'} past their meetup time, unconfirmed</div>
          <ul className="t-small mt-1 list-disc list-inside">
            {stalled.slice(0, 5).map((r) => (
              <li key={r.id}>
                {r.code} — {r.from_name} ↔ {r.to_name} (meetup {timeAgo(r.meetup_at)})
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <div className="flex flex-wrap gap-2 mb-5">
        {['', 'meetup_pending', 'meetup_set', 'completed', 'cancelled', 'disputed'].map((s) => (
          <Link
            key={s || 'all'}
            href={s ? `/admin/trades?status=${s}` : '/admin/trades'}
            className={`px-3.5 py-1.5 rounded-full border font-mono text-[12px] uppercase transition-colors ${
              (status ?? '') === s ? 'bg-ink text-paper border-ink' : 'border-line text-ink70 hover:border-ink hover:text-ink'
            }`}
          >
            {s ? s.replace(/_/g, ' ') : 'All'}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty icon="swap" title="No trades here">
          {funnelTotal === 0
            ? 'The first trade starts when a neighbour accepts an offer.'
            : 'No trades match this filter.'}
        </Empty>
      ) : (
        <div className="border border-line rounded-md bg-surface divide-y divide-line overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left font-mono text-[11px] uppercase text-ink45 border-b border-line">
                <th className="px-4 py-3">Trade</th>
                <th className="px-4 py-3">Parties</th>
                <th className="px-4 py-3">Swap</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Meetup</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper2">
                  <td className="px-4 py-3 font-mono text-[12px]">{r.code}</td>
                  <td className="px-4 py-3">
                    <div className="text-[13.5px]">{r.from_name} ↔ {r.to_name}</div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink70 max-w-[240px]">
                    <div className="truncate">{r.offered_title}</div>
                    <div className="truncate text-ink45">for {r.wanted_title}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono text-[10.5px] uppercase px-2 py-0.5 rounded-sm border ${
                        STATUS_TONE[r.status] ?? 'border-line bg-paper2 text-ink45'
                      }`}
                    >
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 t-meta">
                    {r.meetup_at ? timeAgo(r.meetup_at) : 'not set'}
                    {r.cancel_reason ? <div className="text-danger">{r.cancel_reason}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/reports`} className="t-meta hover:text-accent">
                      View record
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
