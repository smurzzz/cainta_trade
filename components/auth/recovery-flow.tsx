'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { Button, ButtonLink } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { PasswordField } from '@/components/ui/auth-fields'
import { LinkArrow, Segmented } from '@/components/ui/tabs'
import { Notice } from '@/components/ui/feedback'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/icon'
import { Toast, useToast } from '@/components/ui/toast'

type Tab = 'forgot' | 'reset' | 'verified'

const TABS = [
  { id: 'forgot', label: 'Forgot password' },
  { id: 'reset', label: 'Reset password' },
  { id: 'verified', label: 'Email verified' },
]

const PASSWORD_RULES = [
  'At least 8 characters',
  'At least one number or symbol',
  'Not your name, email or mobile number',
  'Different from your previous password',
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s]+$/

/** B8 recovery (mockup b8-recovery): segmented forgot / reset / verified panels,
 *  wired headlessly to Clerk (docs/08 #10). */
export function RecoveryFlow() {
  const { signIn } = useSignIn()
  const { toast, show } = useToast()

  const [tab, setTab] = useState<Tab>('forgot')

  // forgot panel
  const [email, setEmail] = useState('')
  const [emailErr, setEmailErr] = useState<string | undefined>()
  const [sending, setSending] = useState(false)
  const [forgotErr, setForgotErr] = useState<string | null>(null)

  // reset panel
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwErr, setPwErr] = useState<string | undefined>()
  const [pw2Err, setPw2Err] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [expired, setExpired] = useState<string | null>(null)

  // The identifier is whatever the forgot-password step sent to Clerk.
  const emailText = signIn?.identifier ?? 'your registered email'
  const matches = Boolean(pw && pw2 && pw === pw2 && pw.length >= 8)

  async function sendReset(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return
    if (!EMAIL_RE.test(email.trim())) {
      setEmailErr('Enter the email address you registered with.')
      return
    }
    setEmailErr(undefined)
    setForgotErr(null)
    if (!signIn) {
      setForgotErr('Sign-in is still loading — give it a moment and try again.')
      return
    }

    setSending(true)
    const { error } = await signIn.create({ identifier: email.trim() })
    if (error) {
      setSending(false)
      setForgotErr(error.longMessage || error.message)
      return
    }
    const { error: sendErr } = await signIn.resetPasswordEmailCode.sendCode()
    setSending(false)
    if (sendErr) {
      setForgotErr(sendErr.longMessage || sendErr.message)
      return
    }
    show(`Reset link sent — check ${email.trim()}`, 'olive')
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (pw.length < 8) {
      setPwErr('Use at least 8 characters.')
      return
    }
    if (pw !== pw2) {
      setPw2Err('Both passwords must match.')
      return
    }
    setPwErr(undefined)
    setPw2Err(undefined)
    setExpired(null)

    if (signIn?.status === 'needs_new_password') {
      setSaving(true)
      const { error } = await signIn.resetPasswordEmailCode.submitPassword({ password: pw })
      if (error) {
        setSaving(false)
        setExpired(error.longMessage || error.message)
        return
      }
      const { error: finalizeErr } = await signIn.finalize()
      setSaving(false)
      if (finalizeErr) {
        setExpired(finalizeErr.longMessage || finalizeErr.message)
        return
      }
      show('Password updated — you are signed in', 'olive')
      setTab('verified')
      return
    }
    setExpired(
      'This reset link has expired or was never opened. Request a fresh link and try again.',
    )
  }

  return (
    <>
      <div className="wrap py-7 md:py-11">
        <div className="eyebrow">
          <span className="t-label-accent">Password and email</span>
        </div>
        <div className="flex gap-6 flex-wrap items-start justify-between mt-3 mb-6">
          <div>
            <h1 className="t-h1">Recover your account</h1>
            <p className="t-small mt-3 max-w-[560px]">
              Three short steps: ask for a reset link, choose a new password, then confirm your
              email address is verified.
            </p>
          </div>
          <Segmented options={TABS} active={tab} onSelect={(id) => setTab(id as Tab)} />
        </div>

        {/* FORGOT (mockup data-mail-panel="forgot") */}
        {tab === 'forgot' ? (
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_340px] items-start">
            <div className="max-w-[560px]">
              <form
                onSubmit={sendReset}
                noValidate
                className="border border-line rounded-md bg-surface p-6"
              >
                <div className="t-h3 mb-2">Forgot your password?</div>
                <p className="t-small mb-5">
                  Enter the email address you registered with and we will send a reset link. The
                  link works for 30 minutes.
                </p>
                <Field
                  label="Email address"
                  error={emailErr}
                  hint="We will never say whether an address is registered — it only matters that the email reaches you."
                >
                  <Input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setEmailErr(undefined)
                    }}
                    aria-invalid={emailErr ? true : undefined}
                    error={Boolean(emailErr)}
                  />
                </Field>
                <Button type="submit" block className="mt-5" loading={sending}>
                  Send reset link
                </Button>
                <ButtonLink href="/sign-in" variant="ghost" block className="mt-2">
                  Back to log in
                </ButtonLink>
              </form>

              {forgotErr ? (
                <Notice tone="danger" icon="alert" className="mt-4">
                  <div className="font-medium">We could not send the reset</div>
                  <p className="t-small mt-1">{forgotErr}</p>
                </Notice>
              ) : null}

              <Notice icon="mail" className="mt-6">
                <div className="font-medium">Nothing arrived?</div>
                <p className="t-small mt-1">
                  Wait two minutes, then check your spam folder. If it still has not arrived, your
                  registration email may have a typo —{' '}
                  <Link
                    href="/how-it-works"
                    className="underline underline-offset-[3px] hover:text-accent"
                  >
                    contact the community desk
                  </Link>
                  .
                </p>
              </Notice>
            </div>

            <div className="flex flex-col gap-4">
              <div className="border border-line rounded-md bg-paper2 p-6">
                <div className="t-label mb-3">The email you will receive</div>
                <div className="border border-line rounded-sm bg-surface overflow-hidden">
                  <div className="px-[22px] py-[18px] border-b border-line flex items-center justify-between gap-3">
                    <b className="font-display text-[13px] uppercase tracking-[0.14em]">
                      CaintaTrade
                    </b>
                    <span className="t-label">Password reset</span>
                  </div>
                  <div className="px-[22px] py-6">
                    <div className="t-h3">Reset your password</div>
                    <p className="t-small mt-2">
                      Tap the button below to choose a new password. The link expires in 30
                      minutes.
                    </p>
                    <span className="inline-flex items-center justify-center min-h-[36px] px-[13px] rounded-sm bg-ink text-paper font-mono text-xs tracking-[0.01em] mt-4">
                      Choose a new password
                    </span>
                    <p className="t-meta mt-4">
                      If you did not ask for this, you can ignore the email — your password stays
                      the same.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="text-left hover:text-accent"
                onClick={() =>
                  show('Four templates: verification, password reset, approval and welcome', 'ink')
                }
              >
                <LinkArrow>See all four email templates</LinkArrow>
              </button>
            </div>
          </div>
        ) : null}

        {/* RESET (mockup data-mail-panel="reset") */}
        {tab === 'reset' ? (
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_340px] items-start">
            <div className="max-w-[560px]">
              <form
                onSubmit={submitReset}
                noValidate
                className="border border-line rounded-md bg-surface p-6"
              >
                <div className="t-h3 mb-2">Choose a new password</div>
                <p className="t-small mb-5">
                  Resetting the password for <b>{emailText}</b>. You will be signed out of every
                  device afterwards.
                </p>
                <PasswordField
                  label="New password"
                  autoComplete="new-password"
                  strength
                  strengthOkText="Good to go"
                  className="mb-5"
                  value={pw}
                  onChange={(e) => {
                    setPw(e.target.value)
                    setPwErr(undefined)
                  }}
                  error={pwErr}
                />
                <Field label="Confirm new password" error={pw2Err} className="mb-5">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={pw2}
                    onChange={(e) => {
                      setPw2(e.target.value)
                      setPw2Err(undefined)
                    }}
                    aria-invalid={pw2Err ? true : undefined}
                    error={Boolean(pw2Err)}
                  />
                </Field>
                {matches ? (
                  <Notice tone="olive" icon="check" className="mb-5">
                    <span className="t-small">
                      Both passwords match. Minimum 8 characters, with at least one number.
                    </span>
                  </Notice>
                ) : null}
                {expired ? (
                  <Notice tone="danger" icon="alert" className="mb-5">
                    <div className="font-medium">This link is no longer valid</div>
                    <p className="t-small mt-1">{expired}</p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setExpired(null)
                        setTab('forgot')
                      }}
                    >
                      Request a fresh link
                    </Button>
                  </Notice>
                ) : null}
                <Button type="submit" block loading={saving}>
                  Save and continue
                </Button>
              </form>
            </div>

            <div className="flex flex-col gap-4">
              <div className="border border-line rounded-md bg-surface p-6">
                <div className="t-label mb-3">Password rules</div>
                <div className="flex flex-col gap-2">
                  {PASSWORD_RULES.map((r) => (
                    <span key={r} className="flex items-center gap-2 t-small">
                      <Icon name="check" size={14} className="text-olive flex-none" />
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <div className="border border-line rounded-md bg-paper2 p-6">
                <div className="t-label mb-2">Default state of this step</div>
                <p className="t-small">
                  If the reset link has expired, this screen shows a single message and a button
                  to request a fresh link — no form, so nobody wastes time filling in fields that
                  cannot be saved.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* VERIFIED (mockup data-mail-panel="verified") */}
        {tab === 'verified' ? (
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_340px] items-start">
            <div className="max-w-[680px]">
              <div className="border border-line rounded-md bg-surface p-6 text-center">
                <div className="w-[88px] h-[88px] mx-auto mb-5 rounded-full bg-olivetint text-olive flex items-center justify-center">
                  <Icon name="check" size={30} />
                </div>
                <div className="font-display text-xl uppercase mb-2">
                  Your email address is verified
                </div>
                <p className="t-small max-w-[560px] mx-auto">
                  Thanks. Your reset is complete and your email is confirmed. An administrator
                  still needs to approve your proof of residency before you can post or offer —
                  that usually happens within 24 hours.
                </p>
                <div className="flex flex-wrap gap-2 mt-5 justify-center">
                  <ButtonLink href="/account-status">Check my account status</ButtonLink>
                  <ButtonLink href="/browse" variant="secondary">
                    Browse items while I wait
                  </ButtonLink>
                </div>
              </div>

              <div className="border border-line rounded-md bg-surface p-6 mt-6">
                <div className="t-label mb-3">Account checklist</div>
                <div>
                  <div className="flex gap-3 items-center py-2.5">
                    <Badge variant="available">
                      <Icon name="check" size={12} /> Done
                    </Badge>
                    <span className="t-small flex-1">Email address verified</span>
                  </div>
                  <div className="flex gap-3 items-center py-2.5 border-t border-line">
                    <Badge variant="available">
                      <Icon name="check" size={12} /> Done
                    </Badge>
                    <span className="t-small flex-1">Password set</span>
                  </div>
                  <div className="flex gap-3 items-center py-2.5 border-t border-line">
                    <Badge variant="pending">
                      <span className="w-1.5 h-1.5 rounded-full bg-accentdeep" /> In review
                    </Badge>
                    <span className="t-small flex-1">Proof of residency — San Juan, Cainta</span>
                  </div>
                  <div className="flex gap-3 items-center py-2.5 border-t border-line">
                    <Badge>
                      <span className="w-1.5 h-1.5 rounded-full bg-ink45" /> Next
                    </Badge>
                    <span className="t-small flex-1">Post your first item</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="border border-[#e8cfc6] rounded-md bg-accenttint p-6">
                <div className="t-label-accent mb-2">While you wait</div>
                <p className="t-small">
                  You can browse everything, save items to a wishlist and message the community
                  desk. Posting and offering unlock automatically once you are approved — no need
                  to come back to this page.
                </p>
              </div>
              <Notice icon="info">
                <span className="t-small">
                  Took longer than 24 hours? Reply to your approval email with the subject line
                  “Residency review” and an administrator will look at it again.
                </span>
              </Notice>
            </div>
          </div>
        ) : null}
      </div>

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
