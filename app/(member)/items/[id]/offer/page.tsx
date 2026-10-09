import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { OfferForm } from '@/components/member/offer-form'
import { Notice } from '@/components/ui/feedback'
import { getProfile } from '@/lib/auth/guards'
import { getFormOptions } from '@/lib/queries/meta'
import { getItem, getMyListings, photoUrl } from '@/lib/queries/catalog'

export const metadata: Metadata = {
  title: 'Make an offer — CaintaTrade',
}

type Ctx = { params: Promise<{ id: string }> }

/** docs/02 C15 · make an offer: the wanted item, one of your own available
 *  listings, an optional message and a proposed meetup. */
export default async function OfferPage({ params }: Ctx) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const profile = await getProfile(userId)
  if (!profile) redirect('/onboarding')

  const wanted = await getItem(id)
  if (!wanted) notFound()

  const isOwner = wanted.owner?.id === userId

  if (isOwner || wanted.statusKey !== 'available') {
    return (
      <div className="wrap py-10 max-w-2xl">
        <Notice tone={isOwner ? 'brass' : 'default'} icon={isOwner ? 'info' : 'lock'}>
          <div className="font-medium">
            {isOwner ? 'This is your own listing' : 'Offers are closed on this listing'}
          </div>
          <p className="t-small mt-1">
            {isOwner
              ? 'You cannot offer an item for itself. Edit it instead, or pick something else in browse.'
              : 'This listing already has an accepted offer or is no longer available.'}
          </p>
        </Notice>
        <div className="flex gap-3 mt-5">
          <Link
            href="/browse"
            className="font-mono text-[13px] underline underline-offset-[3px] hover:text-accent"
          >
            Back to browse
          </Link>
        </div>
      </div>
    )
  }

  const [mine, options] = await Promise.all([getMyListings(userId), getFormOptions()])
  const available = mine.rows.filter((r) => r.statusKey === 'available')

  return (
    <div className="wrap py-7 md:py-11 max-w-4xl">
      <div className="mb-6">
        <div className="t-meta mb-1.5">Make an offer</div>
        <h1 className="t-h1">Trade something of yours for this</h1>
      </div>

      <div className="border border-line rounded-md bg-surface p-5 flex items-center gap-4 mb-7">
        <div className="w-20 h-20 rounded-sm overflow-hidden bg-paper2 border border-line flex-none">
          {wanted.photos[0] && photoUrl(wanted.photos[0]) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl(wanted.photos[0]) as string}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="t-meta">You want</div>
          <Link href={`/items/${wanted.id}`} className="text-[17px] font-medium hover:text-accent">
            {wanted.title}
          </Link>
          <div className="t-meta mt-0.5">
            {wanted.condition} · {wanted.category} · {wanted.barangay}
          </div>
        </div>
      </div>

      {available.length === 0 ? (
        <Notice tone="brass" icon="info">
          <div className="font-medium">You need something to offer first</div>
          <p className="t-small mt-1">
            Offers are item for item — post one of your own listings and it will show up here.{' '}
            <Link href="/items/new" className="underline underline-offset-[3px]">
              Post an item
            </Link>
            .
          </p>
        </Notice>
      ) : (
        <OfferForm
          wantedId={wanted.id}
          wantedTitle={wanted.title}
          myItems={available.map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            photo: r.photo
              ? r.photo.startsWith('http')
                ? r.photo
                : photoUrl(r.photo)
              : null,
          }))}
          spots={options.spots}
        />
      )}
    </div>
  )
}
