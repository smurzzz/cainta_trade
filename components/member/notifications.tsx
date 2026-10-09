'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useTransition } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/feedback'
import { Icon } from '@/components/ui/icon'
import { TabBar } from '@/components/ui/tabs'
import { Toast, useToast } from '@/components/ui/toast'
import { markAllRead, markNotificationRead } from '@/actions/messaging'
import { usePushRealtimeAuth, useSupabaseAuthedClient } from '@/lib/supabase/authed'
import { timeAgo } from '@/lib/time'

export type NotificationRow = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

type Filter = 'all' | 'offers' | 'messages' | 'reminders' | 'admin'

function groupOf(type: string): Filter | 'other' {
  if (
    ['new_offer', 'offer_accepted', 'offer_rejected', 'offer_cancelled', 'trade_completed', 'trade_disputed'].includes(type)
  )
    return 'offers'
  if (type === 'message_received') return 'messages'
  if (type.includes('expiring') || type.includes('reminder') || type === 'meetup_updated')
    return 'reminders'
  if (
    ['admin_notice', 'account_approved', 'account_rejected', 'account_suspended', 'report_outcome', 'listing_removed'].includes(type)
  )
    return 'admin'
  return 'other'
}

function dayBucket(iso: string): 'Today' | 'Yesterday' | 'Earlier' {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return 'Today'
  const y = new Date(today.getTime() - 86_400_000)
  if (sameDay(d, y)) return 'Yesterday'
  return 'Earlier'
}

/** docs/02 C19 · notification centre: type tabs, Today/Yesterday/Earlier
 *  groups, mark-all-read and quick links. */
export function NotificationsScreen({
  rows,
  unread,
  filter,
  page,
}: {
  rows: NotificationRow[]
  unread: number
  filter: Filter
  page: number
}) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [pending, startTransition] = useTransition()

  // live notifications: INSERT on `notifications` for this user (docs/07
  // realtime channels) — the nav badge follows via router.refresh() too.
  const supabase = useSupabaseAuthedClient()
  const pushAuth = usePushRealtimeAuth(supabase)
  const userId = useUser().user?.id
  useEffect(() => {
    if (!userId || !supabase) return // client appears once Clerk has loaded
    let disposed = false
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => router.refresh(),
      )
      .subscribe((status) => {
        if (!disposed && status === 'SUBSCRIBED') void pushAuth() // see usePushRealtimeAuth
      })
    return () => {
      disposed = true
      void supabase.removeChannel(channel)
    }
  }, [supabase, userId, router, pushAuth])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, offers: 0, messages: 0, reminders: 0, admin: 0 }
    for (const r of rows) {
      const g = groupOf(r.type)
      if (g !== 'other') c[g] += 1
    }
    return c
  }, [rows])

  const list = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => groupOf(r.type) === filter)),
    [rows, filter],
  )

  const buckets = useMemo(() => {
    const out: Record<'Today' | 'Yesterday' | 'Earlier', NotificationRow[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    }
    for (const r of list) out[dayBucket(r.created_at)].push(r)
    return out
  }, [list])

  const open = (n: NotificationRow) => {
    if (!n.read_at) startTransition(async () => void (await markNotificationRead(n.id)))
    if (n.link) router.push(n.link)
  }

  const markAll = () => {
    startTransition(async () => {
      const res = await markAllRead()
      if (!res.ok) show(res.error, 'danger')
      else {
        show('All caught up')
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <TabBar
          className="flex-1"
          active={filter}
          onSelect={(id) => router.push(id === 'all' ? '/notifications' : `/notifications?type=${id}`)}
          tabs={[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'offers', label: 'Offers', count: counts.offers },
            { id: 'messages', label: 'Messages', count: counts.messages },
            { id: 'reminders', label: 'Reminders', count: counts.reminders },
            { id: 'admin', label: 'From admin', count: counts.admin },
          ]}
        />
        <Button size="sm" variant="secondary" disabled={pending || unread === 0} onClick={markAll}>
          Mark all read
        </Button>
      </div>

      {list.length === 0 ? (
        <Empty icon="bell" title="Nothing here">
          {filter === 'all'
            ? 'Offers, messages, reminders and admin notices will appear here.'
            : 'No notifications in this tab right now.'}
        </Empty>
      ) : (
        <div className="mt-5 space-y-7">
          {(['Today', 'Yesterday', 'Earlier'] as const).map((bucket) =>
            buckets[bucket].length ? (
              <section key={bucket}>
                <div className="t-meta mb-3">{bucket}</div>
                <ul className="border border-line rounded-md bg-surface divide-y divide-line overflow-hidden">
                  {buckets[bucket].map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => open(n)}
                        className={`w-full text-left flex gap-3.5 p-4 hover:bg-paper2 transition-colors ${
                          n.read_at ? '' : 'bg-accenttint/40'
                        }`}
                      >
                        <span
                          className={`mt-1.5 w-2 h-2 rounded-full flex-none ${
                            n.read_at ? 'bg-transparent border border-linestrong' : 'bg-accent'
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] text-ink">{n.title}</span>
                          {n.body ? (
                            <span className="block t-small text-ink70 mt-0.5">{n.body}</span>
                          ) : null}
                          <span className="block t-meta mt-1">{timeAgo(n.created_at)}</span>
                        </span>
                        {n.link ? (
                          <Icon name="chevR" size={16} className="self-center text-ink45 flex-none" />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      )}

      {page > 1 ? (
        <div className="mt-6 text-center">
          <Link
            href={filter === 'all' ? '/notifications' : `/notifications?type=${filter}&page=${page - 1}`}
            className="t-meta underline underline-offset-[3px] hover:text-accent"
          >
            Newer notifications
          </Link>
        </div>
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </>
  )
}
