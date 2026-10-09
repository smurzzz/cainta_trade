'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Empty } from '@/components/ui/feedback'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/field'
import { Segmented, TabBar } from '@/components/ui/tabs'
import { Toast, useToast } from '@/components/ui/toast'
import { removeItem, renewItem } from '@/actions/listings'
import type { MyListing, MyListingResult } from '@/lib/queries/catalog'
import { photoUrl } from '@/lib/photos'
import { isWithin, timeAgo } from '@/lib/time'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'pending', label: 'Pending' },
  { id: 'exchanged', label: 'Exchanged' },
  { id: 'draft', label: 'Drafts' },
  { id: 'closed', label: 'Removed / expired' },
]

const matches = (row: MyListing, tab: string) =>
  tab === 'all'
    ? true
    : tab === 'closed'
      ? row.statusKey === 'removed' || row.statusKey === 'expired' || row.statusKey === 'paused'
      : row.statusKey === tab

function src(photo: string | null) {
  if (!photo) return null
  return photo.startsWith('http') ? photo : photoUrl(photo)
}

/** docs/02 C13 · my listings: status tabs, search/sort and row actions. Rows
 *  become stacked cards on mobile (same markup, no table). */
export function MyListingsScreen({ initial }: { initial: MyListingResult }) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'expiry'>('newest')
  const [removing, setRemoving] = useState<MyListing | null>(null)
  const [reason, setReason] = useState('')
  const [renewing, setRenewing] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: initial.total }
    for (const row of initial.rows) {
      for (const t of TABS) {
        if (t.id !== 'all' && matches(row, t.id)) c[t.id] = (c[t.id] ?? 0) + 1
      }
    }
    return c
  }, [initial])

  const rows = useMemo(() => {
    let list = initial.rows.filter((r) => matches(r, tab))
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      list = list.filter((r) => r.title.toLowerCase().includes(needle))
    }
    list = [...list]
    if (sort === 'newest') list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (sort === 'oldest') list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    if (sort === 'expiry')
      list.sort((a, b) => (a.expiresAt ?? '9999').localeCompare(b.expiresAt ?? '9999'))
    return list
  }, [initial.rows, tab, q, sort])

  const doRenew = (row: MyListing) => {
    setRenewing(row.id)
    startTransition(async () => {
      const res = await renewItem(row.id)
      if (!res.ok) show(res.error, 'danger')
      else {
        show(`Renewed — now live until ${new Date(res.data!.expiresAt).toLocaleDateString('en-PH')}`)
        router.refresh()
      }
      setRenewing(null)
    })
  }

  const doRemove = () => {
    if (!removing) return
    const target = removing
    startTransition(async () => {
      const res = await removeItem(target.id, reason.trim() || 'Removed by the owner')
      if (!res.ok) show(res.error, 'danger')
      else {
        show('Listing removed')
        setRemoving(null)
        setReason('')
        router.refresh()
      }
    })
  }

  if (initial.total === 0) {
    return (
      <Empty icon="box" title="You have not posted anything yet">
        Post your first listing and neighbours can offer on it — item for item, no cash.
        <div className="mt-5">
          <ButtonLink href="/items/new">Post an item</ButtonLink>
        </div>
      </Empty>
    )
  }

  return (
    <>
      <TabBar
        tabs={TABS.map((t) => ({ ...t, count: counts[t.id] ?? 0 }))}
        active={tab}
        onSelect={setTab}
      />

      <div className="flex flex-wrap items-center gap-3 py-4">
        <Input
          type="search"
          placeholder="Search your listings"
          aria-label="Search your listings"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Segmented
          options={[
            { id: 'newest', label: 'Newest' },
            { id: 'oldest', label: 'Oldest' },
            { id: 'expiry', label: 'Expiry' },
          ]}
          active={sort}
          onSelect={(id) => setSort(id as 'newest' | 'oldest' | 'expiry')}
        />
        <ButtonLink href="/items/new" className="ml-auto">
          Post an item
        </ButtonLink>
      </div>

      {rows.length === 0 ? (
        <Empty icon="search" title="Nothing matches">
          No listings match this tab or search. Clear the search or pick another tab.
        </Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const photo = src(row.photo)
            const expiringSoon = isWithin(row.expiresAt, 7 * 86_400_000)
            return (
              <li
                key={row.id}
                className="border border-line rounded-md bg-surface p-4 flex flex-wrap items-center gap-4"
              >
                <div className="w-16 h-16 rounded-sm overflow-hidden bg-paper2 border border-line flex-none">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-ink45">
                      <Icon name="box" size={22} />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/items/${row.id}`}
                    className="text-[15.5px] text-ink font-medium hover:text-accent line-clamp-1"
                  >
                    {row.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 t-meta mt-1">
                    <span>{row.status}</span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="eye" size={13} /> {row.views}
                    </span>
                    <span>{row.saveCount} saved</span>
                    <span>posted {timeAgo(row.createdAt)}</span>
                    {row.expiresAt ? (
                      <span className={expiringSoon ? 'text-danger' : ''}>
                        expires {new Date(row.expiresAt).toLocaleDateString('en-PH')}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ButtonLink href={`/items/${row.id}/edit`} size="sm" variant="secondary">
                    Edit
                  </ButtonLink>
                  <ButtonLink href="/offers?view=received" size="sm" variant="secondary">
                    Offers
                  </ButtonLink>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending || renewing === row.id}
                    onClick={() => doRenew(row)}
                  >
                    {renewing === row.id ? 'Renewing…' : 'Renew'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setRemoving(row)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {removing ? (
      <Dialog
        title="Remove this listing"
        blurb="It will be hidden from browse and new offers close immediately. Accepted trades must be finished before removal."
        tone="danger"
        icon="trash"
        onClose={() => setRemoving(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Keep it
            </Button>
            <Button variant="danger" disabled={pending} onClick={doRemove}>
              Remove listing
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-[7px]">
          <span className="font-mono text-[12.5px]">Reason (optional)</span>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="No longer available, found it elsewhere…"
          />
        </label>
      </Dialog>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
