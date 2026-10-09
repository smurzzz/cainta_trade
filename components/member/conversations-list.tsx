'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/field'
import { Segmented } from '@/components/ui/tabs'
import { timeAgo } from '@/lib/time'

export type ConversationRow = {
  offer_id: string
  status: string
  item_title: string
  other: { id: string; full_name: string | null; avatar_url: string | null } | null
  last_message: {
    body: string | null
    photo_path: string | null
    sender_id: string
    created_at: string
  } | null
  unread: number
}

/** docs/02 C18 · conversation list with search and All / Unread / Active
 *  filters. Mobile shows the same list (the thread is its own route). */
export function ConversationsList({
  rows,
  unread,
  me,
}: {
  rows: ConversationRow[]
  unread: number
  me: string
}) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'active'>('all')

  const list = useMemo(() => {
    let out = rows
    if (filter === 'unread') out = out.filter((r) => r.unread > 0)
    if (filter === 'active') out = out.filter((r) => r.status === 'pending' || r.status === 'accepted')
    if (q.trim()) {
      const n = q.trim().toLowerCase()
      out = out.filter(
        (r) =>
          r.item_title.toLowerCase().includes(n) ||
          (r.other?.full_name ?? '').toLowerCase().includes(n),
      )
    }
    return out
  }, [rows, filter, q])

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Input
          type="search"
          aria-label="Search conversations"
          placeholder="Search by name or listing"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Segmented
          options={[
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread${unread ? ` (${unread})` : ''}` },
            { id: 'active', label: 'Active trades' },
          ]}
          active={filter}
          onSelect={(id) => setFilter(id as 'all' | 'unread' | 'active')}
        />
      </div>

      <ul className="border border-line rounded-md bg-surface divide-y divide-line overflow-hidden">
        {list.map((r) => {
          const last = r.last_message
          const mine = last?.sender_id === me
          const excerpt = last
            ? `${mine ? 'You: ' : ''}${last.body ?? (last.photo_path ? 'Photo' : '')}`
            : 'No messages yet — say hello'
          return (
            <li key={r.offer_id}>
              <Link
                href={`/messages/${r.offer_id}`}
                className="flex gap-3.5 p-4 hover:bg-paper2 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.other?.avatar_url ?? '/assets/avatar-1.svg'}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover bg-paper2 border border-line flex-none"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[15px] text-ink font-medium truncate">
                      {r.other?.full_name ?? 'A neighbour'}
                    </span>
                    <span className="font-mono text-[10.5px] uppercase border border-line rounded-sm px-1.5 py-px text-ink45 flex-none">
                      {r.status}
                    </span>
                    {last ? (
                      <span className="t-meta ml-auto flex-none">{timeAgo(last.created_at)}</span>
                    ) : null}
                  </div>
                  <div className="t-small text-ink70 truncate mt-0.5">{r.item_title}</div>
                  <div
                    className={`t-small truncate mt-0.5 ${r.unread ? 'text-ink font-medium' : 'text-ink45'}`}
                  >
                    {excerpt}
                  </div>
                </div>
                {r.unread ? (
                  <span className="self-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent text-white font-mono text-[11px] inline-flex items-center justify-center flex-none">
                    {r.unread}
                  </span>
                ) : (
                  <Icon name="chevR" size={16} className="self-center text-ink45 flex-none" />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
