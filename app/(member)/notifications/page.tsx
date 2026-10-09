import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { listNotifications } from '@/actions/messaging'
import { NotificationsScreen, type NotificationRow } from '@/components/member/notifications'

export const metadata: Metadata = {
  title: 'Notifications — CaintaTrade',
}

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** docs/02 C19 · notifications: tabs, newest first, mark-read actions. */
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Params>
}) {
  const sp = await searchParams
  const typeParam = one(sp.type)
  const type =
    typeParam === 'offers' || typeParam === 'messages' || typeParam === 'reminders' || typeParam === 'admin'
      ? typeParam
      : undefined
  const page = Number(one(sp.page)) || 1

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const res = await listNotifications(undefined, page)
  const rows = (res.ok && res.data ? res.data.rows : []) as unknown as NotificationRow[]
  const unread = res.ok && res.data ? res.data.unread : 0

  return (
    <div className="wrap py-7 md:py-11 max-w-3xl">
      <div className="mb-6">
        <div className="t-meta mb-1.5">Notifications</div>
        <h1 className="t-h1">What happened while you were away</h1>
      </div>

      <NotificationsScreen rows={rows} unread={unread} filter={type ?? 'all'} page={page} />
    </div>
  )
}
