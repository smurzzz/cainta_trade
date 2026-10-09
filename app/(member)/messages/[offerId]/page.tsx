import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getMessages } from '@/actions/messaging'
import { Thread, type MessageRow } from '@/components/member/thread'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata: Metadata = {
  title: 'Conversation — CaintaTrade',
}

type Ctx = { params: Promise<{ offerId: string }> }

/** docs/02 C18 · one thread with its offer context. Party-only: everyone else
 *  gets 404 from both the page and the actions. */
export default async function ThreadPage({ params }: Ctx) {
  const { offerId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const db = supabaseAdmin()
  const { data: offer } = await db
    .from('offers')
    .select('id, status, from_user_id, to_user_id, wanted_item_id')
    .eq('id', offerId)
    .maybeSingle()
  if (!offer || (offer.from_user_id !== userId && offer.to_user_id !== userId)) notFound()

  const otherId = offer.from_user_id === userId ? offer.to_user_id : offer.from_user_id
  const [{ data: item }, { data: other }, messages] = await Promise.all([
    db.from('items').select('id, title').eq('id', offer.wanted_item_id).maybeSingle(),
    db.from('public_profiles').select('id, full_name, avatar_url').eq('id', otherId).maybeSingle(),
    getMessages(offerId),
  ])
  const rows = (messages.ok && messages.data ? messages.data.rows : []) as unknown as MessageRow[]

  return (
    <div className="wrap py-7 md:py-11 max-w-3xl">
      <Thread
        offerId={offerId}
        me={userId}
        status={offer.status}
        itemTitle={item?.title ?? 'a listing'}
        other={{
          id: otherId,
          name: other?.full_name ?? 'A neighbour',
          avatar: other?.avatar_url ?? null,
        }}
        initial={rows}
      />
    </div>
  )
}
