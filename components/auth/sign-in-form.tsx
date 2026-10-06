'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Check, Field, Input } from '@/components/ui/field'
import { PasswordField, PhoneField, CodeInput } from '@/components/ui/auth-fields'
import { Dialog } from '@/components/ui/dialog'
import { Notice, Skeleton } from '@/components/ui/feedback'
import { Toast, useToast, type ToastKind } from '@/components/ui/toast'

type Phase = 'default' | 'loading' | 'error' | 'code'

const ATTEMPT_WORDS = ['No', 'One', 'Two', 'Three']

export function SignInForm() {
  const router = useRouter()
  const { signIn, errors } = useSignIn()
  const { toast, show } = useToast()

  const [phase, setPhase] = useState<Phase>('default')
  const [dialog, setDialog] = useState<null | 'mfa' | 'mobile'>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [globalMsg, setGlobalMsg] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)

  // mobile dialog
  const [mobile, setMobile] = useState('')
  const [mobileCode, setMobileCode] = useState('')
  // 2FA dialog + code state
  const [mfaCode, setMfaCode] = useState('')

  const idErr = errors.fields.identifier?.message
  const pwErr = errors.fields.password?.message
  // Show Clerk's message in the notice only when it did not map to a field.
  const shownGlobal = globalMsg && !idErr && !pwErr ? globalMsg : null

  function toastSafe(message: string, kind?: ToastKind) {
    show(message, kind)
  }

  async function verifySecondFactor(code: string): Promise<boolean> {
    if (!signIn) return false
    const factors = signIn.supportedSecondFactors ?? []
    const wantsPhone = factors.some((f) => f.strategy === 'phone_code')
    const { error } = wantsPhone
      ? await signIn.mfa.verifyPhoneCode({ code })
      : await signIn.mfa.verifyTOTP({ code })
    if (error) {
      toastSafe(error.longMessage || error.message, 'danger')
      return false
    }
    if (signIn.status === 'complete') {
      await signIn.finalize()
      router.push('/home')
      return true
    }
    return false
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!signIn) return
    setPhase('loading')
    setGlobalMsg(null)
    const { error } = await signIn.password({ identifier: email, password })
    if (error) {
      setAttempts((a) => a + 1)
      setGlobalMsg(error.longMessage || error.message)
      setPhase('error')
      return
    }
    setGlobalMsg(null)
    if (signIn.status === 'complete') {
      await signIn.finalize()
      router.push('/home')
      return
    }
    if (signIn.status === 'needs_second_factor') {
      const factors = signIn.supportedSecondFactors ?? []
      if (factors.some((f) => f.strategy === 'phone_code')) {
        const { error: sendErr } = await signIn.mfa.sendPhoneCode()
        if (sendErr) toastSafe(sendErr.longMessage || sendErr.message, 'danger')
      }
      setMfaCode('')
      setDialog('mfa')
      setPhase('default')
      return
    }
    setPhase('default')
  }

  async function submitMfa() {
    await verifySecondFactor(mfaCode)
  }

  function cancelMfa() {
    setDialog(null)
    setPhase('code')
  }

  async function submitMobile() {
    if (!signIn) return
    if (mobileCode.trim().length < 6) {
      const digits = mobile.replace(/\D/g, '')
      const { error } = await signIn.phoneCode.sendCode({ phoneNumber: `+63${digits}` })
      if (error) toastSafe(error.longMessage || error.message, 'danger')
      else toastSafe('Code sent — enter the 6-digit code')
      return
    }
    const { error } = await signIn.phoneCode.verifyCode({ code: mobileCode.trim() })
    if (error) {
      toastSafe(error.longMessage || error.message, 'danger')
      return
    }
    if (signIn.status === 'complete') {
      await signIn.finalize()
      setDialog(null)
      router.push('/home')
    }
  }

  async function submitCodeState() {
    await verifySecondFactor(mfaCode.trim())
  }

  function startOver() {
    signIn?.reset()
    setMfaCode('')
    setGlobalMsg(null)
    setPhase('default')
  }

  const remaining = Math.max(0, 3 - attempts)

  return (
    <>
      {phase === 'default' || phase === 'loading' ? (
        phase === 'loading' ? (
          /* LOADING STATE (mockup data-panel="loading") */
          <div className="border border-line rounded-md bg-surface p-6 mt-8">
            <Skeleton className="h-3 w-2/5 mb-2" />
            <Skeleton className="h-12" />
            <Skeleton className="h-3 w-2/5 mt-5 mb-2" />
            <Skeleton className="h-12" />
            <div className="flex gap-3 mt-6">
              <Button type="button" size="lg" block loading>
                Signing in
              </Button>
            </div>
            <p className="t-meta text-center mt-3">
              Checking your details and your barangay…
            </p>
          </div>
        ) : (
          /* DEFAULT STATE (mockup data-panel="default") */
          <>
            <form
              onSubmit={onSubmit}
              className="border border-line rounded-md bg-surface p-6 mt-8 flex flex-col gap-5"
            >
              <Field label="Email address">
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={idErr ? true : undefined}
                  error={Boolean(idErr)}
                />
              </Field>
              <PasswordField
                label="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={pwErr}
              />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Check defaultChecked>Keep me signed in on this device</Check>
                <Link
                  href="/recovery"
                  className="t-small underline underline-offset-[3px] hover:text-accent"
                >
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" size="lg" block>
                Log in
              </Button>
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="t-label">or</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <Button
                type="button"
                variant="secondary"
                block
                onClick={() => setDialog('mobile')}
              >
                Continue with mobile number
              </Button>
            </form>

            <p className="t-small mt-5">
              New to CaintaTrade?{' '}
              <Link href="/sign-up" className="underline underline-offset-[3px] hover:text-accent">
                Create a free account
              </Link>{' '}
              — you will need one proof of residency.
            </p>

            <Notice tone="brass" icon="info" className="mt-6">
              <div className="font-medium">Waiting for approval?</div>
              <p className="t-small mt-1">
                If you registered in the last 24 hours, your account may still be under review.{' '}
                <Link
                  href="/account-status"
                  className="underline underline-offset-[3px] hover:text-accent"
                >
                  Check your account status
                </Link>
                .
              </p>
            </Notice>

            <Notice icon="shield" className="mt-4">
              <div className="font-medium">Administrators use this same form</div>
              <p className="t-small mt-1">
                There is no separate admin sign-in. Moderators and administrators sign in here,
                and the admin console opens only when their account carries the role. Every admin
                action is written to the activity log.
              </p>
            </Notice>
          </>
        )
      ) : null}

      {/* ERROR STATE (mockup data-panel="error") */}
      {phase === 'error' ? (
        <>
          <Notice tone="danger" icon="alert" className="mt-8 mb-5">
            <div className="font-medium">We could not sign you in</div>
            <p className="t-small mt-1">
              Check your details and try again. For your safety we do not say which of the two
              was wrong.
            </p>
            {shownGlobal ? <p className="t-small mt-1">{shownGlobal}</p> : null}
          </Notice>
          <form
            onSubmit={onSubmit}
            className="border border-line rounded-md bg-surface p-6 flex flex-col gap-5"
          >
            <Field label="Email address" error={idErr}>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={idErr ? true : undefined}
                error={Boolean(idErr)}
              />
            </Field>
            <PasswordField
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={pwErr}
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit">Try again</Button>
              <Button type="button" variant="secondary" onClick={() => router.push('/recovery')}>
                Reset my password
              </Button>
            </div>
            <p className="t-meta">
              {remaining > 0
                ? `${ATTEMPT_WORDS[remaining]} failed attempt${remaining === 1 ? '' : 's'} left before we ask you to wait 15 minutes. Reference: CT-AUTH-401`
                : 'Too many attempts — please wait 15 minutes before trying again. Reference: CT-AUTH-401'}
            </p>
          </form>
        </>
      ) : null}

      {/* CODE STATE (mockup data-panel="code") */}
      {phase === 'code' ? (
        <>
          <Notice tone="brass" icon="shield" className="mt-8 mb-5">
            <div className="font-medium">
              Two-factor authentication is on for this account
            </div>
            <p className="t-small mt-1">
              We sent a 6-digit code to +63 917 448 2210. Enter it to finish signing in — it
              expires in 10 minutes.
            </p>
          </Notice>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitCodeState()
            }}
            className="border border-line rounded-md bg-surface p-6 flex flex-col gap-5"
          >
            <Field
              label="Authentication code"
              hint={
                <>
                  Didn’t get the text?{' '}
                  <button
                    type="button"
                    className="underline underline-offset-[3px] hover:text-accent"
                    onClick={() => toastSafe('Code sent again')}
                  >
                    Resend the code
                  </button>{' '}
                  ·{' '}
                  <button
                    type="button"
                    className="underline underline-offset-[3px] hover:text-accent"
                    onClick={() =>
                      toastSafe('Enter one of the 10 backup codes from when you set up two-factor')
                    }
                  >
                    Use a backup code
                  </button>
                </>
              }
            >
              <CodeInput
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </Field>
            <Button type="submit" size="lg" block>
              Verify and sign in
            </Button>
            <p className="t-meta text-center">
              Not your device?{' '}
              <button
                type="button"
                className="underline underline-offset-[3px] hover:text-accent"
                onClick={startOver}
              >
                Start over
              </button>
            </p>
          </form>
        </>
      ) : null}

      {/* TWO-FACTOR DIALOG (mockup #two-factor-login) */}
      {dialog === 'mfa' ? (
        <Dialog
          title="Two-factor authentication"
          blurb="Enter the 6-digit code we texted to +63 917 448 2210. It expires in 10 minutes."
          tone="accent"
          icon="shield"
          showClose={false}
          onClose={cancelMfa}
          footer={
            <>
              <Button variant="ghost" type="button" onClick={cancelMfa}>
                Cancel
              </Button>
              <Button type="button" onClick={submitMfa}>
                Verify and continue
              </Button>
            </>
          }
        >
          <Field
            label="Authentication code"
            hint="Didn’t get the text? Resend in 00:45, or use one of your backup codes."
          >
            <CodeInput
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </Field>
        </Dialog>
      ) : null}

      {/* MOBILE LOGIN DIALOG (mockup #mobile-login) */}
      {dialog === 'mobile' ? (
        <Dialog
          title="Log in with your mobile number"
          blurb="We text a one-time code to the number on your account. No password needed on this device."
          tone="olive"
          icon="phone"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="ghost" type="button" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={submitMobile}>
                Verify and sign in
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <PhoneField
              label="Mobile number"
              hint="This is the number you verified when you registered."
              inputMode="numeric"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
            <Field
              label="6-digit code"
              hint="Sent by SMS · expires in 10 minutes. CaintaTrade never sends links by text."
            >
              <CodeInput
                value={mobileCode}
                onChange={(e) => setMobileCode(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </Field>
          </div>
        </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
