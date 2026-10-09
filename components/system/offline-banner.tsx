'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/icon'

/** docs/02 E32 · offline strip — mirrors the mockup's offline notice so members
 *  keep a way back to already-loaded pages. */
export function OfflineBanner() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (online) return null

  return (
    <div
      role="status"
      className="fixed bottom-24 md:bottom-5 inset-x-4 z-[60] mx-auto max-w-[560px] flex items-center gap-3 border border-[#e3d3ac] border-l-[3px] border-l-brass bg-brasstint rounded-sm px-4 py-3 shadow-[0_10px_30px_rgba(28,27,25,.14)]"
    >
      <Icon name="alert" size={18} className="flex-none text-brass" />
      <div>
        <div className="text-[14px] font-medium text-ink">You are offline</div>
        <div className="t-meta">
          Pages you already opened stay readable. Reconnect to browse or trade.
        </div>
      </div>
    </div>
  )
}
