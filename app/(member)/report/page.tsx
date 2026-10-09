import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { ReportFlow } from '@/components/member/report-flow'

export const metadata: Metadata = {
  title: 'Report — CaintaTrade',
}

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** docs/02 C23 · report flow: what → which → reason → details → what happens
 *  next. Arrives prefilled from listing/member/message links. */
export default async function ReportPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const sp = await searchParams
  const typeParam = one(sp.type)
  const type =
    typeParam === 'listing' || typeParam === 'member' || typeParam === 'message'
      ? typeParam
      : 'listing'
  const target = one(sp.id) ?? ''

  return (
    <div className="wrap py-7 md:py-11 max-w-2xl">
      <div className="mb-6">
        <div className="t-meta mb-1.5">Report</div>
        <h1 className="t-h1">Tell us what went wrong</h1>
        <p className="t-small text-ink70 mt-2">
          Reports go to a moderator, not to the other member. Every decision is logged and you get
          the outcome by email.
        </p>
      </div>

      <ReportFlow initialType={type} initialTarget={target} />
    </div>
  )
}
