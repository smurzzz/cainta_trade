import { StatusPage } from '@/components/system/status-page'

/** docs/02 E32 · 403 with a reference code. Rendered by Next when a guard
 *  calls forbidden() (requires experimental.authInterrupts). */
export default function Forbidden() {
  const ref = `CT-403-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

  return (
    <StatusPage
      code="403"
      kicker="Not allowed"
      title="You do not have access to this page"
      blurb="This area is limited to moderators and administrators. If you think you should have access, send us a note from settings and quote the reference code below."
      icon="lock"
      refCode={ref}
      primary={{ label: 'Back to my home', href: '/home' }}
    />
  )
}
