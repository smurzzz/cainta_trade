'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/field'
import { Toast, useToast } from '@/components/ui/toast'
import {
  deleteAccount,
  deleteResidencyDocument,
  requestDataExport,
  updateProfile,
  uploadPhoto,
} from '@/actions/settings'
import { updatePreferences } from '@/actions/messaging'

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  mobile: string | null
  street_address: string | null
  barangay_id: string | null
  bio: string | null
  avatar_url: string | null
  show_mobile: boolean
  allow_pre_offer_msg: boolean
  show_trade_count: boolean
  show_barangay: boolean
  show_last_active: boolean
  show_usual_meetup: boolean
  hide_from_search: boolean
}

type PrefRow = { type: string; inApp: boolean; email: boolean }

const PREF_LABELS: Record<string, string> = {
  new_offer: 'New offer on my listing',
  offer_accepted: 'Offer accepted',
  offer_rejected: 'Offer rejected',
  offer_cancelled: 'Offer cancelled',
  meetup_updated: 'Meetup details changed',
  trade_completed: 'Trade completed',
  account_approved: 'Account approved',
  account_rejected: 'Account rejected',
  account_suspended: 'Account suspended',
  listing_removed: 'Listing removed',
  listing_expiring: 'Listing expiring soon',
  report_outcome: 'Report outcome',
  message_received: 'New message',
  trade_disputed: 'Trade disputed',
  admin_notice: 'Notices from admin',
}

function Section({
  title,
  blurb,
  children,
}: {
  title: string
  blurb?: string
  children: React.ReactNode
}) {
  return (
    <section className="border border-line rounded-md bg-surface p-6 mb-6">
      <div className="t-h3">{title}</div>
      {blurb ? <p className="t-small text-ink45 mt-1 mb-5">{blurb}</p> : <div className="mb-5" />}
      {children}
    </section>
  )
}

/** Clickable settings toggle (SwitchRow is display-only). */
function Toggle({
  title,
  description,
  on,
  disabled,
  onChange,
}: {
  title: string
  description?: string
  on: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-5 py-3.5 border-b border-line last:border-b-0 cursor-pointer">
      <span>
        <span className="block text-[15px] text-ink">{title}</span>
        {description ? <span className="block text-[13.5px] text-ink45">{description}</span> : null}
      </span>
      <span className="relative inline-flex flex-none">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={on}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="pointer-events-none">
          <Switch on={on} />
        </span>
      </span>
    </label>
  )
}

/** docs/02 C22 · settings screen. Clerk owns passwords/sessions (link out);
 *  profile, visibility, preferences and data controls go through actions. */
export function SettingsScreen({
  profile,
  barangays,
  prefs,
  doc,
}: {
  profile: ProfileRow
  barangays: Array<{ id: string; name: string }>
  prefs: PrefRow[]
  doc: { id: string; status: string } | null
}) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    fullName: profile.full_name ?? '',
    bio: profile.bio ?? '',
    mobile: profile.mobile ?? '',
    barangayId: profile.barangay_id ?? '',
    street: profile.street_address ?? '',
  })
  const [toggles, setToggles] = useState({
    show_mobile: profile.show_mobile,
    allow_pre_offer_msg: profile.allow_pre_offer_msg,
    show_trade_count: profile.show_trade_count,
    show_barangay: profile.show_barangay,
    show_last_active: profile.show_last_active,
    show_usual_meetup: profile.show_usual_meetup,
    hide_from_search: profile.hide_from_search,
  })
  const [prefState, setPrefState] = useState(prefs)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletePhrase, setDeletePhrase] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (form.fullName.trim().length < 2) errs.fullName = 'Enter your name.'
    if (form.street.length > 160) errs.street = 'Keep it under 160 characters.'
    if (form.bio.length > 400) errs.bio = 'Keep it under 400 characters.'
    setErrors(errs)
    if (Object.keys(errs).length) return

    startTransition(async () => {
      const res = await updateProfile({
        fullName: form.fullName.trim(),
        bio: form.bio.trim(),
        mobile: form.mobile.trim() || undefined,
        barangayId: form.barangayId || undefined,
        street: form.street.trim(),
        ...toggles,
      })
      if (!res.ok) {
        setErrors(res.fields ?? {})
        show(res.error, 'danger')
      } else show('Profile saved')
      router.refresh()
    })
  }

  const saveToggle = (key: keyof typeof toggles, value: boolean) => {
    const next = { ...toggles, [key]: value }
    setToggles(next)
    startTransition(async () => {
      const res = await updateProfile({ [key]: value })
      if (!res.ok) {
        setToggles(toggles)
        show(res.error, 'danger')
      } else router.refresh()
    })
  }

  const savePrefs = (type: string, channel: 'inApp' | 'email', value: boolean) => {
    const next = prefState.map((p) => (p.type === type ? { ...p, [channel]: value } : p))
    setPrefState(next)
    startTransition(async () => {
      const res = await updatePreferences(
        next.map((p) => ({ type: p.type, inApp: p.inApp, email: p.email })),
      )
      if (!res.ok) show(res.error, 'danger')
      else router.refresh()
    })
  }

  const doUpload = () => {
    if (!avatar) return
    const file = avatar
    startTransition(async () => {
      const res = await uploadPhoto(file)
      if (!res.ok) show(res.error, 'danger')
      else {
        show('Profile photo updated')
        setAvatar(null)
        router.refresh()
      }
    })
  }

  const exportData = () => {
    startTransition(async () => {
      const res = await requestDataExport()
      if (!res.ok) show(res.error, 'danger')
      else {
        const blob = new Blob([res.data!.json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = res.data!.filename || 'caintatrade-export.json'
        a.click()
        URL.revokeObjectURL(url)
        show('Export downloaded')
      }
    })
  }

  const removeDoc = () => {
    if (!doc) return
    startTransition(async () => {
      const res = await deleteResidencyDocument(doc.id)
      if (!res.ok) show(res.error, 'danger')
      else {
        show('Proof of residency deleted')
        router.refresh()
      }
    })
  }

  const doDeleteAccount = () => {
    startTransition(async () => {
      const res = await deleteAccount({ confirm: deletePhrase })
      if (!res.ok) show(res.error, 'danger')
      else {
        show('Account deleted')
        window.location.href = '/'
      }
    })
  }

  return (
    <>
      <Section title="Personal info" blurb="Shown to other residents on your profile.">
        <form onSubmit={saveProfile} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" required error={errors.fullName}>
              <Input
                value={form.fullName}
                maxLength={80}
                error={Boolean(errors.fullName)}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </Field>
            <Field label="Mobile" hint="Never shown publicly unless you allow it below.">
              <Input
                value={form.mobile}
                inputMode="numeric"
                onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Barangay">
              <Select
                value={form.barangayId}
                onChange={(e) => setForm((f) => ({ ...f, barangayId: e.target.value }))}
              >
                <option value="">Choose…</option>
                {barangays.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Street address" error={errors.street} hint="Only barangay is public.">
              <Input
                value={form.street}
                maxLength={160}
                onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="About you" error={errors.bio} hint={`${form.bio.length}/400`}>
            <Textarea
              rows={3}
              maxLength={400}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="What do you usually trade? What are you looking for?"
            />
          </Field>
          <Button loading={pending}>Save profile</Button>
        </form>
      </Section>

      <Section title="Photo" blurb="JPG or PNG, 5 MB. Your face helps trades go smoothly.">
        <div className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatar_url ?? '/assets/avatar-1.svg'}
            alt=""
            className="w-20 h-20 rounded-full object-cover bg-paper2 border border-line"
          />
          <input
            type="file"
            accept="image/jpeg,image/png"
            aria-label="Choose a profile photo"
            onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
          />
          <Button variant="secondary" disabled={!avatar || pending} onClick={doUpload}>
            Upload photo
          </Button>
        </div>
      </Section>

      <Section
        title="Contact visibility"
        blurb="Decide what other residents can see. Nothing private ever leaves the server."
      >
        <div>
          <Toggle
            title="Show my mobile number"
            description="Off by default — turn on only if you are happy to be texted."
            on={toggles.show_mobile}
            disabled={pending}
            onChange={(v) => saveToggle('show_mobile', v)}
          />
          <Toggle
            title="Allow messages before an offer"
            description="Neighbours can message you about a listing before offering."
            on={toggles.allow_pre_offer_msg}
            disabled={pending}
            onChange={(v) => saveToggle('allow_pre_offer_msg', v)}
          />
          <Toggle
            title="Show my trade count"
            on={toggles.show_trade_count}
            disabled={pending}
            onChange={(v) => saveToggle('show_trade_count', v)}
          />
          <Toggle
            title="Show my barangay"
            on={toggles.show_barangay}
            disabled={pending}
            onChange={(v) => saveToggle('show_barangay', v)}
          />
          <Toggle
            title="Show when I was last active"
            on={toggles.show_last_active}
            disabled={pending}
            onChange={(v) => saveToggle('show_last_active', v)}
          />
          <Toggle
            title="Show my usual meetup spot"
            on={toggles.show_usual_meetup}
            disabled={pending}
            onChange={(v) => saveToggle('show_usual_meetup', v)}
          />
          <Toggle
            title="Hide my profile from search"
            description="People with your direct profile link can still see it."
            on={toggles.hide_from_search}
            disabled={pending}
            onChange={(v) => saveToggle('hide_from_search', v)}
          />
        </div>
      </Section>

      <Section title="Password and security" blurb="Passwords and sessions are handled by Clerk.">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/recovery"
            className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 rounded-sm border border-linestrong font-mono text-[13px] hover:border-ink hover:bg-paper2 transition-colors"
          >
            Reset my password
          </Link>
          <Link
            href="/account-status"
            className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 rounded-sm border border-linestrong font-mono text-[13px] hover:border-ink hover:bg-paper2 transition-colors"
          >
            My account status
          </Link>
        </div>
        <p className="t-small text-ink45 mt-3">
          Signed in on a shared computer? Use <b>Sign out</b> from the avatar menu at the top.
        </p>
      </Section>

      <Section title="Notification preferences" blurb="In-app and email, per event.">
        <div>
          {prefState.map((p) => (
            <div key={p.type} className="border-b border-line last:border-b-0">
              <Toggle
                title={PREF_LABELS[p.type] ?? p.type}
                on={p.inApp}
                disabled={pending}
                onChange={(v) => savePrefs(p.type, 'inApp', v)}
              />
              <div className="flex justify-end pb-3 -mt-1">
                <label className="flex items-center gap-2 t-small text-ink70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={p.email}
                    disabled={pending}
                    onChange={(e) => savePrefs(p.type, 'email', e.target.checked)}
                    className="w-4 h-4 accent-[var(--color-ink)]"
                  />
                  Also send email
                </label>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Privacy and my data" blurb="Everything here runs immediately.">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[15px]">Export my data</div>
              <div className="t-small text-ink45">
                Profile, listings, offers and messages as JSON.
              </div>
            </div>
            <Button variant="secondary" disabled={pending} onClick={exportData}>
              Download export
            </Button>
          </div>

          {doc ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-line">
              <div>
                <div className="text-[15px]">Proof of residency ({doc.status})</div>
                <div className="t-small text-ink45">
                  Deleting it returns your account to review.{' '}
                  <Link href="/account-status" className="underline underline-offset-[3px]">
                    Account status
                  </Link>
                </div>
              </div>
              <Button variant="secondary" disabled={pending} onClick={removeDoc}>
                Delete document
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-line">
            <div>
              <div className="text-[15px] text-danger">Delete my account</div>
              <div className="t-small text-ink45">
                Removes your profile, listings and messages. Cannot be undone.
              </div>
            </div>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete account
            </Button>
          </div>
        </div>
      </Section>

      {confirmDelete ? (
      <Dialog
        title="Delete your account"
        blurb="This removes your profile, listings, offers and messages from CaintaTrade, then deletes your login. It cannot be undone."
        tone="danger"
        icon="trash"
        onClose={() => {
          setConfirmDelete(false)
          setDeletePhrase('')
        }}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmDelete(false)
                setDeletePhrase('')
              }}
            >
              Keep my account
            </Button>
            <Button
              variant="danger"
              disabled={deletePhrase.trim().toUpperCase() !== 'DELETE' || pending}
              onClick={doDeleteAccount}
            >
              Delete forever
            </Button>
          </>
        }
      >
        <Field label="Type DELETE to confirm" required>
          <Input
            value={deletePhrase}
            onChange={(e) => setDeletePhrase(e.target.value)}
            placeholder="DELETE"
          />
        </Field>
      </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
