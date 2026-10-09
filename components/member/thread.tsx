'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Toast, useToast } from '@/components/ui/toast'
import { markRead, sendMessage } from '@/actions/messaging'
import { usePushRealtimeAuth, useSupabaseAuthedClient } from '@/lib/supabase/authed'
import { timeAgo } from '@/lib/time'

export type MessageRow = {
  id: string
  sender_id: string
  body: string | null
  photo_path: string | null
  photo_url?: string | null
  read_at: string | null
  created_at: string
}

/** docs/02 C18 · thread: offer context, bubbles, photo attach, safety banner.
 *  Live updates via Supabase Realtime on `messages` (Clerk `supabase` JWT);
 *  a 12 s poll is the fallback if the websocket cannot connect. */
export function Thread({
  offerId,
  me,
  status,
  itemTitle,
  other,
  initial,
}: {
  offerId: string
  me: string
  status: string
  itemTitle: string
  other: { id: string; name: string; avatar: string | null }
  initial: MessageRow[]
}) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [body, setBody] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // mark the thread read on open
  useEffect(() => {
    void markRead(offerId)
  }, [offerId])

  // live messages: INSERT on `messages` for this offer (docs/02 C18), marked
  // read before refreshing so the sender's receipt updates live too. If the
  // socket errors or times out, fall back to the old 12 s poll.
  const supabase = useSupabaseAuthedClient()
  const pushAuth = usePushRealtimeAuth(supabase)
  useEffect(() => {
    if (!supabase) return // client appears once Clerk has loaded
    console.log('[rt-sub] subscribe', Date.now()) // TEMP-RT-DEBUG
    let disposed = false
    let poll: ReturnType<typeof setInterval> | null = null
    const startPoll = () => {
      if (!poll && !disposed) poll = setInterval(() => router.refresh(), 12_000)
    }
    const stopPoll = () => {
      if (poll) clearInterval(poll)
      poll = null
    }
    const channel = supabase
      .channel(`thread:${offerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `offer_id=eq.${offerId}` },
        () => {
          console.log('[thread-evt]', Date.now()) // TEMP-RT-DEBUG
          // refresh first so delivery never waits on the read-receipt action;
          // a second refresh picks up the receipt for the sender's bubble
          router.refresh()
          void markRead(offerId).finally(() => {
            if (!disposed) router.refresh()
          })
        },
      )
      .subscribe((status) => {
        if (disposed) return
        if (status === 'SUBSCRIBED') {
          // re-auth the joined channel (see usePushRealtimeAuth); keep the
          // poll fallback running until the push succeeds
          void pushAuth().then((ok) => {
            if (disposed) return
            if (ok) stopPoll()
            else startPoll()
          })
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED')
          startPoll()
      })
    return () => {
      console.log('[rt-sub] cleanup', Date.now()) // TEMP-RT-DEBUG
      disposed = true
      stopPoll()
      void supabase.removeChannel(channel)
    }
  }, [supabase, offerId, router, pushAuth])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [initial.length])

  const send = () => {
    const text = body.trim()
    if (!text && !photo) return
    const file = photo
    startTransition(async () => {
      const res = await sendMessage({ offerId, body: text || undefined }, file)
      if (!res.ok) show(res.error, 'danger')
      else {
        setBody('')
        setPhoto(null)
        if (fileRef.current) fileRef.current.value = ''
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col">
      {/* header */}
      <div className="flex items-center gap-3.5 pb-5 border-b border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={other.avatar ?? '/assets/avatar-1.svg'}
          alt=""
          className="w-12 h-12 rounded-full object-cover bg-paper2 border border-line flex-none"
        />
        <div className="min-w-0 flex-1">
          <Link href={`/members/${other.id}`} className="text-[16px] font-medium hover:text-accent">
            {other.name}
          </Link>
          <div className="t-meta truncate">
            about{' '}
            <span className="text-ink">{itemTitle}</span> · {status}
          </div>
        </div>
        <span className="font-mono text-[11px] uppercase border border-line rounded-sm px-2 py-0.5 flex-none">
          {status}
        </span>
      </div>

      {/* safety banner */}
      <div className="flex items-start gap-2.5 bg-brasstint border border-[#e3d3ac] border-l-[3px] border-l-brass rounded-sm px-3.5 py-2.5 mt-4 text-[13.5px] text-[#5c4512]">
        <Icon name="shield" size={16} className="flex-none mt-0.5" />
        <span>
          Keep chat in CaintaTrade, meet in public, and never send money — CaintaTrade staff will
          never ask for payment.
        </span>
      </div>

      {/* messages */}
      <div className="mt-5 space-y-3 max-h-[52vh] overflow-y-auto pr-1" aria-live="polite">
        {initial.length === 0 ? (
          <p className="t-small text-ink45 text-center py-8">
            No messages yet — open with what you are proposing to swap.
          </p>
        ) : null}
        {initial.map((m) => {
          const mine = m.sender_id === me
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-md px-3.5 py-2.5 border ${
                  mine ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink border-line'
                }`}
              >
                {m.body ? (
                  <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">
                    {m.body}
                  </p>
                ) : null}
                {m.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photo_url}
                    alt="Shared attachment"
                    className="mt-2 rounded-sm max-h-56 object-cover"
                  />
                ) : null}
                <div
                  className={`font-mono text-[10.5px] mt-1.5 ${mine ? 'text-paper/60' : 'text-ink45'}`}
                >
                  {timeAgo(m.created_at)}
                  {mine && m.read_at ? ' · read' : ''}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <div className="mt-5 border border-line rounded-md bg-surface p-3">
        {photo ? (
          <div className="flex items-center gap-2.5 pb-2.5 mb-1 border-b border-line">
            <Icon name="camera" size={15} className="text-accent" />
            <span className="t-small truncate flex-1">{photo.name}</span>
            <button
              type="button"
              className="t-meta hover:text-danger"
              onClick={() => {
                setPhoto(null)
                if (fileRef.current) fileRef.current.value = ''
              }}
            >
              Remove
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-2.5">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={2}
            maxLength={1000}
            placeholder="Write a message… (Enter to send)"
            aria-label="Message"
            className="flex-1 bg-transparent resize-none text-[15px] leading-relaxed py-1.5 focus:outline-none placeholder:text-ink45"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            aria-label="Attach a photo"
            onClick={() => fileRef.current?.click()}
            className="w-10 h-10 rounded-sm border border-line inline-flex items-center justify-center text-ink70 hover:text-ink hover:border-ink45"
          >
            <Icon name="camera" size={17} />
          </button>
          <Button size="sm" disabled={pending || (!body.trim() && !photo)} onClick={send}>
            Send
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <ButtonLink href="/messages" variant="ghost" size="sm">
          All conversations
        </ButtonLink>
        <ButtonLink href="/offers" variant="ghost" size="sm">
          Offers
        </ButtonLink>
      </div>

      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </div>
  )
}
