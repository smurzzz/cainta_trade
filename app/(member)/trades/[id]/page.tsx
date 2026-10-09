import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getTrade } from '@/actions/trading'
import { TradeScreen, type TradeData } from '@/components/member/trade-screen'
import { getFormOptions } from '@/lib/queries/meta'

export const metadata: Metadata = {
  title: 'Trade — CaintaTrade',
}

type Ctx = { params: Promise<{ id: string }> }

/** docs/02 C17 · trade progress: 5-step tracker, meetup agreement, mutual
 *  confirmation, dispute and rating. Party-only (enforced in getTrade). */
export default async function TradePage({ params }: Ctx) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const res = await getTrade(id)
  if (!res.ok || !res.data) notFound()

  const trade = res.data as unknown as TradeData
  const options = await getFormOptions()

  return (
    <div className="wrap py-7 md:py-11 max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="t-meta mb-1.5">Trade {trade.code}</div>
          <h1 className="t-h1">Swap in progress</h1>
        </div>
        <span className="font-mono text-[12.5px] uppercase border border-line rounded-sm px-2.5 py-1">
          {trade.status.replace(/_/g, ' ')}
        </span>
      </div>

      <TradeScreen trade={trade} me={userId} spots={options.spots} />
    </div>
  )
}
