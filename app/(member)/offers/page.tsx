import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { OffersScreen, type OfferRow } from '@/components/member/offers-screen'
import { listOffers } from '@/actions/trading'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata: Metadata = {
  title: 'Offers — CaintaTrade',
}

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** docs/02 C16 · offers inbox: received / sent / closed with the trade each
 *  accepted offer created (party only — the action enforces it). */
export default async function OffersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams
  const viewParam = one(sp.view)
  const view = viewParam === 'sent' || viewParam === 'closed' ? viewParam : 'received'
  const page = Number(one(sp.page)) || 1

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const res = await listOffers(view, page)
  const rows = (res.ok && res.data ? res.data.rows : []) as unknown as OfferRow[]
  const unread = res.ok && res.data ? res.data.unread : 0
  const total = res.ok && res.data ? res.data.total : 0

  // accepted offers point at their trade page
  const tradeByOffer: Record<string, string> = {}
  const offerIds = rows.filter((r) => r.status === 'accepted').map((r) => r.id)
  if (offerIds.length) {
    const { data: trades } = await supabaseAdmin()
      .from('trades')
      .select('id, offer_id')
      .in('offer_id', offerIds)
    for (const t of trades ?? []) tradeByOffer[t.offer_id] = t.id
  }

  return (
    <div className="wrap py-7 md:py-11">
      <div className="mb-6">
        <div className="t-meta mb-1.5">Offers</div>
        <h1 className="t-h1">Everything on the table</h1>
        <p className="t-small text-ink70 mt-2">
          Pending offers expire after 3 days. Once accepted, the trade opens its own page.
        </p>
      </div>

      <OffersScreen
        view={view}
        rows={rows}
        total={total}
        page={page}
        unread={unread}
        tradeByOffer={tradeByOffer}
        error={res.ok ? null : res.error}
        me={userId}
      />
    </div>
  )
}
