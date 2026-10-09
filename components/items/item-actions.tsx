'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { Toast, useToast } from '@/components/ui/toast'
import { saveItem, unsaveItem } from '@/actions/wishlist'
import { createReport } from '@/actions/moderation'
import { REPORT_REASONS } from '@/lib/validators/report'

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

/** Signed-in member rail actions (docs/03 3.15): wishlist save toggle and a
 *  real report through createReport(). Guests see <GuestGate /> instead. */
export function ItemActions({
  itemId,
  saved,
  statusKey,
}: {
  itemId: string
  saved: boolean
  statusKey: string
}) {
  const [isSaved, setIsSaved] = useState(saved)
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState<string>('not_as_described')
  const [details, setDetails] = useState('')
  const [pending, startTransition] = useTransition()
  const { toast, show: showToast } = useToast()

  const toggleSave = () => {
    const next = !isSaved
    setIsSaved(next) // optimistic; roll back on failure
    startTransition(async () => {
      const res = next ? await saveItem(itemId) : await unsaveItem(itemId)
      if (!res.ok) {
        setIsSaved(!next)
        showToast(res.error, 'danger')
      } else {
        showToast(next ? 'Saved to your wishlist' : 'Removed from your wishlist')
      }
    })
  }

  const submitReport = () => {
    startTransition(async () => {
      const res = await createReport({
        targetType: 'listing',
        targetId: itemId,
        reason,
        details: details.trim() || undefined,
        isAnonymous: false,
      })
      if (!res.ok) {
        showToast(res.error, 'danger')
        return
      }
      setReporting(false)
      setDetails('')
      showToast('Report filed — a moderator will review it within a day')
    })
  }

  const offersClosed = statusKey === 'pending' || statusKey === 'exchanged' || statusKey === 'paused' || statusKey === 'expired'

  return (
    <>
      <div className="border border-line rounded-md bg-surface p-6">
        <div className="t-h3 mb-2">{offersClosed ? 'This listing is not taking offers' : 'Trade with this neighbour'}</div>
        <p className="t-small">
          {offersClosed
            ? 'The listing is pending or already exchanged. You can still save the member for later, or report a problem.'
            : 'Save it now so you do not lose track, then sign in to send an offer when you are ready. Meeting in public keeps everyone safe.'}
        </p>
        <Button block className="mt-5" onClick={toggleSave} loading={pending}>
          <Icon name="heart" size={15} />
          {isSaved ? 'Saved to wishlist' : 'Save to wishlist'}
        </Button>
        <div className="h-px bg-line my-5" />
        <button
          type="button"
          onClick={() => setReporting(true)}
          className="inline-flex items-center gap-2 font-mono text-[12.5px] hover:text-accent hover:gap-3 transition-all"
        >
          <Icon name="flag" size={15} />
          Report this listing
        </button>
      </div>

      {reporting ? (
        <Dialog
          title="Report this listing"
          blurb="Tell us what is wrong and a moderator will review it within a day."
          tone="danger"
          icon="flag"
          onClose={() => setReporting(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setReporting(false)}>
                Cancel
              </Button>
              <Button onClick={submitReport} loading={pending}>
                Send report
              </Button>
            </>
          }
        >
          <div className="mb-4">
            <span className="font-mono text-[12.5px] tracking-[0.02em] block mb-2">Reason</span>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`border rounded-sm px-3.5 py-3.5 text-sm flex items-center gap-2.5 bg-surface text-left ${
                    reason === r ? 'border-ink bg-paper2' : 'border-linestrong'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full border flex-none ${
                      reason === r ? 'border-[5px] border-ink bg-surface' : 'border-linestrong'
                    }`}
                  />
                  {REASON_LABELS[r] ?? r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="font-mono text-[12.5px] tracking-[0.02em] block mb-2">Details</span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
              placeholder="Describe what you noticed…"
              className="w-full min-h-[128px] resize-y px-3.5 py-3 bg-surface border border-linestrong rounded-sm text-[15.5px] text-ink placeholder:text-ink45 focus:outline-none focus:border-ink focus:shadow-[0_0_0_3px_rgba(200,69,42,.18)]"
            />
          </div>
        </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
