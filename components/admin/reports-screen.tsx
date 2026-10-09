'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Empty, Notice } from '@/components/ui/feedback'
import { Field, Input, Textarea } from '@/components/ui/field'
import { TabBar } from '@/components/ui/tabs'
import { Toast, useToast } from '@/components/ui/toast'
import { assignReport, decideReport } from '@/actions/moderation'
import { REPORT_REASONS } from '@/lib/validators/report'
import { timeAgo } from '@/lib/time'

export type AdminReportRow = {
  id: string
  target_type: string
  target_id: string
  reason: string
  details: string | null
  status: string
  is_urgent?: boolean
  assigned_to?: string | null
  created_at: string
  reporter: { id: string; full_name: string | null; avatar_url: string | null } | null
  target: { id: string; full_name: string | null; status: string } | null
  evidence_count: number
}

const REASON_LABELS: Record<string, string> = {
  prohibited: 'Prohibited item',
  asking_money: 'Asking for money',
  scam: 'Suspected scam',
  not_as_described: 'Not as described',
  duplicate: 'Duplicate listing',
  harassment: 'Harassment',
  moved_outside: 'Moved outside Cainta',
  other: 'Other',
}

const DECISIONS = [
  { id: 'dismiss', label: 'Dismiss', hint: 'No rule was broken.' },
  { id: 'warn', label: 'Warn the member', hint: 'A recorded warning by email.' },
  { id: 'remove_listing', label: 'Remove listing', hint: 'The listing comes down, owner notified.' },
  { id: 'suspend', label: 'Suspend account', hint: 'Cannot post, offer or message for N days.' },
] as const

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'upheld', label: 'Upheld' },
  { id: 'dismissed', label: 'Dismissed' },
]

/** docs/02 D28 · report queue with assign and decision flows. */
export function ReportsScreen({
  rows,
  total,
  page,
  status,
  error,
}: {
  rows: AdminReportRow[]
  total: number
  page: number
  status: string
  error: string | null
}) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [deciding, setDeciding] = useState<AdminReportRow | null>(null)
  const [decision, setDecision] = useState<(typeof DECISIONS)[number]['id']>('dismiss')
  const [note, setNote] = useState('')
  const [suspendDays, setSuspendDays] = useState('30')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string, id: string) => {
    setBusyId(id)
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) show(res.error ?? 'That did not go through.', 'danger')
      else {
        show(okMsg)
        setDeciding(null)
        setNote('')
        router.refresh()
      }
      setBusyId(null)
    })
  }

  const pushTab = (id: string) =>
    router.push(id === 'all' ? '/admin/reports' : `/admin/reports?status=${id}`)

  return (
    <>
      <TabBar active={status} onSelect={pushTab} tabs={TABS} className="mb-5" />

      {error ? (
        <Notice tone="danger" icon="alert" className="mb-5">
          <p className="t-small">{error} Reference: CT-RPT-406</p>
        </Notice>
      ) : null}

      {rows.length === 0 ? (
        <Empty icon="shield" title="Queue is clear">
          {status === 'open'
            ? 'No open reports — thank you, neighbours.'
            : 'No reports match this filter.'}
        </Empty>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li
              key={r.id}
              className={`border rounded-md bg-surface p-5 ${
                r.is_urgent ? 'border-[#e2b9b2] border-l-[3px] border-l-danger' : 'border-line'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2.5 mb-3">
                <span className="font-mono text-[11px] uppercase px-2 py-0.5 rounded-sm border border-line text-ink70">
                  {r.target_type}
                </span>
                <span className="font-mono text-[11px] uppercase px-2 py-0.5 rounded-sm border border-linestrong bg-paper2 text-ink">
                  {REASON_LABELS[r.reason] ?? r.reason}
                </span>
                <span
                  className={`font-mono text-[10.5px] uppercase px-2 py-0.5 rounded-sm border ${
                    r.status === 'open'
                      ? 'border-[#e3d3ac] bg-brasstint text-[#5c4512]'
                      : r.status === 'upheld'
                        ? 'border-[#c3d1bb] bg-olivetint text-[#3f5236]'
                        : 'border-line bg-paper2 text-ink45'
                  }`}
                >
                  {r.status}
                </span>
                {r.is_urgent ? (
                  <span className="font-mono text-[10.5px] uppercase px-2 py-0.5 rounded-sm border border-danger text-danger">
                    urgent
                  </span>
                ) : null}
                <span className="t-meta ml-auto">filed {timeAgo(r.created_at)}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mb-3">
                <div>
                  <div className="t-meta mb-1">Reported</div>
                  {r.target_type === 'member' && r.target ? (
                    <Link href={`/members/${r.target.id}`} className="text-[14.5px] hover:text-accent">
                      {r.target.full_name ?? 'Member'} ({r.target.status})
                    </Link>
                  ) : (
                    <Link href={`/items/${r.target_id}`} className="text-[14.5px] hover:text-accent">
                      Open target {r.target_id.slice(0, 8)}…
                    </Link>
                  )}
                </div>
                <div>
                  <div className="t-meta mb-1">Reporter</div>
                  <div className="text-[14.5px]">
                    {r.reporter ? (
                      <Link href={`/members/${r.reporter.id}`} className="hover:text-accent">
                        {r.reporter.full_name ?? 'Member'}
                      </Link>
                    ) : (
                      'Anonymous'
                    )}
                  </div>
                </div>
              </div>

              {r.details ? (
                <p className="t-small text-ink70 pl-3.5 border-l-[3px] border-line mb-3">{r.details}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2.5">
                {r.evidence_count > 0 ? (
                  <span className="t-meta inline-flex items-center gap-1.5">
                    📎 {r.evidence_count} evidence file{r.evidence_count === 1 ? '' : 's'}
                  </span>
                ) : null}
                {r.status === 'open' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending || busyId === r.id}
                    onClick={() => act(() => assignReport(r.id), 'Report assigned to you', r.id)}
                  >
                    Take this report
                  </Button>
                ) : null}
                {r.status === 'open' || r.status === 'assigned' ? (
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      setDecision('dismiss')
                      setNote('')
                      setDeciding(r)
                    }}
                  >
                    Decide
                  </Button>
                ) : null}
                <ButtonLink href={`/members/${r.target_id}`} size="sm" variant="ghost">
                  Member history
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > 20 ? (
        <div className="flex items-center justify-center gap-3 mt-7">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => pushTab(status === 'all' ? 'all' : status)}>
            Newer
          </Button>
          <span className="t-meta">page {page}</span>
          <Button
            size="sm"
            variant="secondary"
            disabled={rows.length < 20}
            onClick={() => router.push(`/admin/reports?${new URLSearchParams({ ...(status !== 'all' ? { status } : {}), page: String(page + 1) })}`)}
          >
            Older
          </Button>
        </div>
      ) : null}

      {deciding ? (
      <Dialog
        title="Moderation decision"
        blurb="Both sides are emailed the outcome. A note is required — it goes into the audit log and the member's history."
        tone={decision === 'dismiss' ? 'olive' : 'danger'}
        icon="flag"
        wide
        onClose={() => setDeciding(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeciding(null)}>
              Cancel
            </Button>
            <Button
              variant={decision === 'dismiss' ? 'primary' : 'danger'}
              disabled={pending || note.trim().length < 10}
              onClick={() => {
                if (!deciding) return
                const target = deciding
                act(
                  () =>
                    decideReport({
                      reportId: target.id,
                      decision,
                      moderationNote: note.trim(),
                      suspendDays: decision === 'suspend' ? Number(suspendDays) || 30 : undefined,
                    }),
                  'Decision recorded — both parties notified',
                  target.id,
                )
              }}
            >
              Apply decision
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {DECISIONS.map((d) => (
              <label
                key={d.id}
                className={`border rounded-sm p-3.5 cursor-pointer transition-colors ${
                  decision === d.id ? 'border-ink bg-paper2' : 'border-line hover:border-linestrong'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  className="sr-only"
                  checked={decision === d.id}
                  onChange={() => setDecision(d.id)}
                />
                <div className="text-[14.5px] text-ink font-medium">{d.label}</div>
                <div className="t-meta mt-0.5">{d.hint}</div>
              </label>
            ))}
          </div>

          {decision === 'suspend' ? (
            <Field label="Suspension length (days)" required>
              <Input
                inputMode="numeric"
                value={suspendDays}
                onChange={(e) => setSuspendDays(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
          ) : null}

          <Field
            label="Moderation note"
            required
            hint={`${note.length}/1000 — at least 10 characters`}
          >
            <Textarea
              rows={4}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Listing shows cash pricing (rule: no cash trades) — removed and member warned first offence."
            />
          </Field>

          <p className="t-meta">
            Reason reported: {REASON_LABELS[deciding?.reason ?? ''] ?? deciding?.reason} ·{' '}
            {REPORT_REASONS.length} report reasons tracked
          </p>
        </div>
      </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
