'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Empty, Notice } from '@/components/ui/feedback'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Icon } from '@/components/ui/icon'
import { Tracker, type TrackerStep } from '@/components/ui/tracker'
import { Toast, useToast } from '@/components/ui/toast'
import { confirmTrade, disputeTrade, rateTrade, updateMeetup } from '@/actions/trading'
import { hasArrived, timeAgo } from '@/lib/time'

type Party = {
  id: string
  full_name: string | null
  avatar_url: string | null
  avg_rating: number | null
  completed_trades: number
} | null

type ItemBit = { id: string; code: string; title: string; status: string; owner_id: string } | null

export type TradeData = {
  id: string
  code: string
  status: string
  meetup_at: string | null
  meetup_note: string | null
  owner_confirmed_at: string | null
  requester_confirmed_at: string | null
  cancel_reason: string | null
  completed_at: string | null
  created_at: string
  offer_id: string
  offer: {
    id: string
    from_user_id: string
    to_user_id: string
    message: string | null
    status: string
    from: Party
    to: Party
    wanted: ItemBit
    offered: ItemBit
  }
  spot: { id: string; name: string } | null
  ratings: Array<{ id: string; stars: number; rater_id: string }>
  isOwner: boolean
}

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
    : null

/** docs/02 C17 · the trade page body. Everything mutates through the SQL rules:
 *  confirm unlocks at/after the meetup time and cannot be undone. */
export function TradeScreen({
  trade,
  me,
  spots,
}: {
  trade: TradeData
  me: string
  spots: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [pending, startTransition] = useTransition()
  const [changing, setChanging] = useState(false)
  const [disputing, setDisputing] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [spotId, setSpotId] = useState(trade.spot?.id ?? '')
  const [at, setAt] = useState(
    trade.meetup_at ? new Date(trade.meetup_at).toISOString().slice(0, 16) : '',
  )
  const [note, setNote] = useState(trade.meetup_note ?? '')

  const other = trade.offer.from?.id === me ? trade.offer.to : trade.offer.from
  const myConfirmedAt = trade.isOwner ? trade.owner_confirmed_at : trade.requester_confirmed_at
  const otherConfirmedAt = trade.isOwner ? trade.requester_confirmed_at : trade.owner_confirmed_at
  const bothConfirmed = Boolean(trade.owner_confirmed_at && trade.requester_confirmed_at)
  const due = hasArrived(trade.meetup_at)
  const myRating = trade.ratings.find((r) => r.rater_id === me)
  const isOpen = trade.status !== 'cancelled' && trade.status !== 'disputed'

  const steps: TrackerStep[] = useMemo(() => {
    const s: TrackerStep[] = [
      { label: 'Offer sent', time: timeAgo(trade.created_at), state: 'done' },
      { label: 'Accepted', time: timeAgo(trade.created_at), state: 'done' },
      {
        label: 'Meetup set',
        time: trade.meetup_at ? fmt(trade.meetup_at) ?? '' : 'not yet',
        state: trade.meetup_at ? 'done' : 'now',
      },
      {
        label: 'Both confirmed',
        time: bothConfirmed ? 'confirmed' : 'waiting',
        state: bothConfirmed ? 'done' : trade.meetup_at ? 'now' : 'todo',
      },
      {
        label: 'Completed',
        time: trade.completed_at ? fmt(trade.completed_at) ?? '' : '',
        state: trade.status === 'completed' ? 'done' : 'todo',
      },
    ]
    return s
  }, [trade, bothConfirmed])

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) show(res.error ?? 'That did not go through.', 'danger')
      else {
        show(okMsg)
        setDisputing(false)
        router.refresh()
      }
    })
  }

  if (trade.status === 'cancelled') {
    return (
      <Empty icon="x" title="This trade was cancelled">
        {trade.cancel_reason ? `Reason: ${trade.cancel_reason}` : 'Either side called it off.'}{' '}
        <Link href="/browse" className="underline underline-offset-[3px]">
          Find another swap
        </Link>
        .
      </Empty>
    )
  }

  return (
    <div className="space-y-7">
      <div className="border border-line rounded-md bg-surface p-6">
        <Tracker steps={steps} className="mb-1" />
      </div>

      {trade.status === 'disputed' ? (
        <Notice tone="danger" icon="alert">
          <div className="font-medium">This trade is under review</div>
          <p className="t-small mt-1">
            A moderator is looking at what happened. You will get a message and an email with the
            outcome.
          </p>
        </Notice>
      ) : null}

      {/* items */}
      <div className="border border-line rounded-md bg-surface p-5">
        <div className="t-label mb-3">The swap</div>
        <div className="flex items-stretch gap-4">
          <div className="min-w-0 flex-1">
            <div className="t-meta mb-1">You {trade.isOwner ? 'give' : 'get'}</div>
            <Link
              href={`/items/${(trade.isOwner ? trade.offer.offered : trade.offer.wanted)?.id ?? ''}`}
              className="text-[15.5px] text-ink hover:text-accent line-clamp-2"
            >
              {(trade.isOwner ? trade.offer.offered : trade.offer.wanted)?.title ?? 'Listing'}
            </Link>
          </div>
          <span className="flex items-center text-ink45 flex-none">
            <Icon name="swap" size={20} />
          </span>
          <div className="min-w-0 flex-1 text-right max-md:text-left">
            <div className="t-meta mb-1">You {trade.isOwner ? 'get' : 'give'}</div>
            <Link
              href={`/items/${(trade.isOwner ? trade.offer.wanted : trade.offer.offered)?.id ?? ''}`}
              className="text-[15.5px] text-ink hover:text-accent line-clamp-2"
            >
              {(trade.isOwner ? trade.offer.wanted : trade.offer.offered)?.title ?? 'Listing'}
            </Link>
          </div>
        </div>
        {trade.offer.message ? (
          <p className="t-small text-ink70 mt-4 pl-3.5 border-l-[3px] border-line">
            “{trade.offer.message}”
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* meetup */}
        <div className="border border-line rounded-md bg-surface p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="t-h3">Meetup</div>
            {isOpen && !changing ? (
              <Button size="sm" variant="secondary" onClick={() => setChanging(true)}>
                {trade.meetup_at ? 'Change' : 'Set a meetup'}
              </Button>
            ) : null}
          </div>

          {changing && isOpen ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (!spotId || !at) {
                  show('Pick a spot and a date first.', 'danger')
                  return
                }
                run(
                  () =>
                    updateMeetup({
                      tradeId: trade.id,
                      spotId,
                      at: new Date(at).toISOString(),
                      note: note.trim() || undefined,
                    }),
                  'Meetup updated — both sides were notified',
                )
                setChanging(false)
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Spot" required>
                  <Select value={spotId} onChange={(e) => setSpotId(e.target.value)}>
                    <option value="">Choose a spot…</option>
                    {spots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Date and time" required>
                  <Input
                    type="datetime-local"
                    value={at}
                    onChange={(e) => setAt(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Note (optional)" hint="Landmark, what to bring, who to look for.">
                <Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <div className="flex gap-2.5">
                <Button size="sm" loading={pending}>
                  Save meetup
                </Button>
                <Button size="sm" variant="ghost" type="button" onClick={() => setChanging(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : trade.meetup_at ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-[15.5px]">
                <Icon name="pin" size={16} className="text-accent" />
                <span>{trade.spot?.name ?? 'Agreed spot'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[15.5px]">
                <Icon name="clock" size={16} className="text-accent" />
                <span>{fmt(trade.meetup_at)}</span>
              </div>
              {trade.meetup_note ? <p className="t-small text-ink70">{trade.meetup_note}</p> : null}
              <div className="flex flex-wrap gap-2 mt-3">
                <span
                  className={`font-mono text-[11px] uppercase px-2 py-0.5 rounded-sm border ${
                    myConfirmedAt
                      ? 'border-[#c3d1bb] bg-olivetint text-[#3f5236]'
                      : 'border-line bg-paper2 text-ink45'
                  }`}
                >
                  You {myConfirmedAt ? 'confirmed' : 'not confirmed'}
                </span>
                <span
                  className={`font-mono text-[11px] uppercase px-2 py-0.5 rounded-sm border ${
                    otherConfirmedAt
                      ? 'border-[#c3d1bb] bg-olivetint text-[#3f5236]'
                      : 'border-line bg-paper2 text-ink45'
                  }`}
                >
                  {other?.full_name ?? 'They'} {otherConfirmedAt ? 'confirmed' : 'not confirmed'}
                </span>
              </div>
            </div>
          ) : (
            <p className="t-small text-ink70">
              No meetup agreed yet. Set a public spot and a time — the confirm buttons unlock once
              the time passes.
            </p>
          )}

          <div className="h-px bg-line my-5" />

          {/* confirm */}
          {bothConfirmed ? (
            <Notice tone="olive" icon="check">
              <div className="font-medium">Both sides confirmed — trade complete</div>
              <p className="t-small mt-1">
                {trade.completed_at ? `Completed ${fmt(trade.completed_at)}.` : ''} Leave a rating
                below so your neighbour gets credit.
              </p>
            </Notice>
          ) : (
            <div>
              <Button
                disabled={pending || !trade.meetup_at || !due || Boolean(myConfirmedAt)}
                onClick={() =>
                  run(() => confirmTrade({ tradeId: trade.id }), 'Meetup confirmed on your side')
                }
              >
                {myConfirmedAt ? 'You confirmed' : 'I picked up my side'}
              </Button>
              <p className="t-meta mt-2">
                {!trade.meetup_at
                  ? 'Set a meetup first — confirmation opens once a time is agreed.'
                  : !due
                    ? 'Confirmation unlocks at or after the agreed time.'
                    : myConfirmedAt
                      ? 'Waiting for the other side. This cannot be undone.'
                      : 'Only press this once the swap actually happened — it cannot be undone.'}
              </p>
            </div>
          )}
        </div>

        {/* right column: trader card, checklist, dispute, rating */}
        <div className="space-y-5">
          <div className="border border-line rounded-md bg-surface p-5">
            <div className="t-label mb-3">Your trading partner</div>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={other?.avatar_url ?? '/assets/avatar-2.svg'}
                alt=""
                className="w-14 h-14 rounded-full object-cover bg-paper2 border border-line flex-none"
              />
              <div className="min-w-0">
                <Link
                  href={`/members/${other?.id ?? ''}`}
                  className="text-[15.5px] font-medium hover:text-accent"
                >
                  {other?.full_name ?? 'A neighbour'}
                </Link>
                <div className="t-meta mt-0.5">
                  {other?.avg_rating
                    ? `★ ${other.avg_rating.toFixed(1)} · `
                    : ''}
                  {other?.completed_trades ?? 0} trades completed
                </div>
              </div>
            </div>
          </div>

          <div className="border border-line rounded-md bg-surface p-5">
            <div className="t-label mb-3">Meetup checklist</div>
            <ul className="space-y-2 t-small text-ink70">
              {[
                'Meet in daylight at the agreed public spot.',
                'Inspect both items before handing anything over.',
                'Bring a friend if you prefer — you are welcome to.',
                'No cash, ever — report anyone who asks.',
              ].map((c) => (
                <li key={c} className="flex gap-2.5">
                  <Icon name="check" size={14} className="mt-0.5 flex-none text-olive" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* rating */}
          {trade.status === 'completed' ? (
            <div className="border border-line rounded-md bg-surface p-5">
              <div className="t-label mb-3">Rate this trade</div>
              {myRating ? (
                <p className="t-small text-ink70">
                  You rated this trade {myRating.stars}/5 — thank you.
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!stars) {
                      show('Pick 1 to 5 stars.', 'danger')
                      return
                    }
                    run(
                      () =>
                        rateTrade({
                          tradeId: trade.id,
                          stars,
                          comment: comment.trim() || undefined,
                        }),
                      'Rating saved',
                    )
                    setStars(0)
                    setComment('')
                  }}
                  className="space-y-3"
                >
                  <div className="flex gap-1.5" role="radiogroup" aria-label="Stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} star${n === 1 ? '' : 's'}`}
                        onClick={() => setStars(n)}
                        className={`text-xl leading-none transition-colors ${
                          n <= stars ? 'text-brass' : 'text-linestrong hover:text-ink45'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <Field label="Comment (optional)">
                    <Textarea
                      rows={3}
                      maxLength={500}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </Field>
                  <Button size="sm" loading={pending}>
                    Save rating
                  </Button>
                </form>
              )}
            </div>
          ) : null}

          {isOpen && trade.status !== 'completed' ? (
            <div className="border border-line rounded-md bg-paper2 p-5">
              <div className="t-label mb-2">It did not happen?</div>
              <p className="t-small text-ink70 mb-3">
                If the other side did not show, or the item was not as agreed, tell us — a
                moderator reviews every case.
              </p>
              <Button variant="secondary" size="sm" onClick={() => setDisputing(true)}>
                Report a problem
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {disputing ? (
      <Dialog
        title="Report a problem with this trade"
        blurb="Tell us what happened. Filing a dispute pauses the trade until a moderator reviews it."
        tone="danger"
        icon="flag"
        onClose={() => setDisputing(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDisputing(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={pending || disputeReason.trim().length < 10}
              onClick={() =>
                run(
                  () => disputeTrade({ tradeId: trade.id, reason: disputeReason.trim() }),
                  'Dispute filed — a moderator will review it',
                )
              }
            >
              File dispute
            </Button>
          </>
        }
      >
        <Field
          label="What happened"
          required
          hint={`${disputeReason.length}/500 — at least 10 characters`}
        >
          <Textarea
            rows={4}
            maxLength={500}
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="We met at the plaza but the item was broken and they left…"
          />
        </Field>
      </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </div>
  )
}
