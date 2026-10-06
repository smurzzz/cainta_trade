import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { MobileBar } from '@/components/layout/mobile-bar'

/** Public chrome: guest nav, content, ink footer, mobile bottom bar. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-full">
      <SiteNav variant="guest" />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <MobileBar variant="guest" />
    </div>
  )
}
