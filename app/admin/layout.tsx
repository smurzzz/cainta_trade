import { requireAdmin } from '@/lib/auth/guards'
import { AdminNav } from '@/components/admin/admin-nav'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { MobileBar } from '@/components/layout/mobile-bar'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** docs/02 D · admin console shell: guard (moderator+), resident navbar,
 *  sidebar with live badges, footer and mobile tab bar. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await requireAdmin()

  const db = supabaseAdmin()
  const [{ count: pendingUsers }, { count: openReports }, { count: unread }] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'assigned']),
    db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null),
  ])

  return (
    <div className="flex flex-col min-h-full">
      <SiteNav variant="resident" notifications={unread ?? 0} />
      <div className="wrap flex-1 grid gap-7 py-7 md:py-10 md:grid-cols-[210px_minmax(0,1fr)]">
        <AdminNav pendingUsers={pendingUsers ?? 0} openReports={openReports ?? 0} />
        <div className="min-w-0">{children}</div>
      </div>
      <SiteFooter />
      <MobileBar variant="resident" />
    </div>
  )
}
