import type { Metadata } from 'next'
import { forbidden } from 'next/navigation'
import {
  SettingsAdminScreen,
  type AnnouncementRow,
  type BarangayRow,
  type LegalRow,
  type SpotRow,
} from '@/components/admin/settings-admin-screen'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Settings — Admin — CaintaTrade',
}

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** docs/02 D31 · reference data: barangays and coverage, meetup spots,
 *  announcements and the terms/privacy publisher. */
export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<Params> }) {
  // admin-only page: moderators get the 403 (docs/03 phase 3, docs/09 T-R3)
  const { profile } = await requireAdmin()
  if (profile.role !== 'admin') forbidden()

  const sp = await searchParams
  const tabParam = one(sp.tab)
  const tab =
    tabParam === 'spots' || tabParam === 'announcements' || tabParam === 'legal'
      ? tabParam
      : 'barangays'

  const db = supabaseAdmin()
  const [{ data: barangays }, { data: spots }, { data: announcements }, { data: legal }] =
    await Promise.all([
      db.from('barangays').select('id, name, description, is_enabled').order('name'),
      db
        .from('meetup_spots')
        .select('id, name, barangay_id, flag, is_enabled')
        .order('name')
        .limit(100),
      db
        .from('announcements')
        .select('id, title, body, is_enabled, starts_at, ends_at')
        .order('created_at', { ascending: false })
        .limit(20),
      db
        .from('legal_documents')
        .select('id, type, version, effective_date, body, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

  return (
    <div>
      <div className="mb-6">
        <div className="t-meta mb-1.5">Admin / settings</div>
        <h1 className="t-h1">Platform settings</h1>
      </div>

      <SettingsAdminScreen
        tab={tab}
        barangays={(barangays ?? []) as unknown as BarangayRow[]}
        spots={(spots ?? []) as unknown as SpotRow[]}
        announcements={(announcements ?? []) as unknown as AnnouncementRow[]}
        legal={(legal ?? []) as unknown as LegalRow[]}
      />
    </div>
  )
}
