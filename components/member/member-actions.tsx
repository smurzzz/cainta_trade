'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Toast, useToast } from '@/components/ui/toast'
import { blockMember, unblockMember } from '@/actions/moderation'

/** docs/02 C21 · member rail actions: report, block/unblock (party rules live
 *  in the server actions). Follow is Tier 2 (docs/05 §G). */
export function MemberActions({
  memberId,
  blocked,
}: {
  memberId: string
  blocked: boolean
}) {
  const router = useRouter()
  const { toast, show } = useToast()
  const [isBlocked, setIsBlocked] = useState(blocked)
  const [pending, startTransition] = useTransition()

  const toggleBlock = () => {
    const next = !isBlocked
    setIsBlocked(next)
    startTransition(async () => {
      const res = next ? await blockMember(memberId) : await unblockMember(memberId)
      if (!res.ok) {
        setIsBlocked(!next)
        show(res.error, 'danger')
      } else {
        show(next ? 'Member blocked — their messages will not reach you' : 'Member unblocked')
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      <Link
        href="/messages"
        className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 rounded-sm border border-transparent font-mono text-[13px] bg-ink text-paper hover:bg-accent transition-colors"
      >
        Message
      </Link>
      <Button variant="secondary" disabled={pending} onClick={toggleBlock}>
        {isBlocked ? 'Unblock' : 'Block'}
      </Button>
      <Link
        href={`/report?type=member&id=${memberId}`}
        className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 rounded-sm font-mono text-[13px] text-danger border border-[#e2b9b2] hover:bg-danger hover:text-white transition-colors"
      >
        Report
      </Link>
      {toast ? <Toast message={toast.message} kind={toast.kind} /> : null}
    </div>
  )
}
