'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSignUp } from '@clerk/nextjs'
import { Button, ButtonLink } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { PasswordField, PhoneField } from '@/components/ui/auth-fields'
import { TabBar } from '@/components/ui/tabs'
import { Notice } from '@/components/ui/feedback'
import { loadDraft, saveDraft, type RegisterDraft } from '@/lib/register-draft'

const BARANGAYS = [
  'San Andres (Poblacion)',
  'San Isidro',
  'San Juan',
  'San Roque',
  'Santa Rosa',
  'Santo Domingo',
  'Santo Niño',
]

const EMPTY = {
  fullName: '',
  email: '',
  mobile: '',
  barangay: '',
  street: '',
  password: '',
}

type LocalErrors = Partial<Record<keyof typeof EMPTY, string>>

/** Normalise anything the user typed to the 10 digits after +63. */
function mobileDigits(value: string) {
  let d = value.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('63')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return d
}

/** B6 register step 1 (mockup data-panel="default"): details form that hands
 *  off to /onboarding (step 2). Nothing about proof/consent is sent yet. */
export function SignUpForm() {
  const router = useRouter()
  const { signUp, errors } = useSignUp()

  const [form, setForm] = useState(EMPTY)
  const [local, setLocal] = useState<LocalErrors>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [badCount, setBadCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Restore the step-1 draft when coming back from step 2 (never the password).
  // Deferred to a microtask so the effect itself stays free of setState.
  useEffect(() => {
    queueMicrotask(() => {
      const draft = loadDraft()
      if (draft) setForm((f) => ({ ...f, ...draft }))
    })
  }, [])

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setLocal((e) => ({ ...e, [key]: '' })) // clear this field's error on edit
  }

  const clerkEmailErr = errors.fields.emailAddress?.message
  const clerkPwErr = errors.fields.password?.message
  const err = (key: keyof LocalErrors, clerk?: string) =>
    key in local ? local[key] : clerk

  function validate(): LocalErrors {
    const e: LocalErrors = {}
    if (!form.fullName.trim()) e.fullName = 'Please enter your full name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = 'Enter a complete email address, like name@gmail.com.'
    if (mobileDigits(form.mobile).length !== 10)
      e.mobile = 'Enter the 10 digits after +63 (for example 917 448 2210).'
    if (!form.barangay) e.barangay = 'Please choose the barangay you live in.'
    if (!form.street.trim()) e.street = 'Please enter your street or address.'
    if (form.password.length < 8) e.password = 'Use at least 8 characters.'
    return e
  }

  async function onContinue(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    const v = validate()
    const bad = Object.values(v).filter(Boolean).length
    if (bad > 0) {
      setLocal(v)
      setNotice(null)
      setBadCount(bad)
      return
    }
    if (!signUp) {
      setLocal({})
      setNotice('Sign-up is still loading — reload the page and try again.')
      setBadCount(0)
      return
    }

    setLocal({})
    setNotice(null)
    setSubmitting(true)

    const [firstName, ...rest] = form.fullName.trim().split(/\s+/)
    const { error } = await signUp.password({
      emailAddress: form.email.trim(),
      password: form.password,
      firstName,
      lastName: rest.join(' '),
      unsafeMetadata: {
        mobile: mobileDigits(form.mobile),
        barangay: form.barangay,
        street: form.street.trim(),
      },
    })
    setSubmitting(false)

    if (error) {
      setNotice(error.longMessage || error.message)
      setBadCount(0)
      return
    }

    const draft: RegisterDraft = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      mobile: mobileDigits(form.mobile),
      barangay: form.barangay,
      street: form.street.trim(),
    }
    saveDraft(draft)
    router.push('/onboarding')
  }

  return (
    <form onSubmit={onContinue} className="mt-8 flex flex-col" noValidate>
      <TabBar
        tabs={[
          { id: 's1', label: 'Step 1 · Your details' },
          { id: 's2', label: 'Step 2 · Proof and consent' },
        ]}
        active="s1"
        onSelect={(id) => {
          if (id === 's2') {
            const fake = { preventDefault: () => {} } as React.FormEvent
            onContinue(fake)
          }
        }}
        className="mb-6"
      />

      {/* ERROR STATE (mockup data-panel="error") */}
      {notice || badCount > 0 ? (
        <Notice tone="danger" icon="alert" className="mb-5">
          <div className="font-medium">We could not create your account</div>
          <p className="t-small mt-1">
            {notice ??
              `${badCount} field${badCount === 1 ? '' : 's'} need${
                badCount === 1 ? 's' : ''
              } attention. Nothing you typed was lost.`}
          </p>
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field
          label="Full name"
          required
          hint="Use the name on your barangay ID so neighbours can match it at the meetup."
          error={err('fullName')}
          className="md:col-span-2"
        >
          <Input
            autoComplete="name"
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            aria-invalid={err('fullName') ? true : undefined}
            error={Boolean(err('fullName'))}
          />
        </Field>

        <Field label="Email address" required error={err('email', clerkEmailErr)}>
          <Input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            aria-invalid={err('email', clerkEmailErr) ? true : undefined}
            error={Boolean(err('email', clerkEmailErr))}
          />
        </Field>

        <PhoneField
          label="Mobile number"
          required
          hint="Used for trade updates only. Hidden from other members unless you allow it."
          error={err('mobile')}
          inputMode="numeric"
          autoComplete="tel"
          value={form.mobile}
          onChange={(e) => set('mobile', e.target.value)}
        />

        <Field
          label="Barangay"
          required
          hint="Coverage is limited to the seven barangays of Cainta."
          error={err('barangay')}
        >
          <Select
            value={form.barangay}
            onChange={(e) => set('barangay', e.target.value)}
            aria-invalid={err('barangay') ? true : undefined}
            error={Boolean(err('barangay'))}
          >
            <option value="">Choose your barangay…</option>
            {BARANGAYS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Select>
        </Field>

        <Field
          label="Street / address"
          required
          hint={'Shown only as “San Juan, Cainta” to other members.'}
          error={err('street')}
        >
          <Input
            autoComplete="street-address"
            value={form.street}
            onChange={(e) => set('street', e.target.value)}
            aria-invalid={err('street') ? true : undefined}
            error={Boolean(err('street'))}
          />
        </Field>

        <PasswordField
          label="Password"
          required
          strength
          strengthOkText="Meets all requirements"
          autoComplete="new-password"
          className="md:col-span-2"
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          error={err('password', clerkPwErr)}
        />
      </div>

      <div className="flex flex-wrap gap-3 mt-8">
        <Button type="submit" size="lg" loading={submitting}>
          Continue to step 2
        </Button>
        <ButtonLink href="/sign-in" variant="secondary" size="lg">
          I already have an account
        </ButtonLink>
      </div>
      <p className="t-meta mt-3">
        Step 1 of 2 · your details. Nothing is sent until you submit step 2.
      </p>
    </form>
  )
}
