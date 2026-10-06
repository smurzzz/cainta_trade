'use client'

import { usePathname } from 'next/navigation'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { MobileBar } from '@/components/layout/mobile-bar'

/** Auth chrome: guest nav on sign-in/sign-up/onboarding, the pending
 *  (brass banner) nav on account-status — matching the mockups b6–b9. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const pending = pathname === '/account-status'
  return (
    <div className="flex flex-col min-h-full">
      <SiteNav variant={pending ? 'pending' : 'guest'} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <MobileBar variant="guest" />
    </div>
  )
}
