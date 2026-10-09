'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import type { WishlistRow } from '@/actions/wishlist'
import { Button, ButtonLink } from '@/components/ui/button'
import { Empty, Notice } from '@/components/ui/feedback'
import { Icon } from '@/components/ui/icon'
import { Segmented } from '@/components/ui/tabs'
import { Toast, useToast } from '@/components/ui/toast'
import { unsaveItem } from '@/actions/wishlist'
import { photoUrl } from '@/lib/photos'
import { timeAgo } from '@/lib/time'

const NOTE_COPY: Record<string, string> = {
  pending: 'Pending — an offer was accepted, watch this space',
  removed: 'The owner removed this listing',
  exchanged: 'It was exchanged — browse similar items instead',
}

function src(path: string | null) {
  if (!path) return null
  return path.startsWith('http') ? path : photoUrl(path)
}

/** docs/02 C20 · wishlist grid with filter chips and state notes. */
export function WishlistScreen({ rows, error }: { rows: WishlistRow[]; error: string | null }) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [chip, setChip] = useState<'all' | 'available' | 'changed'>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const list = useMemo(() => {
    if (chip === 'available') return rows.filter((r) => r.status === 'available')
    if (chip === 'changed') return rows.filter((r) => r.note !== null)
    return rows
  }, [rows, chip])

  const changedCount = rows.filter((r) => r.note !== null).length

  const drop = (itemId: string) => {
    setBusy(itemId)
    startTransition(async () => {
      const res = await unsaveItem(itemId)
      if (!res.ok) show(res.error, 'danger')
      else router.refresh()
      setBusy(null)
    })
  }

  if (error) {
    return (
      <Notice tone="danger" icon="alert">
        <p className="t-small">
          {error} Reference: CT-LST-403
        </p>
      </Notice>
    )
  }

  if (rows.length === 0) {
    return (
      <Empty icon="heart" title="Nothing saved yet">
        Tap the heart on any listing to keep it here. Saved items never notify their owner.
        <div className="mt-5">
          <ButtonLink href="/browse">Browse items</ButtonLink>
        </div>
      </Empty>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Segmented
          options={[
            { id: 'all', label: 'All' },
            { id: 'available', label: 'Still available' },
            { id: 'changed', label: `Changed${changedCount ? ` (${changedCount})` : ''}` },
          ]}
          active={chip}
          onSelect={(id) => setChip(id as 'all' | 'available' | 'changed')}
        />
      </div>

      {changedCount > 0 && chip !== 'changed' ? (
        <Notice tone="brass" icon="info" className="mb-5">
          <p className="t-small">
            <b>{changedCount}</b> saved item{changedCount === 1 ? '' : 's'} changed since you saved
            it — check the notes below.
          </p>
        </Notice>
      ) : null}

      {list.length === 0 ? (
        <Empty icon="search" title="Nothing matches this filter">
          Switch back to All to see everything you saved.
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((r) => {
            const photo = src(r.main_photo_path)
            const available = r.status === 'available'
            return (
              <div
                key={r.item_id}
                className="border border-line rounded-md bg-surface overflow-hidden flex flex-col"
              >
                <Link href={`/items/${r.item_id}`} className="relative block aspect-[4/3] bg-paper2">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-ink45">
                      <Icon name="box" size={28} />
                    </span>
                  )}
                  <span
                    className={`absolute top-2 left-2 font-mono text-[10.5px] uppercase px-2 py-0.5 rounded-sm border ${
                      available
                        ? 'border-[#c3d1bb] bg-olivetint text-[#3f5236]'
                        : 'border-line bg-surface/95 text-ink45'
                    }`}
                  >
                    {available ? 'Available' : (r.status ?? 'Unknown')}
                  </span>
                </Link>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  <Link
                    href={`/items/${r.item_id}`}
                    className="text-[15.5px] text-ink font-medium hover:text-accent line-clamp-2"
                  >
                    {r.title ?? 'Listing'}
                  </Link>
                  <div className="t-meta">saved {timeAgo(r.saved_at)}</div>
                  {r.note ? (
                    <p className="t-small text-[#5c4512] bg-brasstint border border-[#e3d3ac] rounded-sm px-2.5 py-1.5">
                      {NOTE_COPY[r.note] ?? 'This listing changed'}
                    </p>
                  ) : null}

                  <div className="flex gap-2 mt-auto pt-2">
                    {available ? (
                      <ButtonLink href={`/items/${r.item_id}/offer`} size="sm">
                        Make an offer
                      </ButtonLink>
                    ) : (
                      <ButtonLink href={`/items/${r.item_id}`} size="sm" variant="secondary">
                        View
                      </ButtonLink>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending || busy === r.item_id}
                      onClick={() => drop(r.item_id)}
                      aria-label="Remove from wishlist"
                    >
                      <Icon name="heart" size={15} />
                      {busy === r.item_id ? 'Removing…' : 'Unsave'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
