import { StatusPage } from '@/components/system/status-page'

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      kicker="Page not found"
      title="That page is not here"
      blurb="The link may be broken, the listing may already be traded or removed, or the address may have a typo."
      icon="search"
      primary={{ label: 'Browse listings', href: '/browse' }}
    />
  )
}
