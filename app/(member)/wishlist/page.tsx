import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { listWishlist, type WishlistRow } from '@/actions/wishlist'
import { WishlistScreen } from '@/components/member/wishlist-screen'

export const metadata: Metadata = {
  title: 'Wishlist — CaintaTrade',
}

/** docs/02 C20 · saved items with state notes. The owner is never told. */
export default async function WishlistPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const res = await listWishlist()
  const rows = (res.ok && res.data ? res.data.rows : []) as WishlistRow[]

  return (
    <div className="wrap py-7 md:py-11">
      <div className="mb-6">
        <div className="t-meta mb-1.5">Wishlist</div>
        <h1 className="t-h1">Saved for later</h1>
        <p className="t-small text-ink70 mt-2">
          Up to 20 items. Nothing you save is ever shown to the listing&apos;s owner.
        </p>
      </div>

      <WishlistScreen rows={rows} error={res.ok ? null : res.error} />
    </div>
  )
}
