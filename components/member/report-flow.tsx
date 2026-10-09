'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Check, Field, Input, Textarea } from '@/components/ui/field'
import { Notice } from '@/components/ui/feedback'
import { Toast, useToast } from '@/components/ui/toast'
import { createReport } from '@/actions/moderation'
import { REPORT_REASONS } from '@/lib/validators/report'

const REASON_LABELS: Record<string, string> = {
  prohibited: 'Prohibited item (weapons, animals, anything illegal)',
  asking_money: 'Asking for money or delivery',
  scam: 'Suspected scam or impersonation',
  not_as_described: 'Item not as described',
  duplicate: 'Duplicate listing',
  harassment: 'Harassment or abusive behaviour',
  moved_outside: 'Trader lives outside Cainta',
  other: 'Something else',
}

const TYPE_LABELS: Record<string, string> = {
  listing: 'A listing',
  member: 'A member',
  message: 'A message',
}

/** docs/02 C23 · one-page report form with a step rail. Submits through
 *  createReport (zod-validated, rate-limited). */
export function ReportFlow({
  initialType,
  initialTarget,
}: {
  initialType: string
  initialTarget: string
}) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [type, setType] = useState(initialType)
  const [target, setTarget] = useState(initialTarget)
  const [reason, setReason] = useState('not_as_described')
  const [details, setDetails] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [attachChat, setAttachChat] = useState(false)
  const [done, setDone] = useState(false)
  const [globalMsg, setGlobalMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalMsg(null)
    if (target.trim().length < 6) {
      setGlobalMsg('Paste the listing, member or message reference — it is on the page you are reporting.')
      return
    }
    startTransition(async () => {
      const res = await createReport({
        targetType: type as 'listing' | 'member' | 'message',
        targetId: target.trim(),
        reason: reason as (typeof REPORT_REASONS)[number],
        details: details.trim() || undefined,
        isAnonymous: anonymous,
        attachChat: type === 'message' && attachChat,
      })
      if (!res.ok) {
        setGlobalMsg(res.error)
        return
      }
      setDone(true)
      show('Report filed — thank you')
      router.refresh()
    })
  }

  if (done) {
    return (
      <Notice tone="olive" icon="check">
        <div className="font-medium">Report received</div>
        <p className="t-small mt-1">
          A moderator reviews every report, oldest first, usually within a day. You will get the
          outcome by email (or in-app if you turned that off). Nothing you reported is shown to the
          other member.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <ButtonLink href="/browse" size="sm">
            Back to browse
          </ButtonLink>
          <ButtonLink href="/notifications" size="sm" variant="secondary">
            My notifications
          </ButtonLink>
        </div>
      </Notice>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {globalMsg ? (
        <Notice tone="danger" icon="alert">
          <div className="font-medium">We could not file that report</div>
          <p className="t-small mt-1">{globalMsg} Reference: CT-RPT-406</p>
        </Notice>
      ) : null}

      <section className="border border-line rounded-md bg-surface p-6">
        <div className="t-h3 mb-4">1 · What are you reporting?</div>
        <div className="flex flex-wrap gap-2.5">
          {(['listing', 'member', 'message'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-4 py-2.5 rounded-sm border font-mono text-[13px] transition-colors ${
                type === t
                  ? 'border-ink bg-ink text-paper'
                  : 'border-linestrong text-ink70 hover:border-ink hover:text-ink'
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <Field
            label="Reference"
            required
            hint="The listing code, member link or message link you are reporting."
          >
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={type === 'listing' ? 'CT-123-ABCD' : 'Paste the link or ID'}
            />
          </Field>
        </div>
      </section>

      <section className="border border-line rounded-md bg-surface p-6">
        <div className="t-h3 mb-4">2 · Why?</div>
        <div className="space-y-2.5" role="radiogroup" aria-label="Report reason">
          {REPORT_REASONS.map((r) => (
            <label
              key={r}
              className={`flex items-start gap-3 border rounded-sm p-3.5 cursor-pointer transition-colors ${
                reason === r ? 'border-ink bg-paper2' : 'border-line hover:border-linestrong'
              }`}
            >
              <input
                type="radio"
                name="reason"
                className="sr-only"
                checked={reason === r}
                onChange={() => setReason(r)}
              />
              <span
                className={`w-4.5 h-4.5 mt-0.5 rounded-full border flex-none inline-flex items-center justify-center ${
                  reason === r ? 'bg-ink border-ink' : 'border-linestrong'
                }`}
                style={{ width: 18, height: 18 }}
              >
                {reason === r ? <span className="w-2 h-2 rounded-full bg-paper" /> : null}
              </span>
              <span className="text-[14.5px] text-ink">{REASON_LABELS[r]}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="border border-line rounded-md bg-surface p-6">
        <div className="t-h3 mb-4">3 · What happened?</div>
        <Field
          label="Details (optional)"
          hint={`${details.length}/1000 — screenshots and chat links help a moderator decide`}
        >
          <Textarea
            rows={5}
            maxLength={1000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="They asked for a GCash payment before meeting, then stopped replying…"
          />
        </Field>

        <div className="mt-4 space-y-3">
          {type === 'message' ? (
            <Check checked={attachChat} onChange={(e) => setAttachChat(e.target.checked)}>
              Attach the conversation transcript
            </Check>
          ) : null}
          <Check checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)}>
            Keep my report anonymous to the other member (always on for moderators&apos; eyes only)
          </Check>
        </div>
      </section>

      <section className="border border-line rounded-md bg-paper2 p-6">
        <div className="t-h3 mb-2">4 · What happens next</div>
        <ol className="space-y-2 t-small text-ink70">
          <li>1. A moderator reviews the report — oldest first, urgent ones jump the queue.</li>
          <li>2. They can dismiss it, warn the member, remove a listing or suspend the account.</li>
          <li>3. You get the outcome. Repeat abuse is logged against the member&apos;s history.</li>
        </ol>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" loading={pending}>
          File this report
        </Button>
        <ButtonLink href="/browse" variant="ghost" size="lg">
          Cancel
        </ButtonLink>
      </div>

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </form>
  )
}
