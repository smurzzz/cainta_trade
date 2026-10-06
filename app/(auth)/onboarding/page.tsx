'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSignUp } from '@clerk/nextjs'
import { Button, ButtonLink } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { CodeInput } from '@/components/ui/auth-fields'
import { Dialog } from '@/components/ui/dialog'
import { Notice, Skeleton } from '@/components/ui/feedback'
import { Icon } from '@/components/ui/icon'
import { Toast, useToast } from '@/components/ui/toast'
import { loadDraft } from '@/lib/register-draft'

type Phase = 'form' | 'loading' | 'error'

const CONSENTS = [
  {
    required: true,
    text: (
      <>
        I am <b className="font-semibold text-ink">18 years old or older</b> and I live in one of
        the seven barangays of Cainta.
      </>
    ),
  },
  {
    required: true,
    text: (
      <>
        I have read and accept the{' '}
        <Link href="/legal" className="underline underline-offset-[3px] hover:text-accent">
          Terms of Use
        </Link>{' '}
        and I will follow the community rules and the no-payment rule.
      </>
    ),
  },
  {
    required: true,
    text: (
      <>
        I consent to CaintaTrade processing my personal information as described in the{' '}
        <Link href="/legal#privacy" className="underline underline-offset-[3px] hover:text-accent">
          Data Privacy Notice
        </Link>
        , in accordance with RA 10173.
      </>
    ),
  },
  {
    required: false,
    text: (
      <>
        Send me occasional email updates about community trade events in Cainta.{' '}
        <span className="text-ink45">(optional)</span>
      </>
    ),
  },
]

const SIDE = {
  why: 'Trading with a neighbour only works if everyone is really from Cainta. One document is enough, it is seen only by an administrator, and it is deleted 90 days after your account is approved.',
  requirements: [
    ['Age', '18+ only'],
    ['Residency', 'One of the 7 Cainta barangays'],
    ['Proof', 'Barangay ID, bill or lease'],
    ['Review', 'Within 24 hours'],
    ['Cost', 'Free, always'],
  ],
}

/** Onboarding = register step 2 (docs/08 #9): residency proof + consent, then
 *  email verification via the mockup's olive dialog (headless Clerk, docs/08 #10). */
export default function OnboardingPage() {
  const router = useRouter()
  const { signUp, errors } = useSignUp()
  const { toast, show } = useToast()

  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [checks, setChecks] = useState<boolean[]>([false, false, false, false])
  const [submitted, setSubmitted] = useState(false)

  const [phase, setPhase] = useState<Phase>('form')
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState('your email')

  const [verifyOpen, setVerifyOpen] = useState(false)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  const requiredOk = CONSENTS.every((c, i) => (c.required ? checks[i] : true))

  async function resendEmail() {
    if (!signUp) return
    const { error } = await signUp.verifications.sendEmailCode()
    show(
      error ? error.longMessage || error.message : 'Verification email sent again',
      error ? 'danger' : 'ink',
    )
  }

  async function createAccount() {
    if (!signUp) {
      setSubmitErr(
        'We could not find your details from step 1 — go back to step 1 and try again.',
      )
      setPhase('error')
      return
    }
    setPhase('loading')
    setSubmitErr(null)

    // Step-1 details (never the password) for the account metadata.
    const draft = loadDraft()
    const { error: updateErr } = await signUp.update({
      legalAccepted: true,
      unsafeMetadata: {
        ...(draft
          ? { mobile: draft.mobile, barangay: draft.barangay, street: draft.street }
          : {}),
        proof: fileName ?? undefined,
        emailUpdates: checks[3],
      },
    })
    if (updateErr) {
      setSubmitErr(updateErr.longMessage || updateErr.message)
      setPhase('error')
      return
    }

    // Instance without email verification completes the sign-up right away.
    if (signUp.status === 'complete') {
      await signUp.finalize()
      show('Email verified — your account is now waiting for approval', 'olive')
      router.push('/account-status')
      return
    }

    const { error: sendErr } = await signUp.verifications.sendEmailCode()
    if (sendErr) {
      setSubmitErr(sendErr.longMessage || sendErr.message)
      setPhase('error')
      return
    }
    setCode('')
    setSentTo(draft?.email ?? 'your email')
    setVerifyOpen(true)
    setPhase('form')
  }

  async function verifyEmail() {
    if (!signUp) return
    if (code.trim().length !== 6) {
      show('Enter the 6-digit code from your email', 'danger')
      return
    }
    setVerifying(true)
    const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() })
    if (error) {
      setVerifying(false)
      show(error.longMessage || error.message, 'danger')
      return
    }
    const { error: finalizeErr } = await signUp.finalize()
    setVerifying(false)
    if (finalizeErr) {
      show(finalizeErr.longMessage || finalizeErr.message, 'danger')
      return
    }
    setVerifyOpen(false)
    show('Email verified — your account is now waiting for approval', 'olive')
    router.push('/account-status')
  }

  if (submitted) {
    return (
      <>
        <div className="wrap py-7 md:py-11">
          <div className="max-w-[680px] border border-line rounded-md bg-surface p-6 text-center">
            <div className="w-[88px] h-[88px] mx-auto mb-5 rounded-full bg-olivetint text-olive flex items-center justify-center">
              <Icon name="check" size={30} />
            </div>
            <div className="font-display text-xl uppercase mb-2">Almost there — check your email</div>
            <p className="t-small max-w-[560px] mx-auto">
              We sent a verification link to{' '}
              <b className="text-ink font-semibold">{sentTo}</b>. Tap it, then an administrator
              reviews your proof of residency. You usually hear back within 24 hours.
            </p>
            <div className="flex flex-wrap gap-2 mt-5 justify-center">
              <ButtonLink href="/account-status">See what happens next</ButtonLink>
              <Button variant="secondary" type="button" onClick={resendEmail}>
                Resend the email
              </Button>
            </div>
          </div>
        </div>
        {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
      </>
    )
  }

  return (
    <>
      <div className="wrap py-7 md:py-11">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_340px] items-start">
          <div className="max-w-[680px]">
            <div className="eyebrow">
              <span className="t-label-accent">Two steps · about two minutes</span>
            </div>
            <h1 className="t-h1">Join CaintaTrade</h1>
            <p className="t-small mt-3">
              Takes about two minutes. We review every new member so the trading floor stays local
              and real — you will get an email once your account is approved.
            </p>

            {/* step tabs */}
            <div
              className="flex gap-0.5 border-b border-line mt-8 mb-6 overflow-x-auto"
              role="tablist"
              aria-label="Registration steps"
            >
              <Link
                href="/sign-up"
                className="px-4 py-3 font-mono text-xs tracking-[0.02em] uppercase text-ink45 border-b-2 border-transparent hover:text-ink whitespace-nowrap"
              >
                Step 1 · Your details
              </Link>
              <span
                className="px-4 py-3 font-mono text-xs tracking-[0.02em] uppercase text-ink border-b-2 border-accent whitespace-nowrap"
                aria-current="step"
              >
                Step 2 · Proof and consent
              </span>
            </div>

            {/* LOADING STATE (mockup data-panel="loading") */}
            {phase === 'loading' ? (
              <div className="border border-line rounded-md bg-surface p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i}>
                      <Skeleton className="h-3 w-2/5 mb-2" />
                      <Skeleton className="h-12" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 items-center mt-6">
                  <Button type="button" loading>
                    Creating your account
                  </Button>
                  <span className="t-small">
                    Checking your residency document… this usually takes a few seconds.
                  </span>
                </div>
              </div>
            ) : (
              <>
                {/* ERROR STATE (mockup data-panel="error") */}
                {phase === 'error' ? (
                  <Notice tone="danger" icon="alert" className="mb-5">
                    <div className="font-medium">We could not create your account</div>
                    <p className="t-small mt-1">{submitErr}</p>
                  </Notice>
                ) : null}

                <div className="flex flex-col gap-5">
                  <div>
                    <span className="font-mono text-[12.5px] tracking-[0.02em] block mb-2">
                      Proof of residency <span className="text-accent">*</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="block w-full border-[1.5px] border-dashed border-linestrong rounded-md bg-surface py-8 px-6 text-center text-ink70 hover:border-accent hover:bg-accenttint"
                    >
                      <span className="w-11 h-11 mx-auto mb-3 rounded-full border border-linestrong flex items-center justify-center">
                        <Icon name="upload" size={20} />
                      </span>
                      <div>
                        <b className="text-ink font-semibold">Upload a photo or PDF</b>
                      </div>
                      <div className="t-small mt-1">
                        Barangay ID, certificate of residency, utility bill, or a lease contract
                      </div>
                      <div className="t-meta mt-2">
                        JPG, PNG or PDF · up to 5 MB · seen only by administrators
                      </div>
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="sr-only"
                      onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                    />
                    {fileName ? (
                      <div className="flex items-center gap-3 mt-3 border border-line rounded-sm px-3 py-2.5 bg-surface">
                        <span className="inline-flex items-center gap-1.5 px-[9px] py-1 rounded-xs border border-[#c3d1bb] bg-olivetint text-olive font-mono text-[11px] uppercase">
                          <Icon name="check" size={12} /> Uploaded
                        </span>
                        <span className="t-small flex-1 truncate">{fileName}</span>
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="inline-flex items-center justify-center min-h-[36px] px-[13px] rounded-sm font-mono text-xs text-ink70 hover:bg-paper2"
                        >
                          Replace
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <span className="font-mono text-[12.5px] tracking-[0.02em] block mb-2">
                      Consent <span className="text-accent">*</span>
                    </span>
                    <div className="flex flex-col gap-3">
                      {CONSENTS.map((c, i) => (
                        <label
                          key={i}
                          className="flex items-start gap-2.5 text-[14.5px] text-ink70 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checks[i]}
                            onChange={(e) =>
                              setChecks((prev) =>
                                prev.map((v, j) => (j === i ? e.target.checked : v)),
                              )
                            }
                            className="appearance-none w-5 h-5 mt-px flex-none border border-linestrong bg-surface rounded-xs checked:bg-ink checked:border-ink checked:bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%223.4%22%3E%3Cpath d=%22M20 6L9 17l-5-5%22/%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat"
                          />
                          <span>{c.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 items-start border border-[#e3d3ac] border-l-[3px] border-l-brass bg-brasstint rounded-sm px-4 py-3.5">
                    <Icon name="shield" size={18} className="mt-0.5 flex-none" />
                    <div>
                      <div className="font-medium">About the ID or proof you upload</div>
                      <p className="t-small mt-1">
                        Your document is{' '}
                        <b className="text-ink font-semibold">
                          collected only to verify that you live in Cainta
                        </b>
                        . It is{' '}
                        <b className="text-ink font-semibold">visible to administrators only</b> —
                        never to other members, and never shown in your profile. It is kept while
                        your account is under review and{' '}
                        <b className="text-ink font-semibold">
                          deleted within 90 days of approval
                        </b>
                        , after which only a note that you were verified remains. You can ask for
                        it to be deleted sooner at any time in the{' '}
                        <Link
                          href="/legal#privacy"
                          className="underline underline-offset-[3px] hover:text-accent"
                        >
                          Data Privacy Notice
                        </Link>{' '}
                        or by writing to the Data Protection Officer; your account simply goes
                        back to Pending approval.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-8">
                  <Button
                    type="button"
                    size="lg"
                    disabled={!requiredOk || !fileName}
                    onClick={createAccount}
                  >
                    Create my account
                  </Button>
                  <ButtonLink href="/sign-up" variant="secondary" size="lg">
                    Back to step 1
                  </ButtonLink>
                </div>
                {!requiredOk || !fileName ? (
                  <p className="t-meta mt-3">
                    Upload your proof and tick the three required consents to continue.
                  </p>
                ) : null}
                <p className="t-meta mt-3">
                  Step 2 of 2 · proof and consent. Already a member?{' '}
                  <Link href="/sign-in" className="underline underline-offset-[3px] hover:text-accent">
                    Log in instead
                  </Link>
                </p>
              </>
            )}
          </div>

          {/* side column */}
          <div className="flex flex-col gap-4">
            <div className="border border-[#e8cfc6] rounded-md bg-accenttint p-6">
              <div className="t-label-accent mb-3">Why we ask for proof</div>
              <p className="t-small">{SIDE.why}</p>
            </div>
            <div className="border border-line rounded-md bg-paper2 p-6">
              <div className="t-label mb-3">Registration requirements</div>
              <div className="grid grid-cols-1 gap-y-1 text-[14.5px]">
                {SIDE.requirements.map(([k, v]) => (
                  <div key={k} className="contents">
                    <span className="font-mono text-[11.5px] uppercase tracking-[0.02em] text-ink45 pt-1">
                      {k}
                    </span>
                    <span className="text-ink pb-2">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 items-start border border-line border-l-[3px] border-l-ink bg-surface rounded-sm px-4 py-3.5">
              <Icon name="lock" size={18} className="mt-0.5 flex-none" />
              <span className="t-small">
                Your password is stored only as a salted hash, and your residency document is kept
                in a private area no other member can open.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* VERIFY EMAIL DIALOG (mockup #register-success) */}
      {verifyOpen ? (
        <Dialog
          title="Verify your email address"
          blurb={`We sent a six-digit code to ${sentTo}. Enter it to verify your email, then your account goes to an administrator for approval.`}
          tone="olive"
          icon="check"
          onClose={() => setVerifyOpen(false)}
          footer={
            <>
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setVerifyOpen(false)
                  setSubmitted(true)
                }}
              >
                Later
              </Button>
              <Button type="button" loading={verifying} onClick={verifyEmail}>
                Verify and continue
              </Button>
            </>
          }
        >
          <Field
            label="Verification code"
            error={errors.fields.code?.message}
            hint={
              <>
                Didn&apos;t get it? Check your spam folder, or{' '}
                <button
                  type="button"
                  className="underline underline-offset-[3px] hover:text-accent"
                  onClick={resendEmail}
                >
                  resend the code
                </button>
                .
              </>
            }
          >
            <CodeInput
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </Field>
        </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
