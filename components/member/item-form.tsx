'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Notice } from '@/components/ui/feedback'
import { Segmented } from '@/components/ui/tabs'
import { Toast, useToast } from '@/components/ui/toast'
import { Icon } from '@/components/ui/icon'
import {
  createItem,
  deleteItemPhoto,
  removeItem,
  renewItem,
  setItemStatus,
  updateItem,
} from '@/actions/listings'
import { flagCashWords } from '@/lib/validators/item'
import type { FormOptions } from '@/lib/queries/meta'

export type ItemDraft = {
  id?: string
  title: string
  description: string
  categoryId: string
  condition: string
  lookingFor: string
  tradeType: string
  barangayId: string
  meetupSpotId: string
  status: string
}

const CONDITIONS = [
  { id: 'like_new', label: 'Like new' },
  { id: 'good', label: 'Good' },
  { id: 'fair', label: 'Fair' },
  { id: 'for_repair', label: 'Needs repair' },
]

const TRADE_TYPES = [
  { id: 'item_for_item', label: 'Item for item (one for one)' },
  { id: 'multiple_smaller', label: 'Several smaller items for one' },
]

const EMPTY: ItemDraft = {
  title: '',
  description: '',
  categoryId: '',
  condition: 'good',
  lookingFor: '',
  tradeType: 'item_for_item',
  barangayId: '',
  meetupSpotId: '',
  status: 'draft',
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className={value > max ? 'text-danger' : 'text-ink45'}>
      {value}/{max}
    </span>
  )
}

/** docs/02 C11/C12 · one form for post and edit: sections, live rules, photo
 *  manager (edit), status control, renew and remove. */
export function ItemForm({
  mode,
  options,
  initial,
  defaultBarangayId,
  photos = [],
  justCreated = false,
}: {
  mode: 'new' | 'edit'
  options: FormOptions
  initial?: ItemDraft
  defaultBarangayId?: string | null
  photos?: Array<{ id: string; path: string | null }>
  justCreated?: boolean
}) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [form, setForm] = useState<ItemDraft>(
    initial ?? { ...EMPTY, barangayId: defaultBarangayId ?? '' },
  )
  // New listings default to publish (primary CTA = "Publish listing"; toggle to
  // "Switch to draft"). Editing keeps the item's current status.
  const [publish, setPublish] = useState(!initial || initial.status === 'available')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [globalMsg, setGlobalMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [uploading, setUploading] = useState(false)
  const [busyPhoto, setBusyPhoto] = useState<string | null>(null)

  const set = (k: keyof ItemDraft, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const cashHits = flagCashWords(
    `${form.title} ${form.description ?? ''} ${form.lookingFor ?? ''}`,
  )

  const validate = () => {
    const errs: Record<string, string> = {}
    if (form.title.trim().length < 3) errs.title = 'Give the listing a short title.'
    if (form.title.trim().length > 80) errs.title = 'Keep the title to 80 characters.'
    if ((form.description ?? '').length > 2000) errs.description = 'Keep it under 2000 characters.'
    if ((form.lookingFor ?? '').length > 160) errs.lookingFor = 'Keep it under 160 characters.'
    if (!form.categoryId) errs.categoryId = 'Choose a category.'
    if (!form.barangayId) errs.barangayId = 'Choose your barangay.'
    setFields(errs)
    return Object.keys(errs).length === 0
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalMsg(null)
    if (!validate()) return
    startTransition(async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        categoryId: form.categoryId,
        condition: form.condition as 'like_new' | 'good' | 'fair' | 'for_repair',
        lookingFor: form.lookingFor?.trim() || undefined,
        tradeType: form.tradeType as 'item_for_item' | 'multiple_smaller',
        barangayId: form.barangayId,
        meetupSpotId: form.meetupSpotId,
      }
      if (mode === 'new') {
        const res = await createItem({
          ...payload,
          status: publish ? 'available' : 'draft',
        })
        if (!res.ok) {
          setFields(res.fields ?? {})
          setGlobalMsg(res.error)
          return
        }
        show(publish ? 'Listing published — add photos next' : 'Draft saved')
        router.push(`/items/${res.data!.id}/edit?created=${publish ? 'live' : 'draft'}`)
        router.refresh()
      } else {
        const res = await updateItem({ id: form.id!, ...payload })
        if (!res.ok) {
          setFields(res.fields ?? {})
          setGlobalMsg(res.error)
          return
        }
        show('Listing updated')
        router.refresh()
      }
    })
  }

  const changeStatus = (status: 'available' | 'paused' | 'exchanged') => {
    if (!form.id) return
    startTransition(async () => {
      const res = await setItemStatus(form.id!, status)
      if (!res.ok) show(res.error, 'danger')
      else {
        show(status === 'exchanged' ? 'Marked exchanged — nice swap!' : 'Status updated')
        router.refresh()
      }
    })
  }

  const renew = () => {
    if (!form.id) return
    startTransition(async () => {
      const res = await renewItem(form.id!)
      if (!res.ok) show(res.error, 'danger')
      else {
        show(`Renewed — live until ${new Date(res.data!.expiresAt).toLocaleDateString('en-PH')}`)
        router.refresh()
      }
    })
  }

  const doDelete = () => {
    if (!form.id) return
    startTransition(async () => {
      const res = await removeItem(form.id!, deleteReason.trim() || 'Removed by the owner')
      if (!res.ok) show(res.error, 'danger')
      else {
        show('Listing removed')
        router.push('/my-listings')
        router.refresh()
      }
    })
  }

  const upload = async (file: File) => {
    if (!form.id) return
    setUploading(true)
    try {
      const body = new FormData()
      body.set('itemId', form.id)
      body.set('file', file)
      const res = await fetch('/api/uploads/item-photos', { method: 'POST', body })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) show(json.error ?? 'Upload failed.', 'danger')
      else {
        show('Photo added')
        router.refresh()
      }
    } finally {
      setUploading(false)
    }
  }

  const dropPhoto = (photoId: string) => {
    setBusyPhoto(photoId)
    startTransition(async () => {
      const res = await deleteItemPhoto(photoId)
      if (!res.ok) show(res.error, 'danger')
      else router.refresh()
      setBusyPhoto(null)
    })
  }

  const spotForBarangay = options.spots // shown for all; owner can refine later
  const live = form.title || form.description ? form : null

  return (
    <>
      {justCreated ? (
        <Notice tone="olive" icon="check" className="mb-6">
          <div className="font-medium">
            {form.status === 'available' ? 'Your listing is live' : 'Draft saved'}
          </div>
          <p className="t-small mt-1">
            Listings run for 30 days. Add up to 8 photos below — the first one becomes the cover.
          </p>
        </Notice>
      ) : null}

      {globalMsg ? (
        <Notice tone="danger" icon="alert" className="mb-6">
          <div className="font-medium">We could not save that</div>
          <p className="t-small mt-1">{globalMsg} Reference: CT-LST-403</p>
        </Notice>
      ) : null}

      <form onSubmit={submit} className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* photos — edit mode only (a listing needs an id first) */}
          {mode === 'edit' ? (
            <section className="border border-line rounded-md bg-surface p-6">
              <div className="t-h3 mb-1">Photos</div>
              <p className="t-small text-ink45 mb-4">
                Up to 8, JPG or PNG, 5 MB each. The first photo is the cover.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {photos.map((p, i) => {
                  const src = p.path?.startsWith('http')
                    ? p.path
                    : p.path
                      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/${p.path}`
                      : null
                  return (
                    <div
                      key={p.id}
                      className="relative aspect-square rounded-sm overflow-hidden bg-paper2 border border-line group"
                    >
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-ink45">
                          <Icon name="box" size={20} />
                        </span>
                      )}
                      {i === 0 ? (
                        <span className="absolute top-1 left-1 font-mono text-[10px] uppercase bg-ink text-paper px-1.5 py-0.5 rounded-sm">
                          Cover
                        </span>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Delete photo"
                        disabled={pending || busyPhoto === p.id}
                        onClick={() => dropPhoto(p.id)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-sm bg-surface/90 border border-line inline-flex items-center justify-center hover:text-danger disabled:opacity-50"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  )
                })}
                <label className="aspect-square rounded-sm border border-dashed border-linestrong bg-paper2 flex flex-col items-center justify-center gap-1.5 text-ink45 hover:border-ink45 cursor-pointer transition-colors">
                  <Icon name="camera" size={22} />
                  <span className="font-mono text-[11px] uppercase">
                    {uploading ? 'Uploading…' : 'Add photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="sr-only"
                    disabled={uploading || photos.length >= 8}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void upload(f)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            </section>
          ) : null}

          <section className="border border-line rounded-md bg-surface p-6 space-y-5">
            <div>
              <div className="t-h3">What are you offering?</div>
              <p className="t-small text-ink45 mt-1">
                No cash, no delivery — one resident&apos;s thing for another&apos;s.
              </p>
            </div>

            <Field
              label="Listing title"
              required
              error={fields.title}
              hint={
                <span className="flex justify-between gap-3">
                  <span>Short and specific — “Kids bicycle, 16-inch, good condition”.</span>
                  <Counter value={form.title.length} max={80} />
                </span>
              }
            >
              <Input
                value={form.title}
                maxLength={120}
                error={Boolean(fields.title)}
                onChange={(e) => set('title', e.target.value)}
                placeholder="What are you offering?"
              />
            </Field>

            <Field
              label="Description"
              error={fields.description}
              hint={
                <span className="flex justify-between gap-3">
                  <span>Condition, size, how long you have had it, why you are letting it go.</span>
                  <Counter value={(form.description ?? '').length} max={2000} />
                </span>
              }
            >
              <Textarea
                value={form.description ?? ''}
                onChange={(e) => set('description', e.target.value)}
                rows={5}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Category" required error={fields.categoryId}>
                <Select
                  value={form.categoryId}
                  error={Boolean(fields.categoryId)}
                  onChange={(e) => set('categoryId', e.target.value)}
                >
                  <option value="">Choose a category…</option>
                  {options.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Condition" required>
                <Select value={form.condition} onChange={(e) => set('condition', e.target.value)}>
                  {CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field
              label="Looking for"
              error={fields.lookingFor}
              hint={
                <span className="flex justify-between gap-3">
                  <span>What would you take for it? Leave blank if you are open.</span>
                  <Counter value={(form.lookingFor ?? '').length} max={160} />
                </span>
              }
            >
              <Input
                value={form.lookingFor ?? ''}
                maxLength={200}
                onChange={(e) => set('lookingFor', e.target.value)}
                placeholder="A baby stroller, gardening tools, school supplies…"
              />
            </Field>

            <Field label="Trade type" required hint="Cash and delivery are never allowed.">
              <div className="space-y-2">
                {TRADE_TYPES.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-start gap-2.5 text-[14.5px] text-ink70 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="tradeType"
                      className="appearance-none w-5 h-5 mt-px flex-none border border-linestrong bg-surface checked:bg-ink checked:border-ink checked:bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27white%27 stroke-width=%273.4%27%3E%3Cpath d=%27M20 6L9 17l-5-5%27/%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat rounded-full checked:shadow-[inset_0_0_0_5px_var(--color-ink)] checked:bg-white"
                      checked={form.tradeType === t.id}
                      onChange={() => set('tradeType', t.id)}
                    />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
            </Field>

            {cashHits.length > 0 ? (
              <Notice tone="brass" icon="info">
                <div className="font-medium">Sounds like a sale — this listing will be flagged</div>
                <p className="t-small mt-1">
                  Words like “{cashHits.slice(0, 3).join('”, “')}” trip the no-cash rule. A
                  moderator will review it; swap-for-swap wording passes automatically.
                </p>
              </Notice>
            ) : null}
          </section>

          <section className="border border-line rounded-md bg-surface p-6 space-y-5">
            <div className="t-h3">Where</div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Your barangay" required error={fields.barangayId}>
                <Select
                  value={form.barangayId}
                  error={Boolean(fields.barangayId)}
                  onChange={(e) => set('barangayId', e.target.value)}
                >
                  <option value="">Choose a barangay…</option>
                  {options.barangays.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Preferred meetup spot" hint="Optional — you can agree on one later.">
                <Select
                  value={form.meetupSpotId}
                  onChange={(e) => set('meetupSpotId', e.target.value)}
                >
                  <option value="">No preference</option>
                  {spotForBarangay.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" loading={pending}>
              {mode === 'new' ? (publish ? 'Publish listing' : 'Save as draft') : 'Save changes'}
            </Button>
            {mode === 'new' ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => setPublish((p) => !p)}
                >
                  {publish ? 'Switch to draft' : 'Publish instead'}
                </Button>
                <ButtonLink href="/my-listings" variant="ghost" size="lg">
                  Discard
                </ButtonLink>
              </>
            ) : (
              <ButtonLink href={`/items/${form.id}`} variant="ghost" size="lg">
                View listing
              </ButtonLink>
            )}
          </div>
        </div>

        {/* side rail: preview + checklist */}
        <aside className="space-y-5">
          <div className="border border-line rounded-md bg-surface p-5 sticky top-24">
            <div className="t-meta mb-3">Live preview</div>
            <div className="border border-line rounded-sm bg-paper2 aspect-[4/3] flex items-center justify-center text-ink45 mb-3">
              <Icon name="camera" size={26} />
            </div>
            <div className="text-[15.5px] text-ink font-medium leading-snug">
              {live?.title?.trim() || 'Your listing title'}
            </div>
            <p className="t-small text-ink70 mt-1.5 line-clamp-3">
              {live?.description?.trim() || 'Describe what you are offering and what you would like in return.'}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="font-mono text-[11px] uppercase border border-line rounded-sm px-2 py-0.5">
                {CONDITIONS.find((c) => c.id === form.condition)?.label}
              </span>
              <span className="font-mono text-[11px] uppercase border border-line rounded-sm px-2 py-0.5">
                {options.categories.find((c) => c.id === form.categoryId)?.name ?? 'Category'}
              </span>
            </div>

            <div className="h-px bg-line my-4" />
            <div className="t-meta mb-2">Checklist</div>
            <ul className="space-y-1.5 t-small text-ink70">
              {[
                ['At least 3 photos', photos.length >= 3],
                ['Title between 3 and 80 characters', form.title.trim().length >= 3],
                ['Category chosen', Boolean(form.categoryId)],
                ['Barangay chosen', Boolean(form.barangayId)],
                ['No cash wording', cashHits.length === 0],
              ].map(([label, ok]) => (
                <li key={String(label)} className="flex items-center gap-2">
                  <Icon
                    name={ok ? 'check' : 'x'}
                    size={14}
                    className={ok ? 'text-olive' : 'text-ink45'}
                  />
                  <span className={ok ? '' : 'text-ink45'}>{label}</span>
                </li>
              ))}
            </ul>
            <p className="t-meta mt-4">
              {mode === 'new'
                ? 'Listings stay live for 30 days, then renew in one tap.'
                : 'Changes go live immediately for available listings.'}
            </p>
          </div>

          {mode === 'edit' ? (
            <div className="border border-line rounded-md bg-surface p-5 space-y-4">
              <div className="t-meta">Status</div>
              {initial?.status === 'pending' ? (
                <Notice tone="brass" icon="lock">
                  <p className="t-small">
                    An offer was accepted, so this listing stays <strong>Pending</strong> until the
                    trade finishes.
                  </p>
                </Notice>
              ) : (
                <Segmented
                  options={[
                    { id: 'available', label: 'Available' },
                    { id: 'paused', label: 'Paused' },
                    { id: 'exchanged', label: 'Exchanged' },
                  ]}
                  active={form.status}
                  onSelect={(id) => {
                    set('status', id)
                    changeStatus(id as 'available' | 'paused' | 'exchanged')
                  }}
                />
              )}
              <Button variant="secondary" block disabled={pending} onClick={renew}>
                Renew for 30 days
              </Button>
              <Button variant="ghost" block onClick={() => setConfirmDelete(true)}>
                Delete listing
              </Button>
            </div>
          ) : null}
        </aside>
      </form>

      {confirmDelete ? (
      <Dialog
        title="Delete this listing"
        blurb="Deleting is permanent — photos and its history go with it. To hide it temporarily, pause it instead."
        tone="danger"
        icon="trash"
        onClose={() => setConfirmDelete(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
            <Button variant="danger" disabled={pending} onClick={doDelete}>
              Delete permanently
            </Button>
          </>
        }
      >
        <Field label="Reason (optional)">
          <Input
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Duplicate listing, wrong photos…"
          />
        </Field>
      </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
