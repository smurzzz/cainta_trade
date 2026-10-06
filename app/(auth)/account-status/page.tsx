'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button, ButtonLink } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Textarea } from '@/components/ui/field'
import { Notice } from '@/components/ui/feedback'
import { Icon } from '@/components/ui/icon'
import { PhotoFrame } from '@/components/ui/item-card'
import { LinkArrow, Segmented } from '@/components/ui/tabs'
import { Tracker, type TrackerStep } from '@/components/ui/tracker'
import { Toast, useToast } from '@/components/ui/toast'
import { imgUrl } from '@/lib/mock/images'

const PENDING_STEPS: TrackerStep[] = [
  { label: 'Registered', time: 'Today, 9:14 am', state: 'done' },
  { label: 'Email verified', time: 'Today, 9:16 am', state: 'done' },
  { label: 'Residency review', time: 'In progress · up to 24 hours', state: 'now' },
  { label: 'Trading unlocked', time: 'Not yet' },
]

const APPEAL_STEPS: TrackerStep[] = [
  { label: 'Suspension issued', time: '3 Oct', state: 'done' },
  { label: 'Your appeal', time: 'Not sent yet', state: 'now' },
  { label: 'Second review', time: '3 working days' },
  { label: 'Decision', time: 'By email' },
]

function Kv({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[168px_minmax(0,1fr)] gap-x-5 gap-y-0.5 text-[14.5px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <span className="font-mono text-[11.5px] tracking-[0.02em] uppercase text-ink45 pt-1">
            {k}
          </span>
          <span className="text-ink pb-3 md:pb-0">{v}</span>
        </div>
      ))}
    </div>
  )
}

/** B9 — account pending / suspended (mockup b9-account-status.html). */
export default function AccountStatusPage() {
  const [mode, setMode] = useState<'pending' | 'suspended'>('pending')
  const [dialog, setDialog] = useState<null | 'nudge' | 'appeal'>(null)
  const { toast, show: showToast } = useToast()

  return (
    <div className="wrap py-7 md:py-11">
      <div className="eyebrow">
        <span className="t-label-accent">Account status</span>
      </div>
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div>
          <h1 className="t-h1">Your account status</h1>
          <p className="t-small mt-3 max-w-[560px]">
            Two states can stand between you and the trading floor: waiting for approval, or a
            suspended account. Both are shown below, side by side.
          </p>
        </div>
        <Segmented
          options={[
            { id: 'pending', label: 'Pending approval' },
            { id: 'suspended', label: 'Suspended' },
          ]}
          active={mode}
          onSelect={(id) => setMode(id as 'pending' | 'suspended')}
        />
      </div>

      {mode === 'pending' ? (
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px] mt-2 items-start">
          <div>
            <div className="bg-surface border border-line rounded-md p-6">
              <div className="flex gap-4 items-start">
                <span className="w-[52px] h-[52px] rounded-full bg-accenttint text-accent flex items-center justify-center flex-none">
                  <Icon name="clock" size={22} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 flex-wrap mb-2">
                    <Badge variant="pending" size="lg">
                      <span className="w-[7px] h-[7px] rounded-full bg-accent" />
                      Pending approval
                    </Badge>
                    <Badge>Submitted 3 hours ago</Badge>
                  </div>
                  <h2 className="t-h2">Your account is being reviewed</h2>
                  <p className="t-body mt-3 max-w-[680px]">
                    Thanks for joining, Marites. An administrator in San Juan is checking your
                    proof of residency. You will get an email the moment you are approved —{' '}
                    <b>usually within 24 hours</b>, and often much sooner. If your review passes
                    24 hours, an <b>Overdue</b> badge appears here and an administrator is nudged
                    automatically.
                  </p>
                </div>
              </div>

              <div className="h-px bg-line mt-6 mb-5" />

              <div className="t-label mb-3">What we received</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-paper2 border border-line rounded-md p-6">
                  <Kv
                    rows={[
                      ['Name', 'Marites Bautista'],
                      ['Barangay', 'San Juan'],
                      ['Mobile', '+63 917 448 2210'],
                    ]}
                  />
                </div>
                <div className="bg-paper2 border border-line rounded-md p-6">
                  <Kv
                    rows={[
                      ['Proof', 'Barangay ID · uploaded'],
                      ['Email', 'Verified'],
                      ['Consent', 'Terms & privacy accepted'],
                    ]}
                  />
                </div>
              </div>

              <Tracker steps={PENDING_STEPS} className="mt-8" />

              <div className="flex flex-wrap gap-3 mt-8">
                <ButtonLink href="/browse">Browse items while you wait</ButtonLink>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => showToast('We re-sent the approval details to your email')}
                >
                  Resend my details
                </Button>
                <Button type="button" variant="ghost" onClick={() => setDialog('nudge')}>
                  Nudge the reviewer
                </Button>
              </div>
            </div>

            <Notice className="mt-6" icon="shield">
              <div className="font-medium">What you can do right now</div>
              <p className="t-small mt-1">
                Browse and search, save up to 10 items to a wishlist, and read the safety guide.
                Posting, offering and messaging other members unlock the moment you are approved.
              </p>
            </Notice>
          </div>

          <div className="flex flex-col gap-4">
            <div className="border border-[#e8cfc6] rounded-md bg-accenttint p-6">
              <div className="t-label-accent mb-2">Why we check</div>
              <p className="t-small">
                CaintaTrade only works if everyone is genuinely a Cainta resident. One document is
                enough, it is seen only by the reviewing administrator, and it is deleted 90 days
                after approval.
              </p>
            </div>
            <div className="border border-line rounded-md bg-surface p-6">
              <div className="t-label mb-3">Waiting longer than expected?</div>
              <div className="flex flex-col gap-3">
                <span className="t-small">Check the spam folder for the approval email.</span>
                <span className="t-small">
                  Make sure your barangay matches the document you uploaded — a mismatch is the
                  most common reason for a delay.
                </span>
                <span className="t-small">
                  If it has been over 24 hours, reply to your registration email with “Residency
                  review”.
                </span>
              </div>
              <ButtonLink href="/how-it-works#faq" variant="secondary" block className="mt-5">
                Read the registration FAQ
              </ButtonLink>
            </div>
            <div className="border border-line rounded-md bg-paper2 p-6">
              <div className="t-label mb-2">Your data</div>
              <p className="t-small">
                Your residency document is stored privately and deleted 90 days after approval. You
                can withdraw your application at any time in Settings.
              </p>
              <Link href="/legal#privacy" className="inline-block mt-3">
                <LinkArrow>Read the Data Privacy Notice</LinkArrow>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px] mt-2 items-start">
          <div>
            <div className="bg-surface border border-[#e2b9b2] rounded-md p-6">
              <div className="flex gap-4 items-start">
                <span className="w-[52px] h-[52px] rounded-full bg-dangertint text-danger flex items-center justify-center flex-none">
                  <Icon name="alert" size={22} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 flex-wrap mb-2">
                    <Badge variant="danger" size="lg">
                      <span className="w-[7px] h-[7px] rounded-full bg-danger" />
                      Suspended
                    </Badge>
                    <Badge>Suspended 3 Oct 2026 · 7 days</Badge>
                  </div>
                  <h2 className="t-h2">Your account has been suspended</h2>
                  <p className="t-body mt-3 max-w-[680px]">
                    You can no longer post items, send offers or message members. This happened
                    after repeated no-shows at agreed meetups — three members reported the same
                    pattern.
                  </p>
                </div>
              </div>

              <div className="h-px bg-line mt-6 mb-5" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-paper2 border border-line rounded-md p-6">
                  <div className="t-label mb-2">Reason on record</div>
                  <p className="t-small">
                    Trading rule 2.3 — repeated no-shows at agreed meetups.
                  </p>
                </div>
                <div className="bg-paper2 border border-line rounded-md p-6">
                  <div className="t-label mb-2">Evidence reviewed</div>
                  <p className="t-small">
                    Three member reports (RP-2026-0388 and RP-2026-0391 upheld, RP-2026-0402 in
                    review) · chat transcript CT-77-0912.
                  </p>
                </div>
              </div>

              <Notice tone="danger" icon="alert" className="mt-5">
                <div className="font-medium">What is still open</div>
                <p className="t-small mt-1">
                  One trade you had already accepted can still be completed so your neighbour is
                  not left waiting. Everything else is closed.
                </p>
              </Notice>

              <div className="border border-[#c3d1bb] rounded-md bg-surface p-6 mt-5">
                <div className="t-label mb-3">Your open trade</div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_44px_1fr] gap-4 items-center">
                  <div className="border border-line rounded-sm overflow-hidden bg-surface">
                    <PhotoFrame
                      src={imgUrl('shell-chair', 400)}
                      alt="Black shell accent chair"
                      aspect="4 / 3"
                      className="w-full"
                      sizes="300px"
                    />
                    <div className="px-3 py-2.5">
                      <div className="text-sm font-medium leading-[1.3]">
                        Black shell accent chair
                      </div>
                      <div className="t-meta mt-1">Yours · San Roque</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 text-ink45 max-md:flex-row max-md:justify-center">
                    <Icon name="swap" size={18} />
                    <span className="t-label">with</span>
                  </div>
                  <div className="border border-line rounded-sm overflow-hidden bg-surface">
                    <PhotoFrame
                      src={imgUrl('tufted-chair', 400)}
                      alt="White tufted vanity chair"
                      aspect="4 / 3"
                      className="w-full"
                      sizes="300px"
                    />
                    <div className="px-3 py-2.5">
                      <div className="text-sm font-medium leading-[1.3]">
                        White tufted vanity chair
                      </div>
                      <div className="t-meta mt-1">Marites B. · San Juan</div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-5">
                  <ButtonLink href="/trades/TR-0918" size="sm">
                    Complete this trade
                  </ButtonLink>
                  <ButtonLink href="/messages" variant="secondary" size="sm">
                    Message Marites
                  </ButtonLink>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-6">
                <Button type="button" onClick={() => setDialog('appeal')}>
                  Appeal this suspension
                </Button>
                <ButtonLink href="/legal#accounts" variant="secondary">
                  Read the account rules
                </ButtonLink>
                <ButtonLink href="/legal#privacy" variant="ghost">
                  Download my data
                </ButtonLink>
              </div>
              <p className="t-meta mt-3">
                Appeals are reviewed by a second administrator who did not handle the original
                report. You have 30 days from the suspension date.
              </p>
            </div>

            <div className="border border-line rounded-md bg-surface p-6 mt-6">
              <div className="t-label mb-3">How the appeal works</div>
              <Tracker steps={APPEAL_STEPS} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="border border-line rounded-md bg-paper2 p-6">
              <div className="t-label mb-3">What stays visible</div>
              <div className="flex flex-col gap-2 t-small">
                {[
                  'Already-accepted trades',
                  'Your messages and records',
                  'Your personal data and settings',
                ].map((t) => (
                  <span key={t} className="flex items-center gap-2">
                    <Icon name="check" size={14} className="flex-none text-olive" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="border border-line rounded-md bg-surface p-6">
              <div className="t-label mb-3">What is switched off</div>
              <div className="flex flex-col gap-2 t-small">
                {['Posting new items', 'Sending offers', 'Messaging members', 'Leaving ratings'].map(
                  (t) => (
                    <span key={t} className="flex items-center gap-2">
                      <Icon name="x" size={14} className="flex-none text-danger" />
                      {t}
                    </span>
                  ),
                )}
              </div>
            </div>
            <Notice tone="brass" icon="phone">
              <span className="t-small">
                Need help now? Call the community desk at the Cainta Municipal Hall (a public LGU
                facility — CaintaTrade is an independent project, not affiliated with the municipal
                government), Monday to Friday, 8am to 5pm.
              </span>
            </Notice>
          </div>
        </div>
      )}

      {dialog === 'nudge' ? (
        <Dialog
          tone="accent"
          icon="bell"
          title="Nudge the reviewer"
          blurb="Sends a polite reminder to the San Juan administrator. Use it once — your place in the queue does not change."
          showClose={false}
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button type="button" variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setDialog(null)
                  showToast('Reminder sent to the San Juan administrator')
                }}
              >
                Send reminder
              </Button>
            </>
          }
        >
          <Field label="Anything we should know?">
            <Textarea placeholder="For example: I am meeting a neighbour on Saturday and would like to be approved before then." />
          </Field>
        </Dialog>
      ) : null}

      {dialog === 'appeal' ? (
        <Dialog
          tone="danger"
          icon="edit"
          title="Appeal your suspension"
          blurb="Explain what happened in your own words. A second administrator who did not handle the original report will read this."
          wide
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button type="button" variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setDialog(null)
                  showToast('Appeal submitted — you will hear back within 3 working days', 'olive')
                }}
              >
                Submit appeal
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field
              label="Your explanation"
              hint="Up to 1,000 characters. You may attach up to three photos of the item or the chat."
            >
              <Textarea placeholder="Describe the trade and what you meant by your message…" />
            </Field>
            <div>
              <span className="font-mono text-[12.5px] tracking-[0.02em] block mb-2">
                Attachments
              </span>
              <div className="flex items-center gap-3 border-[1.5px] border-dashed border-linestrong rounded-sm px-3.5 py-3.5">
                <Icon name="upload" size={18} className="flex-none" />
                <span className="t-small flex-1">Add screenshots or photos (optional)</span>
                <Button type="button" variant="secondary" size="sm">
                  Choose files
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </div>
  )
}
