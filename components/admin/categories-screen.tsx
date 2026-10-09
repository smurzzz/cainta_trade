'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/field'
import { Notice } from '@/components/ui/feedback'
import { Icon } from '@/components/ui/icon'
import { Toast, useToast } from '@/components/ui/toast'
import {
  deleteCategory,
  deleteKeyword,
  reorderCategories,
  saveCategory,
  saveKeyword,
} from '@/actions/admin-console'

export type CategoryRow = {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
  is_enabled: boolean
}

export type KeywordRow = {
  id: string
  word: string
  action: 'hold' | 'flag'
  is_enabled: boolean
}

type CatDialog =
  | null
  | { mode: 'new'; row?: undefined }
  | { mode: 'edit'; row: CategoryRow }

/** docs/02 D29 · category and keyword administration. */
export function CategoriesScreen({
  categories,
  keywords,
}: {
  categories: CategoryRow[]
  keywords: KeywordRow[]
}) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [pending, startTransition] = useTransition()
  const [catDialog, setCatDialog] = useState<CatDialog>(null)
  const [catForm, setCatForm] = useState({ name: '', sortOrder: '0', enabled: true, parentId: '' })
  const [word, setWord] = useState('')
  const [wordAction, setWordAction] = useState<'hold' | 'flag'>('flag')

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) show(res.error ?? 'That did not go through.', 'danger')
      else {
        show(okMsg)
        router.refresh()
      }
    })
  }

  const openEdit = (row: CategoryRow) => {
    setCatForm({
      name: row.name,
      sortOrder: String(row.sort_order),
      enabled: row.is_enabled,
      parentId: row.parent_id ?? '',
    })
    setCatDialog({ mode: 'edit', row })
  }

  const openNew = () => {
    setCatForm({ name: '', sortOrder: String(categories.length), enabled: true, parentId: '' })
    setCatDialog({ mode: 'new' })
  }

  const saveCat = () => {
    const payload =
      catDialog?.mode === 'edit'
        ? {
            id: catDialog.row.id,
            name: catForm.name,
            sortOrder: Number(catForm.sortOrder) || 0,
            isEnabled: catForm.enabled,
            parentId: catForm.parentId,
          }
        : {
            name: catForm.name,
            sortOrder: Number(catForm.sortOrder) || 0,
            isEnabled: catForm.enabled,
            parentId: catForm.parentId,
          }
    startTransition(async () => {
      const res = await saveCategory(payload)
      if (!res.ok) show(res.error, 'danger')
      else {
        show(catDialog?.mode === 'edit' ? 'Category updated' : 'Category created')
        setCatDialog(null)
        router.refresh()
      }
    })
  }

  const move = (index: number, dir: -1 | 1) => {
    const next = [...categories]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    const a = next[index]
    const b = next[target]
    run(
      () =>
        reorderCategories({
          items: [
            { id: a.id, sortOrder: b.sort_order },
            { id: b.id, sortOrder: a.sort_order },
          ],
        }),
      'Order saved',
    )
  }

  return (
    <div className="space-y-8">
      <section className="border border-line rounded-md bg-surface p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <div className="t-h3">Categories</div>
            <p className="t-meta mt-0.5">{categories.length} total · rename updates every listing</p>
          </div>
          <Button size="sm" onClick={openNew}>
            Add category
          </Button>
        </div>

        <ul className="divide-y divide-line">
          {categories.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <span className="flex flex-col gap-0.5">
                <button
                  type="button"
                  aria-label={`Move ${c.name} up`}
                  disabled={pending || i === 0}
                  onClick={() => move(i, -1)}
                  className="text-ink45 hover:text-ink disabled:opacity-30"
                >
                  <Icon name="chevD" size={14} className="rotate-180" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${c.name} down`}
                  disabled={pending || i === categories.length - 1}
                  onClick={() => move(i, 1)}
                  className="text-ink45 hover:text-ink disabled:opacity-30"
                >
                  <Icon name="chevD" size={14} />
                </button>
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-[15px] text-ink">{c.name}</span>
                <span className="t-meta ml-2">
                  #{c.sort_order}
                  {c.parent_id ? ' · subcategory' : ''}
                </span>
              </span>
              <span
                className={`font-mono text-[10.5px] uppercase px-2 py-0.5 rounded-sm border ${
                  c.is_enabled
                    ? 'border-[#c3d1bb] bg-olivetint text-[#3f5236]'
                    : 'border-line bg-paper2 text-ink45'
                }`}
              >
                {c.is_enabled ? 'enabled' : 'hidden'}
              </span>
              <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  run(() => deleteCategory({ id: c.id }), 'Category deleted (only if it was empty)')
                }
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-line rounded-md bg-surface p-6">
        <div className="t-h3 mb-1">Prohibited keywords</div>
        <p className="t-meta mb-4">
          “Hold” parks the listing for review before it goes live; “flag” lets it publish but marks
          it for moderators.
        </p>

        <form
          className="flex flex-wrap items-end gap-3 mb-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (word.trim().length < 2) return
            const w = word.trim()
            startTransition(async () => {
              const res = await saveKeyword({ word: w, action: wordAction, isEnabled: true })
              if (!res.ok) show(res.error, 'danger')
              else {
                show('Keyword added')
                setWord('')
                router.refresh()
              }
            })
          }}
        >
          <Field label="Word or phrase">
            <Input value={word} maxLength={60} onChange={(e) => setWord(e.target.value)} placeholder="gcash" />
          </Field>
          <Field label="Action">
            <Select
              value={wordAction}
              onChange={(e) => setWordAction(e.target.value as 'hold' | 'flag')}
            >
              <option value="flag">Flag for review</option>
              <option value="hold">Hold before publishing</option>
            </Select>
          </Field>
          <Button type="submit" disabled={pending || word.trim().length < 2}>
            Add keyword
          </Button>
        </form>

        <div className="flex flex-wrap gap-2.5">
          {keywords.map((k) => (
            <span
              key={k.id}
              className="inline-flex items-center gap-2 border border-line rounded-sm px-3 py-1.5 t-small"
            >
              <b>{k.word}</b>
              <span className="font-mono text-[10.5px] uppercase text-ink45">{k.action}</span>
              <button
                type="button"
                aria-label={`Delete keyword ${k.word}`}
                disabled={pending}
                onClick={() => run(() => deleteKeyword({ id: k.id }), 'Keyword deleted')}
                className="text-ink45 hover:text-danger"
              >
                <Icon name="x" size={13} />
              </button>
            </span>
          ))}
          {keywords.length === 0 ? (
            <Notice tone="default" icon="info">
              <p className="t-small">No keywords yet — cash words are flagged automatically.</p>
            </Notice>
          ) : null}
        </div>
      </section>

      {catDialog ? (
      <Dialog
        title={catDialog?.mode === 'edit' ? 'Edit category' : 'New category'}
        blurb="Members see this name while browsing. Renaming updates every listing in it."
        tone="accent"
        icon="tag"
        onClose={() => setCatDialog(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCatDialog(null)}>
              Cancel
            </Button>
            <Button disabled={pending || catForm.name.trim().length < 2} onClick={saveCat}>
              Save category
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required>
            <Input
              value={catForm.name}
              maxLength={60}
              onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sort order">
              <Input
                inputMode="numeric"
                value={catForm.sortOrder}
                onChange={(e) => setCatForm((f) => ({ ...f, sortOrder: e.target.value.replace(/\D/g, '') }))}
              />
            </Field>
            <Field label="Parent category">
              <Select
                value={catForm.parentId}
                onChange={(e) => setCatForm((f) => ({ ...f, parentId: e.target.value }))}
              >
                <option value="">None (top level)</option>
                {categories
                  .filter((c) => c.id !== catDialog?.row?.id && !c.parent_id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2.5 t-small cursor-pointer">
            <input
              type="checkbox"
              checked={catForm.enabled}
              onChange={(e) => setCatForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="w-4 h-4 accent-[var(--color-ink)]"
            />
            Enabled — members can pick it while posting
          </label>
        </div>
      </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </div>
  )
}
