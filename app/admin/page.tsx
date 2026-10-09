import type { Metadata } from 'next'
import Link from 'next/link'
import { getAdminStats } from '@/actions/admin-console'
import { Notice } from '@/components/ui/feedback'
import { Icon } from '@/components/ui/icon'
import { timeAgo } from '@/lib/queries/catalog'

export const metadata: Metadata = {
  title: 'Admin dashboard — CaintaTrade',
}

type Stats = {
  kpis: {
    users: number
    usersPending: number
    usersVerified: number
    usersSuspended: number
    listingsLive: number
    tradesCompleted: number
    reportsOpen: number
    categoriesLive: number
  }
  monthly: Array<{ month: string; signups: number; trades: number }>
  byBarangay: Array<{ name: string; count: number }>
  topCategories: Array<{ name: string; count: number }>
  health: Array<{ key: string; label: string; count: number; ok: boolean }>
  expiring: Array<{ id: string; title: string; expires_at: string }>
  stalledTrades: Array<{ id: string; code: string; meetup_at: string | null }>
}

function Kpi({ label, value, href, sub }: { label: string; value: number; href?: string; sub?: string }) {
  const inner = (
    <>
      <div className="t-meta">{label}</div>
      <div className="font-display text-3xl mt-1.5">{value}</div>
      {sub ? <div className="t-small text-ink45 mt-1">{sub}</div> : null}
    </>
  )
  return href ? (
    <Link href={href} className="border border-line rounded-md bg-surface p-4 hover:border-ink45 transition-colors">
      {inner}
    </Link>
  ) : (
    <div className="border border-line rounded-md bg-surface p-4">{inner}</div>
  )
}

/** docs/02 D24 · admin dashboard: KPIs, signups vs trades chart, trades per
 *  barangay, top categories, needs-a-decision list and health checks. */
export default async function AdminDashboard() {
  const res = await getAdminStats()

  if (!res.ok || !res.data) {
    return (
      <Notice tone="danger" icon="alert">
        <div className="font-medium">Could not load the dashboard</div>
        <p className="t-small mt-1">{res.ok ? 'No data.' : res.error} Reference: CT-ADM-407</p>
      </Notice>
    )
  }

  const s = res.data as unknown as Stats
  const maxBar = Math.max(1, ...s.monthly.map((m) => Math.max(m.signups, m.trades)))
  const maxArea = Math.max(1, ...s.byBarangay.map((b) => b.count))
  const unhealthy = s.health.filter((h) => !h.ok)

  return (
    <div className="space-y-7">
      <div>
        <div className="t-meta mb-1.5">Admin</div>
        <h1 className="t-h1">Platform dashboard</h1>
      </div>

      {unhealthy.length ? (
        <Notice tone="brass" icon="alert">
          <div className="font-medium">{unhealthy.length} health check{unhealthy.length === 1 ? '' : 's'} need attention</div>
          <ul className="t-small mt-1 list-disc list-inside">
            {unhealthy.map((h) => (
              <li key={h.key}>
                {h.label}: {h.count}
              </li>
            ))}
          </ul>
        </Notice>
      ) : (
        <Notice tone="olive" icon="check">
          <div className="font-medium">All health checks green</div>
        </Notice>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Users"
          value={s.kpis.users}
          href="/admin/users"
          sub={`${s.kpis.usersPending} pending · ${s.kpis.usersSuspended} suspended`}
        />
        <Kpi label="Active listings" value={s.kpis.listingsLive} href="/admin/listings" />
        <Kpi label="Completed trades" value={s.kpis.tradesCompleted} href="/admin/trades" />
        <Kpi
          label="Open reports"
          value={s.kpis.reportsOpen}
          href="/admin/reports"
          sub={`${s.kpis.categoriesLive} live categories`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="border border-line rounded-md bg-surface p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="t-h3">Signups vs trades</div>
            <div className="flex gap-4 t-meta">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-accent inline-block" /> Signups
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-olive inline-block" /> Trades
              </span>
            </div>
          </div>
          <div className="flex items-end gap-2 h-44" role="img" aria-label="Signups versus trades by month">
            {s.monthly.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  <span
                    className="w-1/2 max-w-[14px] bg-accent rounded-t-[2px]"
                    style={{ height: `${Math.max(2, (m.signups / maxBar) * 100)}%` }}
                    title={`${m.month}: ${m.signups} signups`}
                  />
                  <span
                    className="w-1/2 max-w-[14px] bg-olive rounded-t-[2px]"
                    style={{ height: `${Math.max(2, (m.trades / maxBar) * 100)}%` }}
                    title={`${m.month}: ${m.trades} trades`}
                  />
                </div>
                <span className="font-mono text-[9.5px] text-ink45 truncate w-full text-center">
                  {m.month.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-line rounded-md bg-surface p-6">
          <div className="t-h3 mb-4">Trades per barangay</div>
          {s.byBarangay.length === 0 ? (
            <p className="t-small text-ink45">No trades yet.</p>
          ) : (
            <ul className="space-y-3">
              {s.byBarangay.slice(0, 7).map((b) => (
                <li key={b.name}>
                  <div className="flex justify-between t-small mb-1">
                    <span>{b.name}</span>
                    <b>{b.count}</b>
                  </div>
                  <div className="h-1.5 bg-paper2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ink rounded-full"
                      style={{ width: `${(b.count / maxArea) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="border border-line rounded-md bg-surface p-6">
          <div className="t-h3 mb-4">Top categories</div>
          {s.topCategories.length === 0 ? (
            <p className="t-small text-ink45">No listings yet.</p>
          ) : (
            <ol className="space-y-2.5">
              {s.topCategories.map((c, i) => (
                <li key={c.name} className="flex items-center gap-3 t-small">
                  <span className="font-mono text-[11px] text-ink45 w-5">{i + 1}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <b>{c.count}</b>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="border border-line rounded-md bg-surface p-6">
          <div className="t-h3 mb-4">Needs a decision</div>
          <ul className="space-y-3 t-small">
            <li className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2">
                <Icon name="users" size={15} className="text-ink45" /> Pending approvals
              </span>
              <Link href="/admin/users?status=pending" className="hover:text-accent">
                {s.kpis.usersPending} →
              </Link>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2">
                <Icon name="flag" size={15} className="text-ink45" /> Open reports
              </span>
              <Link href="/admin/reports" className="hover:text-accent">
                {s.kpis.reportsOpen} →
              </Link>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2">
                <Icon name="swap" size={15} className="text-ink45" /> Stalled trades
              </span>
              <Link href="/admin/trades" className="hover:text-accent">
                {s.stalledTrades.length} →
              </Link>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2">
                <Icon name="clock" size={15} className="text-ink45" /> Expiring in 3 days
              </span>
              <Link href="/admin/listings" className="hover:text-accent">
                {s.expiring.length} →
              </Link>
            </li>
          </ul>
        </section>

        <section className="border border-line rounded-md bg-surface p-6">
          <div className="t-h3 mb-4">Health checks</div>
          <ul className="space-y-2.5 t-small">
            {s.health.map((h) => (
              <li key={h.key} className="flex items-start gap-2.5">
                <Icon
                  name={h.ok ? 'check' : 'alert'}
                  size={15}
                  className={`mt-0.5 flex-none ${h.ok ? 'text-olive' : 'text-danger'}`}
                />
                <span className={h.ok ? 'text-ink70' : 'text-ink'}>
                  {h.label}
                  {!h.ok ? ` (${h.count})` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {s.expiring.length ? (
        <section className="border border-line rounded-md bg-surface p-6">
          <div className="t-h3 mb-4">Expiring soon</div>
          <ul className="divide-y divide-line">
            {s.expiring.slice(0, 6).map((i) => (
              <li key={i.id} className="py-2.5 flex items-center justify-between gap-3 t-small">
                <Link href={`/items/${i.id}`} className="truncate hover:text-accent">
                  {i.title}
                </Link>
                <span className="text-ink45 flex-none">expires {timeAgo(i.expires_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
