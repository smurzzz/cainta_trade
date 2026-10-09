import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getDashboard } from '@/actions/dashboard'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardHead } from '@/components/ui/card'
import { Empty, Notice } from '@/components/ui/feedback'
import { Icon } from '@/components/ui/icon'
import { getProfile } from '@/lib/auth/guards'
import { timeAgo } from '@/lib/queries/catalog'

export const metadata: Metadata = {
  title: 'Home — CaintaTrade',
}

function Stat({
  label,
  value,
  href,
  hint,
}: {
  label: string
  value: number
  href: string
  hint?: string
}) {
  return (
    <Link
      href={href}
      className="border border-line rounded-md bg-surface p-4 hover:border-ink45 transition-colors"
    >
      <div className="t-meta">{label}</div>
      <div className="font-display text-3xl mt-1.5">{value}</div>
      {hint ? <div className="t-small text-ink45 mt-1">{hint}</div> : null}
    </Link>
  )
}

/** docs/02 C10 · member dashboard. Pending/suspended residents land on
 *  account-status instead (docs/09 T-A4); the layout guard already sent
 *  never-onboarded visitors to /onboarding. */
export default async function HomePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const profile = await getProfile(userId)
  if (!profile) redirect('/onboarding')
  if (profile.status !== 'verified') redirect('/account-status')

  const res = await getDashboard()
  const data = res.ok && res.data ? res.data : null
  const failure = data
    ? null
    : res.ok
      ? 'The server returned no data. Reference: CT-SYS-500'
      : `${res.error} Reference: ${res.code}`
  const firstName = (profile.full_name ?? 'neighbour').split(' ')[0]

  return (
    <div className="wrap py-7 md:py-11">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="t-h1">Hello, {firstName}</h1>
          <p className="t-small text-ink70 mt-1">
            Your trades, listings and offers in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <ButtonLink href="/items/new">Post an item</ButtonLink>
          <ButtonLink href="/browse" variant="secondary">
            Browse
          </ButtonLink>
        </div>
      </div>

      {!data ? (
        <Notice tone="danger" icon="alert" className="mb-6">
          <div className="font-medium">We could not load your dashboard</div>
          <p className="t-small mt-1">
            {failure}
          </p>
        </Notice>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
            <Stat label="Active listings" value={data.counts.active} href="/my-listings" />
            <Stat
              label="Offers to answer"
              value={data.counts.offersToAnswer}
              href="/offers?view=received"
              hint={data.counts.offersToAnswer ? 'Waiting on you' : 'All caught up'}
            />
            <Stat label="Sent offers" value={data.counts.offersSent} href="/offers?view=sent" />
            <Stat
              label="Completed trades"
              value={data.counts.tradesCompleted}
              href="/offers?view=closed"
            />
            <Stat label="Drafts" value={data.counts.drafts} href="/my-listings" />
            <Stat
              label="Pending listings"
              value={data.counts.listingsPending}
              href="/my-listings"
              hint="Offer accepted"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Card>
              <CardHead>
                <span>Offers waiting for you</span>
                <Link href="/offers?view=received" className="t-meta hover:text-accent">
                  See all
                </Link>
              </CardHead>
              <CardBody>
                {data.pendingOffers.length === 0 ? (
                  <Empty icon="swap" title="No offers right now">
                    When a neighbour offers on one of your listings it shows up here first.{' '}
                    <Link href="/items/new" className="underline underline-offset-[3px]">
                      Post an item
                    </Link>{" "}
                    to give them something to offer on.
                  </Empty>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.pendingOffers.map((o) => (
                      <li
                        key={o.id}
                        className="py-3.5 flex flex-wrap items-center gap-3 first:pt-0 last:pb-0"
                      >
                        <span className="w-9 h-9 rounded-full bg-paper2 border border-line inline-flex items-center justify-center flex-none">
                          <Icon name="swap" size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] text-ink truncate">
                            {o.fromName} offered on <span className="font-medium">{o.wantedTitle}
                            </span>
                          </div>
                          <div className="t-meta">{timeAgo(o.createdAt)}</div>
                        </div>
                        <ButtonLink href="/offers?view=received" size="sm" variant="secondary">
                          Review
                        </ButtonLink>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHead>
                  <span>Recent activity</span>
                  <Link href="/notifications" className="t-meta hover:text-accent">
                    All
                  </Link>
                </CardHead>
                <CardBody>
                  {data.activity.length === 0 ? (
                    <p className="t-small text-ink45 py-2">
                      Nothing yet — offers, messages and approvals land here.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {data.activity.map((n) => (
                        <li key={n.id} className="flex gap-2.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-2 flex-none ${
                              n.read ? 'bg-linestrong' : 'bg-accent'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="text-[14.5px] text-ink leading-snug">{n.title}</div>
                            <div className="t-meta">{timeAgo(n.createdAt)}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>

              {data.expiring.length > 0 ? (
                <Card>
                  <CardHead>
                    <span>Listing health</span>
                  </CardHead>
                  <CardBody>
                    <p className="t-small text-ink70 mb-3">
                      These listings expire within a week — renew to keep them visible.
                    </p>
                    <ul className="space-y-2">
                      {data.expiring.map((i) => (
                        <li key={i.id} className="flex items-center justify-between gap-3">
                          <span className="text-[14.5px] truncate">{i.title}</span>
                          <Link
                            href={`/items/${i.id}/edit`}
                            className="t-meta hover:text-accent flex-none"
                          >
                            Renew
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              ) : null}
            </div>
          </div>

          <Notice tone="brass" icon="shield" className="mt-8">
            <div className="font-medium">Meet in the seven meetup spots, in daylight</div>
            <p className="t-small mt-1">
              CaintaTrade never handles cash. Agree on the swap, bring a friend if you like, and
              confirm the meetup on the trade page so both sides are covered.
            </p>
          </Notice>
        </>
      )}
    </div>
  )
}
