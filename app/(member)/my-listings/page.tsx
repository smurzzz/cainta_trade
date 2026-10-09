import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { MyListingsScreen } from '@/components/member/my-listings'
import { getMyListings } from '@/lib/queries/catalog'

export const metadata: Metadata = {
  title: 'My listings — CaintaTrade',
}

/** docs/02 C13 · my listings: status counts plus the interactive screen. */
export default async function MyListingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const result = await getMyListings(userId)

  return (
    <div className="wrap py-7 md:py-11">
      <div className="mb-6">
        <div className="t-meta mb-1.5">My listings</div>
        <h1 className="t-h1">What you have on the table</h1>
        <p className="t-small text-ink70 mt-2">
          {result.total} listing{result.total === 1 ? '' : 's'} ·{' '}
          {result.counts.available ?? 0} available · {result.counts.pending ?? 0} pending an
          accepted offer
        </p>
      </div>

      <MyListingsScreen initial={result} />
    </div>
  )
}
