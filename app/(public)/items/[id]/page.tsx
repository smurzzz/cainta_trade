import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { Gallery } from '@/components/items/gallery'
import { GuestGate } from '@/components/items/guest-gates'
import { ItemActions } from '@/components/items/item-actions'
import { ViewCounter } from '@/components/items/view-counter'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { ItemCard } from '@/components/ui/item-card'
import { SectionHead } from '@/components/ui/card'
import { getItem, slug, timeAgo, type ItemDetail } from '@/lib/queries/catalog'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Ctx = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { id } = await params
  const item = await getItem(id)
  return { title: item ? `${item.title} — CaintaTrade` : 'Item — CaintaTrade' }
}

function statusBadge(item: ItemDetail) {
  switch (item.statusKey) {
    case 'pending':
      return 'Pending — offer accepted'
    case 'exchanged':
      return 'Exchanged'
    case 'paused':
      return 'Paused by the owner'
    case 'expired':
      return 'Expired'
    default:
      return 'Available'
  }
}

function statusLine(item: ItemDetail) {
  switch (item.statusKey) {
    case 'pending':
      return 'Pending — an offer was accepted'
    case 'exchanged':
      return 'Exchanged — the trade is complete'
    case 'paused':
      return 'Paused — hidden from new offers'
    case 'expired':
      return 'Expired — the listing needs a renewal'
    default:
      return 'Available — open to offers'
  }
}

function memberSince(iso: string | null) {
  if (!iso) return 'recently'
  return new Date(iso).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
}

export default async function ItemPage({ params }: Ctx) {
  const { id } = await params
  const item = await getItem(id)
  if (!item) notFound()

  // viewer context: signed-in members get real wishlist + report actions
  const { userId } = await auth()
  let saved = false
  if (userId) {
    const { data } = await supabaseAdmin()
      .from('wishlist')
      .select('item_id')
      .eq('user_id', userId)
      .eq('item_id', item.id)
      .maybeSingle()
    saved = Boolean(data)
  }

  const posted = timeAgo(item.createdAt)
  const owner = item.owner

  return (
    <div className="wrap py-7 md:py-11">
      <ViewCounter itemId={item.id} />

      {/* breadcrumbs */}
      <div className="flex flex-wrap gap-2 t-meta mb-5">
        <Link href="/browse" className="hover:text-accent">
          Browse
        </Link>
        <span>/</span>
        <Link href={`/browse?category=${slug(item.category)}`} className="hover:text-accent">
          {item.category}
        </Link>
        <span>/</span>
        <span className="text-ink">{item.title}</span>
      </div>

      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <Gallery
            photos={item.photos}
            label={item.title}
            alt={`${item.title} — listing photo`}
            timeLabel={`posted ${posted}`}
            itemId={item.code}
          />

          <div className="mt-8">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant={item.statusKey === 'available' ? 'available' : item.statusKey === 'exchanged' ? 'exchanged' : 'pending'} size="lg">
                <span className="w-[7px] h-[7px] rounded-full bg-accent flex-none" />
                {statusBadge(item)}
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
                <Icon name="clock" size={14} /> Posted {posted}
              </span>
              <span className="t-meta inline-flex items-center gap-1.5">
                <Icon name="eye" size={14} /> {item.views} views · {item.saveCount} saved
              </span>
            </div>

            <div className="mt-6 pt-6 border-t border-line">
              <div className="t-label mb-2">Description</div>
              <p className="t-body">{item.description || 'No description was given.'}</p>
            </div>

            {item.lookingFor ? (
              <div className="mt-6 bg-accenttint border border-[#e8cfc6] rounded-sm px-3.5 py-3 text-[14px] text-[#7d3322]">
                <div className="t-label-accent mb-1">Looking for in exchange</div>
                <p className="t-body !text-[#7d3322]">{item.lookingFor}.</p>
              </div>
            ) : null}

            <div className="mt-8">
              <div className="t-label mb-3">Item details</div>
              <div className="border border-line rounded-md bg-surface p-6">
                <div className="grid grid-cols-1 md:grid-cols-[168px_minmax(0,1fr)] gap-x-5 gap-y-0.5 text-[14.5px]">
                  {[
                    ['Category', item.category],
                    ['Condition', item.condition],
                    ['Status', statusLine(item)],
                    ['Barangay', `${item.barangay}, Cainta`],
                    ['Trade type', `${item.tradeType} · no cash`],
                    ['Listed', posted],
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
                src={owner?.avatar ?? '/assets/avatar-1.svg'}
                alt={`Portrait of ${owner?.name ?? 'A neighbour'}`}
                className="w-[88px] h-[88px] rounded-full object-cover bg-paper2 border border-line flex-none"
              />
              <div>
                <div className="t-h3">{owner?.name ?? 'A neighbour'}</div>
                <div className="t-meta mt-1">
                  {(owner?.barangay ?? item.barangay)} · member since {memberSince(owner?.memberSince ?? null)}
                </div>
                <div className="flex items-center gap-1 text-brass text-[13px] mt-1">
                  <Icon name="star" size={14} />
                  {owner?.avgRating ? `${owner.avgRating.toFixed(1)} · ${owner.ratingCount} rating${owner.ratingCount === 1 ? '' : 's'}` : 'No ratings yet'}
                </div>
              </div>
            </div>
            <div className="h-px bg-line my-5" />
            <div className="flex items-center justify-between gap-3">
              <span className="t-small">Completed trades</span>
              <span className="t-small">
                <b className="text-ink font-semibold">{owner?.completedTrades ?? 0}</b>
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 mt-2">
              <span className="t-small">Member of</span>
              <span className="t-small">
                <b className="text-ink font-semibold">{owner?.barangay ?? item.barangay}</b>
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="available">Verified resident</Badge>
              <Badge>{(owner?.completedTrades ?? 0) > 0 ? 'Trades completed' : 'New member'}</Badge>
            </div>
          </div>

          {userId && owner?.id === userId ? (
            <div className="border border-line rounded-md bg-surface p-6">
              <div className="t-label mb-3">This is your listing</div>
              <p className="t-small text-ink70 mb-4">
                {item.statusKey === 'pending'
                  ? 'An offer was accepted — finish the trade to change this listing.'
                  : 'Edit the details, add photos or check the offers you have received.'}
              </p>
              <ButtonLink href={`/items/${item.id}/edit`} block>
                Edit listing
              </ButtonLink>
              <ButtonLink
                href="/offers?view=received"
                variant="secondary"
                block
                className="mt-2.5"
              >
                Offers received
              </ButtonLink>
              <div className="h-px bg-line my-5" />
              <Link
                href="/my-listings"
                className="inline-flex items-center gap-2 font-mono text-[12.5px] hover:text-accent hover:gap-3 transition-all"
              >
                All my listings <Icon name="arrow" size={16} />
              </Link>
            </div>
          ) : userId ? (
            <>
              {item.statusKey === 'available' ? (
                <div className="border border-line rounded-md bg-surface p-6">
                  <div className="t-label mb-3">Make an offer</div>
                  <p className="t-small text-ink70 mb-4">
                    Offer one of your own listings in exchange — no cash, agreed at a public meetup
                    spot.
                  </p>
                  <ButtonLink href={`/items/${item.id}/offer`} block>
                    Make an offer
                  </ButtonLink>
                </div>
              ) : (
                <div className="border border-line rounded-md bg-paper2 p-6">
                  <div className="t-label mb-2">Offers are closed</div>
                  <p className="t-small text-ink70">
                    {statusLine(item)}. Save it to your wishlist and you will see similar items
                    appear in browse.
                  </p>
                </div>
              )}
              <ItemActions itemId={item.id} saved={saved} statusKey={item.statusKey} />
            </>
          ) : (
            <GuestGate status={item.statusKey} />
          )}

          {item.spots.length ? (
            <div className="border border-line rounded-md bg-paper2 p-6">
              <div className="t-label mb-3">Suggested meetup spots nearby</div>
              <div className="flex flex-col">
                {item.spots.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3.5 py-3.5 border-b border-line last:border-b-0">
                    <span className="font-mono text-[11px] text-ink45 w-[26px] flex-none">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div className="t-small text-ink">{s.name}</div>
                      <div className="t-meta">{s.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* similar items */}
      {item.similar.length ? (
        <div className="mt-10">
          <SectionHead
            label="Near you"
            title={`Other ${item.category.toLowerCase()} near you`}
            aside={
              <Link href={`/browse?category=${slug(item.category)}`} className="inline-flex items-center gap-2 font-mono text-[12.5px] hover:text-accent hover:gap-3 transition-all">
                See all <Icon name="arrow" size={16} />
              </Link>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {item.similar.map((s) => (
              <ItemCard key={s.id} item={s} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
