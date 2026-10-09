import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { ConversationsList, type ConversationRow } from '@/components/member/conversations-list'
import { listConversations } from '@/actions/messaging'
import { Empty } from '@/components/ui/feedback'

export const metadata: Metadata = {
  title: 'Messages — CaintaTrade',
}

/** docs/02 C18 · conversation list. Realtime lands with Supabase third-party
 *  auth (docs/05 blockers); until then the thread polls. */
export default async function MessagesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const res = await listConversations()
  const rows = (res.ok && res.data ? res.data.rows : []) as unknown as ConversationRow[]
  const unread = res.ok && res.data ? res.data.unread : 0

  return (
    <div className="wrap py-7 md:py-11 max-w-3xl">
      <div className="mb-6">
        <div className="t-meta mb-1.5">Messages</div>
        <h1 className="t-h1">Your conversations</h1>
        <p className="t-small text-ink70 mt-2">
          Every thread belongs to an offer — keep chat inside CaintaTrade so there is a record.
        </p>
      </div>

      {rows.length === 0 ? (
        <Empty icon="chat" title="No conversations yet">
          Conversations start when you send an offer or someone sends you one.{' '}
          <a href="/browse" className="underline underline-offset-[3px]">
            Browse items
          </a>{' '}
          to get started.
        </Empty>
      ) : (
        <ConversationsList rows={rows} unread={unread} me={userId} />
      )}
    </div>
  )
}
