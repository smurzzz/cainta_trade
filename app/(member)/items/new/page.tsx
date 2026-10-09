import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { ItemForm } from '@/components/member/item-form'
import { getProfile } from '@/lib/auth/guards'
import { getFormOptions } from '@/lib/queries/meta'

export const metadata: Metadata = {
  title: 'Post an item — CaintaTrade',
}

/** docs/02 C11 · post an item. Verified residents only — pending residents are
 *  held on account-status by the action guards with a clear message. */
export default async function NewItemPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const profile = await getProfile(userId)
  if (!profile) redirect('/onboarding')

  const options = await getFormOptions()

  return (
    <div className="wrap py-7 md:py-11 max-w-5xl">
      <div className="mb-6">
        <div className="t-meta mb-1.5">Post an item</div>
        <h1 className="t-h1">What are you offering?</h1>
        <p className="t-small text-ink70 mt-2 max-w-2xl">
          Item for item, neighbour to neighbour — no cash, no delivery, no fees. Your listing runs
          for 30 days and you can renew it any time.
        </p>
      </div>

      <ItemForm mode="new" options={options} defaultBarangayId={profile.barangay_id} />
    </div>
  )
}
