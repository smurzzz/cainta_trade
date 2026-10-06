import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Gallery } from '@/components/items/gallery'
import { GuestGate } from '@/components/items/guest-gates'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/icon'
import { ItemCard, type ItemCardData } from '@/components/ui/item-card'
import { SectionHead } from '@/components/ui/card'
import { ITEMS } from '@/lib/mock/data'
import { imgUrl } from '@/lib/mock/images'

const FULL_NAMES: Record<string, string> = {
  Marites: 'Marites Bautista',
  Danny: 'Danny R.',
  Nestor: 'Nestor R.',
  Karla: 'Karla V.',
  Lito: 'Lito M.',
  Jomar: 'Jomar A.',
  Grace: 'Grace P.',
  Mylene: 'Mylene S.',
}

const SIMILAR: ItemCardData[] = [
  {
    id: 'tufted-sofa',
    title: 'Two-seater tufted sofa',
    status: 'Available',
    category: 'Furniture',
    barangay: 'San Juan',
    owner: 'Jomar',
    ownerAvatar: '/assets/avatar-3.svg',
    time: '3d ago',
    lookingFor: 'Bookshelf or stand fan',
    photo: imgUrl('grey-sofa', 800),
    photoLabel: 'Grey sofa',
  },
  {
    id: 'leather-sofa',
    title: 'Leather sofa, 3-seater',
    status: 'Available',
    category: 'Furniture',
    barangay: 'San Isidro',
    owner: 'Mylene',
    ownerAvatar: '/assets/avatar-3.svg',
    time: '5d ago',
    lookingFor: 'Dining set',
    photo: imgUrl('leather-sofa', 800),
    photoLabel: 'Leather sofa',
  },
  {
    id: 'coffee-table',
    title: 'Round wooden coffee table',
    status: 'Available',
    category: 'Furniture',
    barangay: 'San Juan',
    owner: 'Karla',
    ownerAvatar: '/assets/avatar-2.svg',
    time: '1w ago',
    lookingFor: 'Area rug',
    photo: imgUrl('coffee-table', 800),
    photoLabel: 'Coffee table',
  },
  {
    id: 'shell-chair',
    title: 'Black shell accent chair',
    status: 'Available',
    category: 'Furniture',
    barangay: 'San Roque',
    owner: 'Karla',
    ownerAvatar: '/assets/avatar-2.svg',
    time: '1w ago',
    lookingFor: 'Reading lamp',
    photo: imgUrl('shell-chair', 800),
    photoLabel: 'Accent chair',
  },
]

const SPOTS = [
  ['Cainta Municipal Hall grounds', 'San Andres · 1.2 km'],
  ['Robinsons Cainta activity area', 'San Andres · 1.8 km'],
  ['Barangay San Andres hall lobby', 'San Andres · 0.6 km'],
]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const item = ITEMS.find((i) => i.id === id)
  return { title: item ? `${item.title} — CaintaTrade` : 'Item — CaintaTrade' }
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = ITEMS.find((i) => i.id === id)
  if (!item) notFound()

  const statusLabel =
    item.status === 'Pending'
      ? 'Pending — offer accepted'
      : item.status === 'Exchanged'
        ? 'Exchanged'
        : 'Available'
  const statusLine =
    item.status === 'Pending'
      ? 'Pending — an offer was accepted on 4 Oct'
      : item.status === 'Exchanged'
        ? 'Exchanged — the trade is complete'
        : 'Available — open to offers'

  return (
    <div className="wrap py-7 md:py-11">
      {/* breadcrumbs */}
      <div className="flex flex-wrap gap-2 t-meta mb-5">
        <Link href="/browse" className="hover:text-accent">
          Browse
        </Link>
        <span>/</span>
        <Link href="/browse" className="hover:text-accent">
          {item.category}
        </Link>
        <span>/</span>
        <span className="text-ink">{item.title}</span>
      </div>

      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <Gallery
            photos={item.photos}
            label={item.photoLabel}
            alt={`${item.title} — listing photo`}
            timeLabel={`added ${item.time.replace(' ago', '')} ago`}
            itemId={item.code}
          />

          <div className="mt-8">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="pending" size="lg">
                <span className="w-[7px] h-[7px] rounded-full bg-accent flex-none" />
                {statusLabel}
              </Badge>
              <Badge>{item.category}</Badge>
              <Badge>Condition: {item.condition.toLowerCase()}</Badge>
            </div>
            <h1 className="t-h1">{item.title}</h1>
            <div className="flex flex-wrap gap-4 mt-3">
              <span className="t-meta inline-flex items-center gap-1.5">
                <Icon name="pin" size={14} /> {item.barangay}, Cainta
              </span>
              <span className="t-meta inline-flex items-center gap-1.5">
                <Icon name="clock" size={14} /> Posted {item.time.replace('ago', '').trim()} ago
              </span>
              <span className="t-meta inline-flex items-center gap-1.5">
                <Icon name="eye" size={14} /> {item.views} views · 3 saved
              </span>
            </div>

            <div className="mt-6 pt-6 border-t border-line">
              <div className="t-label mb-2">Description</div>
              <p className="t-body">{item.description}</p>
            </div>

            <div className="mt-6 bg-accenttint border border-[#e8cfc6] rounded-sm px-3.5 py-3 text-[14px] text-[#7d3322]">
              <div className="t-label-accent mb-1">Looking for in exchange</div>
              <p className="t-body !text-[#7d3322]">{item.lookingFor}.</p>
            </div>

            <div className="mt-8">
              <div className="t-label mb-3">Item details</div>
              <div className="border border-line rounded-md bg-surface p-6">
                <div className="grid grid-cols-1 md:grid-cols-[168px_minmax(0,1fr)] gap-x-5 gap-y-0.5 text-[14.5px]">
                  {[
                    ['Category', item.category],
                    ['Condition', item.condition],
                    ['Status', statusLine],
                    ['Barangay', `${item.barangay}, Cainta`],
                    ['Trade type', `${item.tradeType} · no cash`],
                    ['Listed', item.time],
                  ].map(([k, v]) => (
                    <div key={k} className="contents">
                      <span className="font-mono text-[11.5px] tracking-[0.02em] uppercase text-ink45 pt-1">
                        {k}
                      </span>
                      <span className="text-ink pb-3 md:pb-0">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 items-start border border-[#e3d3ac] border-l-[3px] border-l-brass bg-brasstint rounded-sm px-4 py-3.5 mt-6">
              <Icon name="shield" size={18} className="mt-0.5 flex-none" />
              <div>
                <div className="font-medium">Trading safely in Cainta</div>
                <p className="t-small mt-1">
                  Meet at a public place such as the barangay hall, the Municipal Hall grounds, or
                  a mall activity area. Inspect the item before you hand anything over, and never
                  send money or documents. These are ordinary public spaces — CaintaTrade is an
                  independent community project, not affiliated with the Cainta municipal government
                  (LGU).{' '}
                  <Link href="/how-it-works#safety" className="underline underline-offset-[3px] hover:text-accent">
                    Read the safety guide
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* right rail */}
        <div className="flex flex-col gap-4">
          <div className="border border-line rounded-md bg-surface p-6">
            <div className="t-label mb-3">Offered by</div>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.ownerAvatar}
                alt={`Portrait of ${FULL_NAMES[item.owner] ?? item.owner}`}
                className="w-[88px] h-[88px] rounded-full object-cover bg-paper2 border border-line flex-none"
              />
              <div>
                <div className="t-h3">{FULL_NAMES[item.owner] ?? item.owner}</div>
                <div className="t-meta mt-1">{item.barangay} · member since September 2026</div>
                <div className="flex items-center gap-1 text-brass text-[13px] mt-1">
                  <Icon name="star" size={14} />
                  5.0 · 1 completed trade
                </div>
              </div>
            </div>
            <div className="h-px bg-line my-5" />
            <div className="flex items-center justify-between gap-3">
              <span className="t-small">Response time</span>
              <span className="t-small">
                <b className="text-ink font-semibold">usually within a day</b>
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 mt-2">
              <span className="t-small">Member of</span>
              <span className="t-small">
                <b className="text-ink font-semibold">{item.barangay} · 5 yrs</b>
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="available">Verified resident</Badge>
              <Badge>Mobile confirmed</Badge>
            </div>
          </div>

          <GuestGate />

          <div className="border border-line rounded-md bg-paper2 p-6">
            <div className="t-label mb-3">Suggested meetup spots nearby</div>
            <div className="flex flex-col">
              {SPOTS.map(([name, meta], i) => (
                <div key={name} className="flex items-center gap-3.5 py-3.5 border-b border-line last:border-b-0">
                  <span className="font-mono text-[11px] text-ink45 w-[26px] flex-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="t-small text-ink">{name}</div>
                    <div className="t-meta">{meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* similar items */}
      <div className="mt-10">
        <SectionHead
          label="Near you"
          title="Other furniture near you"
          aside={
            <Link href="/browse" className="inline-flex items-center gap-2 font-mono text-[12.5px] hover:text-accent hover:gap-3 transition-all">
              See all <Icon name="arrow" size={16} />
            </Link>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {SIMILAR.map((s) => (
            <ItemCard key={s.id} item={s} />
          ))}
        </div>
      </div>
    </div>
  )
}
