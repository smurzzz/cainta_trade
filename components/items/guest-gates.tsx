'use client'

import { useState } from 'react'
import { ButtonLink } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'

/** Guest gate panel: one primary action, two gate dialogs (mockup a3 right rail).
 *  Copy adapts to the listing status (docs/03 3.15 — no mock assumptions). */
export function GuestGate({ status = 'available' }: { status?: string }) {
  const [saveOpen, setSaveOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const headline =
    status === 'pending' || status === 'exchanged'
      ? 'Log in to save or follow this trade'
      : 'Log in to save or offer on this item'
  const blurb =
    status === 'pending'
      ? 'This listing already has an accepted offer, so new offers are closed until the trade completes or is cancelled. Log in to save it, message the owner about similar items, or report a problem.'
      : status === 'exchanged'
        ? 'This item has already been exchanged. Log in to save the member, browse similar items, or report a problem.'
        : 'Log in to save this item, make an offer when you are a verified resident, and message the owner inside the platform. You can also report a problem with the listing.'

  return (
    <>
      <div className="border border-line rounded-md bg-surface p-6">
        <div className="t-h3 mb-2">{headline}</div>
        <p className="t-small">{blurb}</p>
        <ButtonLink href="/sign-in" block className="mt-5">
          Log in to save
        </ButtonLink>
        <ButtonLink href="/sign-up" variant="secondary" block className="mt-2">
          Create a free account
        </ButtonLink>
        <button
          type="button"
          onClick={() => setSaveOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 min-h-[46px] mt-2 font-mono text-[13px] text-ink70 hover:text-ink"
        >
          <Icon name="heart" size={15} />
          Save for later
        </button>
        <div className="h-px bg-line my-5" />
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="inline-flex items-center gap-2 font-mono text-[12.5px] hover:text-accent hover:gap-3 transition-all"
        >
          <Icon name="flag" size={15} />
          Report this listing
        </button>
      </div>

      {saveOpen ? (
        <Dialog
          title="Save this item to your wishlist"
          blurb="A free account keeps your saved items, offers and messages in one place."
          tone="accent"
          icon="heart"
          onClose={() => setSaveOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setSaveOpen(false)} className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 rounded-sm font-mono text-[13px] text-ink70 hover:bg-paper2">
                Keep browsing
              </button>
              <ButtonLink href="/sign-in">Log in</ButtonLink>
            </>
          }
        >
          <div className="flex gap-3 items-start border border-line border-l-[3px] border-l-ink bg-surface rounded-sm px-4 py-3.5">
            <Icon name="info" size={18} className="mt-0.5 flex-none" />
            <span className="t-small">
              You are browsing as a guest. Signing in takes about a minute if you already
              registered.
            </span>
          </div>
        </Dialog>
      ) : null}

      {reportOpen ? (
        <Dialog
          title="Report this listing"
          blurb="Tell us what is wrong and an administrator will review it within a day."
          tone="danger"
          icon="flag"
          onClose={() => setReportOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setReportOpen(false)} className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 rounded-sm font-mono text-[13px] text-ink70 hover:bg-paper2">
                Cancel
              </button>
              <ButtonLink href="/sign-in">Continue to report</ButtonLink>
            </>
          }
        >
          <div className="mb-4">
            <span className="font-mono text-[12.5px] tracking-[0.02em] block mb-2">Reason</span>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
              {['Prohibited item', 'Suspected scam', 'Wrong category', 'Other'].map((r, i) => (
                <span
                  key={r}
                  className={`border rounded-sm px-3.5 py-3.5 text-sm flex items-center gap-2.5 bg-surface ${
                    i === 0 ? 'border-ink bg-paper2' : 'border-linestrong'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full border flex-none ${i === 0 ? 'border-[5px] border-ink bg-surface' : 'border-linestrong'}`} />
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="font-mono text-[12.5px] tracking-[0.02em] block mb-2">Details</span>
            <textarea
              placeholder="Describe what you noticed…"
              className="w-full min-h-[128px] resize-y px-3.5 py-3 bg-surface border border-linestrong rounded-sm text-[15.5px] text-ink placeholder:text-ink45 focus:outline-none focus:border-ink focus:shadow-[0_0_0_3px_rgba(200,69,42,.18)]"
            />
          </div>
        </Dialog>
      ) : null}
    </>
  )
}
