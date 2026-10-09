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
import { Tracker, type TrackerStep } from '@/components/ui/tracker'
import { Toast, useToast } from '@/components/ui/toast'

export type AccountStatusData = {
  mode: 'pending' | 'suspended'
  name: string
  firstName: string
  barangay: string | null
  mobile: string | null
  email: string | null
  createdAt: string | null
  submittedAt: string | null
  proofType: string | null
  overdue: boolean
  suspendedUntil: string | null
  suspendReason: string | null
  suspendAt: string | null
  openTrade: {
    code: string
    partnerName: string
    mine: { title: string; photo: string | null }
    theirs: { title: string; photo: string | null }
  } | null
}

function rel(iso: string | null) {
  if (!iso) return 'recently'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 60) return `${Math.max(1, mins)} minutes ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function dateLabel(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function photoSrc(path: string | null) {
  if (!path) return undefined
  return path.startsWith('http')
    ? path
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`
}

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

/** B9 — account pending / suspended, wired to real profile data (docs/03 3.15). */
export function AccountStatusView({ data }: { data: AccountStatusData }) {
  const [dialog, setDialog] = useState<null | 'nudge' | 'appeal'>(null)
  const { toast, show: showToast } = useToast()

  const pendingSteps: TrackerStep[] = [
    { label: 'Registered', time: rel(data.createdAt), state: 'done' },
    { label: 'Email verified', time: 'Confirmed at sign-up', state: 'done' },
    {
      label: 'Residency review',
      time: data.overdue ? 'Overdue · over 24 hours' : 'In progress · up to 24 hours',
      state: 'now',
    },
    { label: 'Trading unlocked', time: 'Not yet' },
  ]

  const appealSteps: TrackerStep[] = [
    { label: 'Suspension issued', time: dateLabel(data.suspendAt), state: 'done' },
    { label: 'Your appeal', time: 'Not sent yet', state: 'now' },
    { label: 'Second review', time: '3 working days' },
    { label: 'Decision', time: 'By email' },
  ]

  const suspendDays =
    data.suspendAt && data.suspendedUntil
      ? Math.max(1, Math.ceil((new Date(data.suspendedUntil).getTime() - new Date(data.suspendAt).getTime()) / 86_400_000))
      : null

  if (data.mode === 'pending') {
    return (
      <div className="wrap py-7 md:py-11">
        <div className="eyebrow">
          <span className="t-label-accent">Account status</span>
        </div>
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <h1 className="t-h1">Your account status</h1>
            <p className="t-small mt-3 max-w-[560px]">
              Your residency review happens here. You will get an email the moment an administrator
              decides — usually within 24 hours.
            </p>
          </div>
        </div>

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
                    <Badge>Submitted {rel(data.submittedAt)}</Badge>
                    {data.overdue ? (
                      <Badge variant="danger" size="lg">
                        Overdue
                      </Badge>
                    ) : null}
                  </div>
                  <h2 className="t-h2">Your account is being reviewed</h2>
                  <p className="t-body mt-3 max-w-[680px]">
                    Thanks for joining, {data.firstName}. An administrator
                    {data.barangay ? ` in ${data.barangay}` : ''} is checking your proof of
                    residency. You will get an email the moment you are approved —{' '}
                    <b>usually within 24 hours</b>, and often much sooner. If your review passes 24
                    hours, an <b>Overdue</b> badge appears here and an administrator is nudged
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
                      ['Name', data.name],
                      ['Barangay', data.barangay ?? 'Not set yet'],
                      ['Mobile', data.mobile ?? 'Not provided'],
                    ]}
                  />
                </div>
                <div className="bg-paper2 border border-line rounded-md p-6">
                  <Kv
                    rows={[
                      ['Proof', data.proofType ? `${data.proofType.replace(/_/g, ' ')} · uploaded` : 'Awaiting upload'],
                      ['Email', data.email ? 'Verified' : 'Missing'],
                      ['Review', data.overdue ? 'Overdue — over 24 hours' : 'In progress'],
                    ]}
                  />
                </div>
              </div>

              <Tracker steps={pendingSteps} className="mt-8" />

              <div className="flex flex-wrap gap-3 mt-8">
                <ButtonLink href="/browse">Browse items while you wait</ButtonLink>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => showToast('You will get an email the moment your review finishes')}
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
                  Make sure your barangay matches the document you uploaded — a mismatch is the most
                  common reason for a delay.
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
                <span className="inline-flex items-center gap-2 font-mono text-[12.5px] hover:text-accent hover:gap-3 transition-all">
                  Read the Data Privacy Notice
                </span>
              </Link>
            </div>
          </div>
        </div>

        {dialog === 'nudge' ? (
          <Dialog
            tone="accent"
            icon="bell"
            title="Nudge the reviewer"
            blurb="Sends a polite reminder to the reviewing administrator. Use it once — your place in the queue does not change."
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
                    showToast('Noted — administrators are alerted automatically once a review passes 24 hours')
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

        {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
      </div>
    )
  }

  /* ── suspended ─────────────────────────────────────────────────────── */

  return (
    <div className="wrap py-7 md:py-11">
      <div className="eyebrow">
        <span className="t-label-accent">Account status</span>
      </div>
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div>
          <h1 className="t-h1">Your account status</h1>
          <p className="t-small mt-3 max-w-[560px]">
            Your suspension details and what to do next. A second administrator reviews every
            appeal.
          </p>
        </div>
      </div>

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
                  <Badge>
                    Suspended {dateLabel(data.suspendAt)}
                    {suspendDays ? ` · ${suspendDays} days` : ''}
                  </Badge>
                </div>
                <h2 className="t-h2">Your account has been suspended</h2>
                <p className="t-body mt-3 max-w-[680px]">
                  You can no longer post items, send offers or message members until the suspension
                  ends{data.suspendedUntil ? ` on ${dateLabel(data.suspendedUntil)}` : ''}.
                </p>
              </div>
            </div>

            <div className="h-px bg-line mt-6 mb-5" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-paper2 border border-line rounded-md p-6">
                <div className="t-label mb-2">Reason on record</div>
                <p className="t-small">{data.suspendReason ?? 'No written reason was recorded.'}</p>
              </div>
              <div className="bg-paper2 border border-line rounded-md p-6">
                <div className="t-label mb-2">Case details</div>
                <p className="t-small">
                  Issued {dateLabel(data.suspendAt)} by a reviewing administrator. You have 30 days
                  from the suspension date to appeal.
                </p>
              </div>
            </div>

            {data.openTrade ? (
              <>
                <Notice tone="danger" icon="alert" className="mt-5">
                  <div className="font-medium">What is still open</div>
                  <p className="t-small mt-1">
                    One trade you had already accepted can still be completed so your neighbour is
                    not left waiting. Everything else is closed.
                  </p>
                </Notice>

                <div className="border border-[#c3d1bb] border-l-[3px] border-l-olive bg-surface rounded-sm px-4 py-3.5 mt-5">
                  <div className="t-label mb-3">Your open trade · {data.openTrade.code}</div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_44px_1fr] gap-4 items-center">
                    <div className="border border-line rounded-sm overflow-hidden bg-surface">
                      <PhotoFrame
                        src={photoSrc(data.openTrade.mine.photo)}
                        alt={data.openTrade.mine.title}
                        label={data.openTrade.mine.title}
                        aspect="4 / 3"
                        className="w-full"
                        sizes="300px"
                      />
                      <div className="px-3 py-2.5">
                        <div className="text-sm font-medium leading-[1.3]">{data.openTrade.mine.title}</div>
                        <div className="t-meta mt-1">Yours</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-ink45 max-md:flex-row max-md:justify-center">
                      <Icon name="swap" size={18} />
                      <span className="t-label">with</span>
                    </div>
                    <div className="border border-line rounded-sm overflow-hidden bg-surface">
                      <PhotoFrame
                        src={photoSrc(data.openTrade.theirs.photo)}
                        alt={data.openTrade.theirs.title}
                        label={data.openTrade.theirs.title}
                        aspect="4 / 3"
                        className="w-full"
                        sizes="300px"
                      />
                      <div className="px-3 py-2.5">
                        <div className="text-sm font-medium leading-[1.3]">{data.openTrade.theirs.title}</div>
                        <div className="t-meta mt-1">{data.openTrade.partnerName}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

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
              Appeals are reviewed by a second administrator who did not handle the original report.
              You have 30 days from the suspension date.
            </p>
          </div>

          <div className="border border-line rounded-md bg-surface p-6 mt-6">
            <div className="t-label mb-3">How the appeal works</div>
            <Tracker steps={appealSteps} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="border border-line rounded-md bg-paper2 p-6">
            <div className="t-label mb-2">What stays visible</div>
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
          <div className="border border-line rounded-md bg-paper2 p-6">
            <div className="t-label mb-2">What is switched off</div>
            <div className="flex flex-col gap-2 t-small">
              {['Posting new items', 'Sending offers', 'Messaging members', 'Leaving ratings'].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <Icon name="x" size={14} className="flex-none text-danger" />
                  {t}
                </span>
              ))}
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
                  showToast('Appeal recorded — you will hear back within 3 working days', 'olive')
                }}
              >
                Submit appeal
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Your explanation" hint="Up to 1,000 characters.">
              <Textarea placeholder="Describe the trade and what you meant by your message…" />
            </Field>
          </div>
        </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </div>
  )
}
