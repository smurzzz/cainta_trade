'use client'

import { useEffect } from 'react'

/** Fires the per-session view-count beacon (docs/07 · incrementViews).
 *  The server counts each item once per browser per 7 days; the displayed
 *  number refreshes on the next page load. */
export function ViewCounter({ itemId }: { itemId: string }) {
  useEffect(() => {
    void fetch(`/api/items/${itemId}/view`, { method: 'POST' }).catch(() => undefined)
  }, [itemId])

  return null
}
