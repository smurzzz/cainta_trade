'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Notice } from '@/components/ui/feedback'
import { TabBar } from '@/components/ui/tabs'
import { Toast, useToast } from '@/components/ui/toast'
import {
  deleteAnnouncement,
  deleteBarangay,
  deleteMeetupSpot,
  saveAnnouncement,
  saveBarangay,
  saveLegalDoc,
  saveMeetupSpot,
} from '@/actions/admin-console'

export type BarangayRow = {
  id: string
  name: string
  description: string | null
  is_enabled: boolean
}
export type SpotRow = {
  id: string
  name: string
  barangay_id: string
  flag: string | null
  is_enabled: boolean
}
export type AnnouncementRow = {
  id: string
  title: string
  body: string
  is_enabled: boolean
  starts_at: string | null
  ends_at: string | null
}
export type LegalRow = {
  id: string
  type: string
  version: string
  effective_date: string
  body: string
  created_at: string
}

const TABS = [
  { id: 'barangays', label: 'Barangays' },
  { id: 'spots', label: 'Meetup spots' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'legal', label: 'Terms & privacy' },
]

type AnyDialog =
  | null
  | { kind: 'barangay'; row?: BarangayRow }
  | { kind: 'spot'; row?: SpotRow }
  | { kind: 'announcement'; row?: AnnouncementRow }
  | { kind: 'legal' }

/** docs/02 D31 · reference-data administration (admin-only actions). */
export function SettingsAdminScreen({
  tab,
  barangays,
  spots,
  announcements,
  legal,
}: {
  tab: string
  barangays: BarangayRow[]
  spots: SpotRow[]
  announcements: AnnouncementRow[]
  legal: LegalRow[]
}) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [pending, startTransition] = useTransition()
  const [dialog, setDialog] = useState<AnyDialog>(null)

  const [barangayForm, setBarangayForm] = useState({ name: '', description: '', enabled: true })
  const [spotForm, setSpotForm] = useState({ name: '', barangayId: '', flag: '', enabled: true })
  const [annForm, setAnnForm] = useState({ title: '', body: '', enabled: true })
  const [legalForm, setLegalForm] = useState({ type: 'terms', version: '', effectiveDate: '', body: '' })

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) show(res.error ?? 'That did not go through.', 'danger')
      else {
        show(okMsg)
        setDialog(null)
        router.refresh()
      }
    })
  }

  const bName = (id: string) => barangays.find((b) => b.id === id)?.name ?? '—'

  return (
    <>
      <TabBar
        active={tab}
        onSelect={(id) => router.push(`/admin/settings?tab=${id}`)}
        tabs={TABS}
        className="mb-6"
      />

      {tab === 'barangays' ? (
        <section className="border border-line rounded-md bg-surface p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <div className="t-h3">Barangays and coverage</div>
              <p className="t-meta mt-0.5">{barangays.length} barangays · Cainta coverage</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setBarangayForm({ name: '', description: '', enabled: true })
                setDialog({ kind: 'barangay' })
              }}
            >
              Add barangay
            </Button>
          </div>
          <ul className="divide-y divide-line">
            {barangays.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="text-[15px] text-ink">{b.name}</span>
                  {b.description ? <span className="t-meta ml-2">{b.description}</span> : null}
                </span>
                <span
                  className={`font-mono text-[10.5px] uppercase px-2 py-0.5 rounded-sm border ${
                    b.is_enabled
                      ? 'border-[#c3d1bb] bg-olivetint text-[#3f5236]'
                      : 'border-line bg-paper2 text-ink45'
                  }`}
                >
                  {b.is_enabled ? 'enabled' : 'hidden'}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setBarangayForm({
                      name: b.name,
                      description: b.description ?? '',
                      enabled: b.is_enabled,
                    })
                    setDialog({ kind: 'barangay', row: b })
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    run(() => deleteBarangay({ id: b.id }), 'Barangay deleted (only if unused)')
                  }
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === 'spots' ? (
        <section className="border border-line rounded-md bg-surface p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <div className="t-h3">Suggested meetup spots</div>
              <p className="t-meta mt-0.5">{spots.length} spots shown to members</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSpotForm({ name: '', barangayId: '', flag: '', enabled: true })
                setDialog({ kind: 'spot' })
              }}
            >
              Add spot
            </Button>
          </div>
          <ul className="divide-y divide-line">
            {spots.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="text-[15px] text-ink">{s.name}</span>
                  <span className="t-meta ml-2">
                    {bName(s.barangay_id)}
                    {s.flag ? ` · ${s.flag}` : ''}
                  </span>
                </span>
                <span
                  className={`font-mono text-[10.5px] uppercase px-2 py-0.5 rounded-sm border ${
                    s.is_enabled
                      ? 'border-[#c3d1bb] bg-olivetint text-[#3f5236]'
                      : 'border-line bg-paper2 text-ink45'
                  }`}
                >
                  {s.is_enabled ? 'enabled' : 'hidden'}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSpotForm({
                      name: s.name,
                      barangayId: s.barangay_id,
                      flag: s.flag ?? '',
                      enabled: s.is_enabled,
                    })
                    setDialog({ kind: 'spot', row: s })
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    run(() => deleteMeetupSpot({ id: s.id }), 'Spot deleted (only if unused)')
                  }
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === 'announcements' ? (
        <section className="border border-line rounded-md bg-surface p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <div className="t-h3">Announcements</div>
              <p className="t-meta mt-0.5">Shown as a banner to members while enabled</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setAnnForm({ title: '', body: '', enabled: true })
                setDialog({ kind: 'announcement' })
              }}
            >
              New announcement
            </Button>
          </div>
          {announcements.length === 0 ? (
            <Notice tone="default" icon="info">
              <p className="t-small">No announcements yet.</p>
            </Notice>
          ) : (
            <ul className="divide-y divide-line">
              {announcements.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="text-[15px] text-ink">{a.title}</span>
                    <span className="block t-small text-ink70 mt-0.5 line-clamp-2">{a.body}</span>
                    <span className="t-meta">
                      {a.starts_at ? `from ${new Date(a.starts_at).toLocaleDateString('en-PH')}` : 'starts immediately'}
                      {a.ends_at ? ` · until ${new Date(a.ends_at).toLocaleDateString('en-PH')}` : ''}
                    </span>
                  </span>
                  <span
                    className={`font-mono text-[10.5px] uppercase px-2 py-0.5 rounded-sm border ${
                      a.is_enabled
                        ? 'border-[#c3d1bb] bg-olivetint text-[#3f5236]'
                        : 'border-line bg-paper2 text-ink45'
                    }`}
                  >
                    {a.is_enabled ? 'live' : 'off'}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setAnnForm({ title: a.title, body: a.body, enabled: a.is_enabled })
                      setDialog({ kind: 'announcement', row: a })
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => deleteAnnouncement({ id: a.id }), 'Announcement deleted')}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === 'legal' ? (
        <section className="border border-line rounded-md bg-surface p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <div className="t-h3">Terms and privacy</div>
              <p className="t-meta mt-0.5">
                Publishing creates a new immutable version — members see the latest
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setLegalForm({
                  type: 'terms',
                  version: '',
                  effectiveDate: new Date().toISOString().slice(0, 10),
                  body: '',
                })
                setDialog({ kind: 'legal' })
              }}
            >
              Publish version
            </Button>
          </div>
          <ul className="divide-y divide-line">
            {legal.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <span
                  className={`font-mono text-[10.5px] uppercase px-2 py-0.5 rounded-sm border border-line ${
                    l.type === 'terms' ? 'text-ink' : 'text-ink70'
                  }`}
                >
                  {l.type}
                </span>
                <span className="text-[15px] text-ink">v{l.version}</span>
                <span className="t-meta">
                  effective {new Date(l.effective_date).toLocaleDateString('en-PH')} ·{' '}
                  {l.body.length} chars
                </span>
              </li>
            ))}
            {legal.length === 0 ? (
              <li className="py-3 t-small text-ink45">
                No versions published yet — the static /legal page shows the built-in copy.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {dialog?.kind === 'barangay' ? (
        <Dialog
          title={dialog.row ? 'Edit barangay' : 'Add a barangay'}
          blurb="Members pick their barangay while registering. Disabling hides it from new sign-ups."
          tone="accent"
          icon="pin"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                disabled={pending || barangayForm.name.trim().length < 2}
                onClick={() =>
                  run(
                    () =>
                      saveBarangay({
                        id: dialog.row?.id,
                        name: barangayForm.name.trim(),
                        description: barangayForm.description.trim() || undefined,
                        isEnabled: barangayForm.enabled,
                      }),
                    'Barangay saved',
                  )
                }
              >
                Save
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Name" required>
              <Input
                value={barangayForm.name}
                maxLength={80}
                onChange={(e) => setBarangayForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field label="Description">
              <Input
                value={barangayForm.description}
                maxLength={300}
                onChange={(e) => setBarangayForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
            <label className="flex items-center gap-2.5 t-small cursor-pointer">
              <input
                type="checkbox"
                checked={barangayForm.enabled}
                onChange={(e) => setBarangayForm((f) => ({ ...f, enabled: e.target.checked }))}
                className="w-4 h-4 accent-[var(--color-ink)]"
              />
              Enabled — residents can register here
            </label>
          </div>
        </Dialog>
      ) : null}

      {dialog?.kind === 'spot' ? (
        <Dialog
          title={dialog.row ? 'Edit meetup spot' : 'Add a meetup spot'}
          blurb="Spots appear on listings, offers and trades as safe public suggestions."
          tone="olive"
          icon="pin"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                disabled={pending || spotForm.name.trim().length < 2 || !spotForm.barangayId}
                onClick={() =>
                  run(
                    () =>
                      saveMeetupSpot({
                        id: dialog.row?.id,
                        name: spotForm.name.trim(),
                        barangayId: spotForm.barangayId,
                        flag: spotForm.flag.trim() || undefined,
                        isEnabled: spotForm.enabled,
                      }),
                    'Meetup spot saved',
                  )
                }
              >
                Save
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Name" required>
              <Input
                value={spotForm.name}
                maxLength={120}
                onChange={(e) => setSpotForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Cainta Municipal Hall grounds"
              />
            </Field>
            <Field label="Barangay" required>
              <Select
                value={spotForm.barangayId}
                onChange={(e) => setSpotForm((f) => ({ ...f, barangayId: e.target.value }))}
              >
                <option value="">Choose…</option>
                {barangays.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Note">
              <Input
                value={spotForm.flag}
                maxLength={60}
                onChange={(e) => setSpotForm((f) => ({ ...f, flag: e.target.value }))}
                placeholder="Daylight hours only"
              />
            </Field>
            <label className="flex items-center gap-2.5 t-small cursor-pointer">
              <input
                type="checkbox"
                checked={spotForm.enabled}
                onChange={(e) => setSpotForm((f) => ({ ...f, enabled: e.target.checked }))}
                className="w-4 h-4 accent-[var(--color-ink)]"
              />
              Enabled — shown to members
            </label>
          </div>
        </Dialog>
      ) : null}

      {dialog?.kind === 'announcement' ? (
        <Dialog
          title={dialog.row ? 'Edit announcement' : 'New announcement'}
          blurb="Shown as a strip at the top of member pages while enabled."
          tone="accent"
          icon="mail"
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                disabled={pending || annForm.title.trim().length < 3 || annForm.body.trim().length < 3}
                onClick={() =>
                  run(
                    () =>
                      saveAnnouncement({
                        id: dialog.row?.id,
                        title: annForm.title.trim(),
                        body: annForm.body.trim(),
                        isEnabled: annForm.enabled,
                      }),
                    'Announcement saved',
                  )
                }
              >
                Save
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Title" required>
              <Input
                value={annForm.title}
                maxLength={120}
                onChange={(e) => setAnnForm((f) => ({ ...f, title: e.target.value }))}
              />
            </Field>
            <Field label="Body" required>
              <Textarea
                rows={4}
                maxLength={2000}
                value={annForm.body}
                onChange={(e) => setAnnForm((f) => ({ ...f, body: e.target.value }))}
              />
            </Field>
            <label className="flex items-center gap-2.5 t-small cursor-pointer">
              <input
                type="checkbox"
                checked={annForm.enabled}
                onChange={(e) => setAnnForm((f) => ({ ...f, enabled: e.target.checked }))}
                className="w-4 h-4 accent-[var(--color-ink)]"
              />
              Live now
            </label>
          </div>
        </Dialog>
      ) : null}

      {dialog?.kind === 'legal' ? (
        <Dialog
          title="Publish a legal version"
          blurb="Creates an immutable version. Bump the version number when you republish — the public page reads the latest."
          tone="accent"
          icon="folder"
          wide
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                disabled={pending || !legalForm.version || legalForm.body.trim().length < 20}
                onClick={() =>
                  run(
                    () =>
                      saveLegalDoc({
                        type: legalForm.type as 'terms' | 'privacy',
                        version: legalForm.version.trim(),
                        effectiveDate: legalForm.effectiveDate,
                        body: legalForm.body,
                      }),
                    'Version published',
                  )
                }
              >
                Publish
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Document" required>
                <Select
                  value={legalForm.type}
                  onChange={(e) => setLegalForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="terms">Terms</option>
                  <option value="privacy">Privacy</option>
                </Select>
              </Field>
              <Field label="Version" required hint="e.g. 1.1">
                <Input
                  value={legalForm.version}
                  maxLength={20}
                  onChange={(e) => setLegalForm((f) => ({ ...f, version: e.target.value }))}
                />
              </Field>
              <Field label="Effective date" required>
                <Input
                  type="date"
                  value={legalForm.effectiveDate}
                  onChange={(e) => setLegalForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Body (markdown-ish plain text)" required hint={`${legalForm.body.length} characters`}>
              <Textarea
                rows={10}
                value={legalForm.body}
                onChange={(e) => setLegalForm((f) => ({ ...f, body: e.target.value }))}
              />
            </Field>
          </div>
        </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
