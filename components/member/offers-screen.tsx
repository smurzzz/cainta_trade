'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Empty, Notice } from '@/components/ui/feedback'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/field'
import { TabBar } from '@/components/ui/tabs'
import { Toast, useToast } from '@/components/ui/toast'
import { acceptOffer, cancelOffer, rejectOffer } from '@/actions/trading'
import { isWithin, timeAgo } from '@/lib/time'

export type OfferRow = {
  id: string
  status: string
  message: string | null
  created_at: string
  expires_at: string | null
  from_user_id: string
  to_user_id: string
  proposed_at: string | null
  flexibility: string | null
  wanted: { id: string; title: string; status: string } | null
  offered: { id: string; title: string; status: string } | null
  from: { id: string; full_name: string | null; avatar_url: string | null } | null
  to: { id: string; full_name: string | null; avatar_url: string | null } | null
}

const STATUS_TONE: Record<string, string> = {
  pending: 'border-[#e3d3ac] bg-brasstint text-[#5c4512]',
  accepted: 'border-[#c3d1bb] bg-olivetint text-[#3f5236]',
  completed: 'border-[#c3d1bb] bg-olivetint text-[#3f5236]',
  rejected: 'border-[#e2b9b2] bg-dangertint text-[#8c2f1d]',
  cancelled: 'border-line bg-paper2 text-ink45',
  countered: 'border-[#e8cfc6] bg-accenttint text-[#7d3322]',
}

function ItemChip({ item, label }: { item: OfferRow['wanted']; label: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="t-meta mb-1">{label}</div>
      {item ? (
        <Link href={`/items/${item.id}`} className="text-[15px] text-ink hover:text-accent line-clamp-2">
          {item.title}
        </Link>
      ) : (
        <span className="text-[15px] text-ink45">Listing removed</span>
      )}
      {item ? <div className="t-meta mt-0.5">{item.status}</div> : null}
    </div>
  )
}

/** docs/02 C16 · offers list. Accept/reject/cancel go through the SQL rules —
 *  the server answers with the exact guard message on failure. */
export function OffersScreen({
  view,
  rows,
  total,
  page,
  unread,
  tradeByOffer,
  error,
  me,
}: {
  view: 'received' | 'sent' | 'closed'
  rows: OfferRow[]
  total: number
  page: number
  unread: number
  tradeByOffer: Record<string, string>
  error: string | null
  me: string
}) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [rejecting, setRejecting] = useState<OfferRow | null>(null)
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
        setRejecting(null)
        setReason('')
        router.refresh()
      }
      setBusyId(null)
    })
  }

  const tabs = [
    { id: 'received', label: 'Received' },
    { id: 'sent', label: 'Sent' },
    { id: 'closed', label: 'Closed' },
  ]

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <TabBar
          tabs={tabs}
          active={view}
          onSelect={(id) => router.push(`/offers?view=${id}`)}
          className="flex-1"
        />
      </div>

      {view === 'received' && unread > 0 ? (
        <Notice tone="accent" icon="bell" className="mt-4">
          <p className="t-small">
            <b>{unread}</b> new message{unread === 1 ? '' : 's'} in your active conversations.
          </p>
        </Notice>
      ) : null}

      {error ? (
        <Notice tone="danger" icon="alert" className="mt-5">
          <p className="t-small">
            {error} Reference: CT-OFR-404
          </p>
        </Notice>
      ) : null}

      <div className="mt-5">
        {rows.length === 0 ? (
          <Empty icon="swap" title={view === 'received' ? 'No offers waiting' : view === 'sent' ? 'You have not sent an offer' : 'Nothing closed yet'}>
            {view === 'received'
              ? 'When someone offers on one of your listings it lands here with 3 days on the clock.'
              : view === 'sent'
                ? 'Find something in browse and offer one of your own listings in return.'
                : 'Answered and expired offers are kept here for your records.'}
            <div className="mt-5">
              <ButtonLink href="/browse">Browse items</ButtonLink>
            </div>
          </Empty>
        ) : (
          <ul className="space-y-4">
            {rows.map((o) => {
              const other = o.from?.id === me ? o.to : o.from
              const tradeId = tradeByOffer[o.id]
              const expiresSoon = o.status === 'pending' && isWithin(o.expires_at, 86_400_000)
              return (
                <li key={o.id} className="border border-line rounded-md bg-surface p-5">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span
                      className={`font-mono text-[11px] uppercase px-2 py-0.5 rounded-sm border ${
                        STATUS_TONE[o.status] ?? STATUS_TONE.cancelled
                      }`}
                    >
                      {o.status}
                    </span>
                    <span className="t-meta">{timeAgo(o.created_at)}</span>
                    {other ? (
                      <span className="t-meta inline-flex items-center gap-1.5">
                        <Icon name="user" size={13} />
                        {o.to_user_id === other.id ? 'from' : 'to'} {other.full_name ?? 'a neighbour'}
                      </span>
                    ) : null}
                    {o.status === 'pending' && o.expires_at ? (
                      <span className={`t-meta ${expiresSoon ? 'text-danger' : ''}`}>
                        {expiresSoon ? 'expires soon' : `expires ${timeAgo(o.expires_at)}`}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-stretch gap-4">
                    <ItemChip item={o.offered} label={view === 'received' ? 'They offer' : 'You offer'} />
                    <span className="flex items-center text-ink45 flex-none">
                      <Icon name="swap" size={20} />
                    </span>
                    <ItemChip item={o.wanted} label={view === 'received' ? 'They want' : 'You want'} />
                  </div>

                  {o.message ? (
                    <p className="t-small text-ink70 mt-4 pl-3.5 border-l-[3px] border-line">
                      “{o.message}”
                    </p>
                  ) : null}
                  {o.proposed_at ? (
                    <p className="t-meta mt-2 inline-flex items-center gap-1.5">
                      <Icon name="clock" size={13} />
                      Suggested meetup {new Date(o.proposed_at).toLocaleString('en-PH', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                      {o.flexibility ? ` · ${o.flexibility}` : ''}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2.5 mt-5">
                    {o.status === 'pending' && view === 'received' ? (
                      <>
                        <Button
                          size="sm"
                          disabled={pending || busyId === o.id}
                          onClick={() =>
                            act(() => acceptOffer({ offerId: o.id }), 'Offer accepted — the trade is open', o.id)
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() => setRejecting(o)}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {o.status === 'pending' && view === 'sent' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending || busyId === o.id}
                        onClick={() =>
                          act(() => cancelOffer({ offerId: o.id }), 'Offer withdrawn', o.id)
                        }
                      >
                        Cancel offer
                      </Button>
                    ) : null}
                    {/* docs/02 C16 Cancel · after accept the sender can still
                        unwind the trade (SQL cancel_offer returns both items,
                        docs/09 T-O5). */}
                    {o.status === 'accepted' && view === 'closed' && o.from_user_id === me ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending || busyId === o.id}
                        onClick={() =>
                          act(
                            () => cancelOffer({ offerId: o.id }),
                            'Trade cancelled — both items are available again',
                            o.id,
                          )
                        }
                      >
                        Cancel trade
                      </Button>
                    ) : null}
                    {tradeId ? (
                      <>
                        <ButtonLink href={`/trades/${tradeId}`} size="sm">
                          Open trade
                        </ButtonLink>
                        <ButtonLink href={`/messages/${o.id}`} size="sm" variant="secondary">
                          Message
                        </ButtonLink>
                      </>
                    ) : (
                      <ButtonLink href={`/messages/${o.id}`} size="sm" variant="secondary">
                        Message
                      </ButtonLink>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {total > 10 ? (
        <div className="flex items-center justify-center gap-3 mt-8">
          <ButtonLink
            href={`/offers?view=${view}&page=${Math.max(1, page - 1)}`}
            variant="secondary"
            size="sm"
            className={page <= 1 ? 'pointer-events-none opacity-40' : ''}
          >
            Previous
          </ButtonLink>
          <span className="t-meta">page {page}</span>
          <ButtonLink
            href={`/offers?view=${view}&page=${page + 1}`}
            variant="secondary"
            size="sm"
            className={rows.length < 10 ? 'pointer-events-none opacity-40' : ''}
          >
            Next
          </ButtonLink>
        </div>
      ) : null}

      {rejecting ? (
      <Dialog
        title="Reject this offer"
        blurb="The sender is told the offer did not work out. A short reason helps them try again with something better."
        tone="danger"
        icon="x"
        onClose={() => setRejecting(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Go back
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (!rejecting) return
                const target = rejecting
                act(
                  () => rejectOffer({ offerId: target.id, reason: reason.trim() || undefined }),
                  'Offer rejected',
                  target.id,
                )
              }}
            >
              Reject offer
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-[7px]">
          <span className="font-mono text-[12.5px]">Reason (optional)</span>
          <Input
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Not quite what I need, but thanks!"
          />
        </label>
      </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
