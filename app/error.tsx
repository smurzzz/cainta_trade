'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { StatusPage } from '@/components/system/status-page'

/** docs/02 E32 · 500 with a reference code (error.digest matches the server
 *  log). This Next version passes `retry` to error boundaries. */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusPage
      code="500"
      kicker="Something went wrong"
      title="We could not load this page"
      blurb="The problem has been logged on our side. Try again in a moment — if it keeps happening, quote the reference code when you report it."
      icon="alert"
      refCode={error.digest ? `CT-500-${error.digest}` : 'CT-500-PENDING'}
      primary={{ label: 'Browse listings', href: '/browse' }}
      action={
        <Button variant="secondary" onClick={() => retry()}>
          Try again
        </Button>
      }
    />
  )
}
