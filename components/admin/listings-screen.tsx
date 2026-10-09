'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Empty, Notice } from '@/components/ui/feedback'
import { Field, Input } from '@/components/ui/field'
import { TabBar } from '@/components/ui/tabs'
import { Toast, useToast } from '@/components/ui/toast'
import { flagListing, removeListing } from '@/actions/admin-console'
import { timeAgo } from '@/lib/time'

export type AdminListingRow = {
  id: string
  code: string
  title: string
  status: string
  flagged: boolean
  views_count: number
  expires_at: string | null
  created_at: string
  owner_id: string
  removed_reason: string | null
  profiles: { full_name: string | null; email: string | null } | null
  categories: { name: string } | null
  item_photos: Array<{ id: string }>
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Live' },
  { id: 'pending', label: 'Pending' },
  { id: 'exchanged', label: 'Exchanged' },
  { id: 'removed', label: 'Removed' },
]

const STATUS_TONE: Record<string, string> = {
  available: 'border-[#c3d1bb] bg-olivetint text-[#3f5236]',
  pending: 'border-[#e3d3ac] bg-brasstint text-[#5c4512]',
  exchanged: 'border-[#c3d1bb] bg-olivetint text-[#3f5236]',
  removed: 'border-[#e2b9b2] bg-dangertint text-[#8c2f1d]',
}

/** docs/02 D26 · listings moderation screen. */
export function ListingsScreen({
  rows,
  total,
  page,
  status,
  flagged,
  error,
}: {
  rows: AdminListingRow[]
  total: number
  page: number
  status: string
  flagged: boolean
  q: string
  error: string | null
}) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [removing, setRemoving] = useState<AdminListingRow | null>(null)
  const [reason, setReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string, id: string) => {
    setBusyId(id)
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) show(res.error ?? 'That did not go through.', 'danger')
      else {
        show(okMsg)
        setRemoving(null)
        setReason('')
        router.refresh()
      }
      setBusyId(null)
    })
  }

  const push = (next: Record<string, string>) =>
    router.push(`/admin/listings?${new URLSearchParams(next)}`)

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <TabBar
          className="flex-1"
          active={flagged ? 'flagged' : status}
          onSelect={(id) =>
            id === 'flagged'
              ? push({ flagged: '1' })
              : id === 'all'
                ? push({})
                : push({ status: id })
          }
          tabs={[...TABS, { id: 'flagged', label: 'Flagged' }]}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => push(flagged ? { ...(status !== 'all' ? { status } : {}) } : { flagged: '1', ...(status !== 'all' ? { status } : {}) })}
        >
          {flagged ? 'Clear flagged filter' : 'Only flagged'}
        </Button>
      </div>

      {error ? (
        <Notice tone="danger" icon="alert" className="mb-5">
          <p className="t-small">{error} Reference: CT-ADM-407</p>
        </Notice>
      ) : null}

      {rows.length === 0 ? (
        <Empty icon="box" title="Nothing to review">
          No listings match this filter.
        </Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="border border-line rounded-md bg-surface p-4">
              <div className="flex flex-wrap items-start gap-4">
                <span className="w-11 h-11 rounded-sm bg-paper2 border border-line inline-flex items-center justify-center text-ink45 flex-none">
                  {r.item_photos.length ? '📷' : '—'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link href={`/items/${r.id}`} className="text-[15.5px] font-medium hover:text-accent truncate">
                      {r.title}
                    </Link>
                    <span className="font-mono text-[11px] text-ink45">{r.code}</span>
                    <span
                      className={`font-mono text-[10.5px] uppercase px-2 py-0.5 rounded-sm border ${
                        STATUS_TONE[r.status] ?? 'border-line bg-paper2 text-ink45'
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.flagged ? (
                      <span className="font-mono text-[10.5px] uppercase px-2 py-0.5 rounded-sm border border-[#e2b9b2] bg-dangertint text-[#8c2f1d]">
                        flagged
                      </span>
                    ) : null}
                  </div>
                  <div className="t-meta mt-1">
                    {r.profiles?.full_name ?? 'Owner'} · {r.categories?.name ?? 'No category'} ·{' '}
                    {r.views_count} views · posted {timeAgo(r.created_at)}
                    {r.expires_at ? ` · expires ${timeAgo(r.expires_at)}` : ''}
                    {r.removed_reason ? ` · removed: ${r.removed_reason}` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/items/${r.id}`} size="sm" variant="secondary">
                    Preview
                  </ButtonLink>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending || busyId === r.id}
                    onClick={() =>
                      act(
                        () => flagListing({ itemId: r.id, flagged: !r.flagged }),
                        r.flagged ? 'Flag cleared' : 'Listing flagged for review',
                        r.id,
                      )
                    }
                  >
                    {r.flagged ? 'Unflag' : 'Flag'}
                  </Button>
                  {r.status !== 'removed' ? (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={pending}
                      onClick={() => {
                        setReason('')
                        setRemoving(r)
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > 20 ? (
        <div className="flex items-center justify-center gap-3 mt-7">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => push({ ...(status !== 'all' ? { status } : {}), page: String(page - 1) })}>
            Previous
          </Button>
          <span className="t-meta">page {page}</span>
          <Button size="sm" variant="secondary" disabled={rows.length < 20} onClick={() => push({ ...(status !== 'all' ? { status } : {}), page: String(page + 1) })}>
            Next
          </Button>
        </div>
      ) : null}

      {removing ? (
      <Dialog
        title="Remove this listing"
        blurb="It disappears from browse and its owner is emailed with your reason. If an offer has been accepted, removing the listing cancels that trade."
        tone="danger"
        icon="trash"
        onClose={() => setRemoving(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={pending || reason.trim().length < 5}
              onClick={() => {
                if (!removing) return
                const target = removing
                act(() => removeListing({ itemId: target.id, reason: reason.trim() }), 'Listing removed — owner notified', target.id)
              }}
            >
              Remove listing
            </Button>
          </>
        }
      >
        <Field label="Reason" required hint={`${reason.length}/300 — at least 5 characters`}>
          <Input
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Prohibited item under community rules."
          />
        </Field>
      </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
