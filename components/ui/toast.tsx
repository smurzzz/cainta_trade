'use client'

import { useEffect, useState } from 'react'
import { Icon } from './icon'

export type ToastKind = 'ink' | 'olive' | 'danger'

/** Fixed bottom-right toast (mockup .toast-stack). Manage state with useToast(). */
export function Toast({ message, kind = 'ink' }: { message: string; kind?: ToastKind }) {
  const bg =
    kind === 'olive'
      ? 'bg-olive text-white'
      : kind === 'danger'
        ? 'bg-danger text-white'
        : 'bg-ink text-paper'
  return (
    <div className="fixed right-6 bottom-6 z-[200] max-md:left-6 max-md:right-6" role="status">
      <div className={`flex gap-3 items-start rounded-sm px-4 py-3.5 min-w-[300px] shadow-pop text-[15px] ${bg}`}>
        <Icon
          name={kind === 'ink' ? 'bell' : 'check'}
          size={17}
          className="mt-0.5 flex-none"
        />
        <span>{message}</span>
      </div>
    </div>
  )
}

/** Toast state with auto-dismiss (mockup data-toast behaviour). */
export function useToast(autoHideMs = 4000) {
  const [toast, setToast] = useState<{ message: string; kind?: ToastKind } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), autoHideMs)
    return () => clearTimeout(t)
  }, [toast, autoHideMs])

  const show = (message: string, kind?: ToastKind) => setToast({ message, kind })

  return { toast, show, dismiss: () => setToast(null) }
}
