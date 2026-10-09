import Link from 'next/link'
import { requireMember } from '@/lib/auth/guards'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { MobileBar } from '@/components/layout/mobile-bar'
import { Banner } from '@/components/ui/feedback'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** docs/02 · member chrome: resident navbar (Home, Browse, My listings, Offers,
 *  Messages, bell, avatar), the brass pending banner while awaiting approval,
 *  footer and the resident mobile tab bar. The guard itself lives here so every
 *  member route inherits onboarding/approval redirects (docs/09 T-A4). */
export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, profile } = await requireMember()

  // real unread count for the bell (replaces the old mock `3`)
  const { count: unread } = await supabaseAdmin()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  const pending = profile.status !== 'verified'

  return (
    <div className="flex flex-col min-h-full">
      <SiteNav variant={pending ? 'pending' : 'resident'} notifications={unread ?? 0} />
      {pending ? (
        <Banner
          tone="brass"
          icon="clock"
          aside={
            <Link
              href="/account-status"
              className="font-mono text-[12.5px] uppercase tracking-[0.04em] underline underline-offset-[3px]"
            >
              Check status
            </Link>
          }
        >
          Your account is awaiting approval — browsing, settings and your wishlist stay open until
          an administrator approves you.
        </Banner>
      ) : null}
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <MobileBar variant="resident" />
    </div>
  )
}
