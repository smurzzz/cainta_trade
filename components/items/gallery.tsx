'use client'

import { useState } from 'react'
import { PhotoFrame } from '@/components/ui/item-card'
import { imgUrl } from '@/lib/mock/images'

/** Photos are real storage URLs (https://…/storage/v1/object/…); the mockup
 *  fixture keys still resolve through imgUrl(). Items with no photos render
 *  the labelled gradient placeholder instead of a fake image. */
function srcFor(p: string | undefined, w: number) {
  if (!p) return undefined
  return p.startsWith('http') || p.startsWith('/') ? p : imgUrl(p, w)
}

/** Thumbnail + main photo gallery (mockup .gallery). */
export function Gallery({
  photos,
  label,
  alt,
  timeLabel,
  itemId,
}: {
  photos: string[]
  label: string
  alt: string
  timeLabel: string
  itemId: string
}) {
  const [active, setActive] = useState(0)
  const key = photos[active] ?? photos[0]

  if (!photos.length) {
    return (
      <div>
        <PhotoFrame src={undefined} alt={alt} label={label} aspect="16 / 10" sizes="(max-width: 700px) 92vw, 760px" priority />
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          <span className="t-meta">No photos yet · {timeLabel}</span>
          <span className="t-meta">Item ID {itemId}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3.5 md:grid-cols-[84px_minmax(0,1fr)] items-start">
      <div className="flex flex-col gap-2.5 max-md:order-2 max-md:flex-row">
        {photos.map((p, i) => (
          <button
            key={p}
            type="button"
            aria-label={`Photo ${i + 1}`}
            onClick={() => setActive(i)}
            className={`border rounded-xs overflow-hidden w-[84px] max-md:w-[68px] max-md:flex-none aspect-square ${
              i === active ? 'border-ink' : 'border-line'
            }`}
          >
            <span className="block w-full h-full">
              <PhotoFrame src={srcFor(p, 200)} alt="" aspect="1 / 1" sizes="84px" />
            </span>
          </button>
        ))}
      </div>
      <div className="min-w-0 max-md:order-1">
        <PhotoFrame src={srcFor(key, 1200)} alt={alt} label={label} aspect="16 / 10" sizes="(max-width: 700px) 92vw, 760px" priority />
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          <span className="t-meta">
            Photo {active + 1} of {photos.length} · {timeLabel}
          </span>
          <span className="t-meta">Item ID {itemId}</span>
        </div>
      </div>
    </div>
  )
}
