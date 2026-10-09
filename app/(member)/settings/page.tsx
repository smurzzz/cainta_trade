import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { SettingsScreen } from '@/components/member/settings-screen'
import { getProfile } from '@/lib/auth/guards'
import { NOTIFY_TYPES } from '@/lib/notify'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata: Metadata = {
  title: 'Settings — CaintaTrade',
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  mobile: string | null
  street_address: string | null
  barangay_id: string | null
  bio: string | null
  avatar_url: string | null
  show_mobile: boolean
  allow_pre_offer_msg: boolean
  show_trade_count: boolean
  show_barangay: boolean
  show_last_active: boolean
  show_usual_meetup: boolean
  hide_from_search: boolean
}

/** docs/02 C22 · profile and settings: personal info, photo, contact
 *  visibility, security shortcuts, notification preferences and data controls. */
export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const guard = await getProfile(userId)
  if (!guard) redirect('/onboarding')

  const db = supabaseAdmin()
  const [{ data: profile }, { data: barangays }, { data: prefs }, { data: docs }] =
    await Promise.all([
      db
        .from('profiles')
        .select(
          'id, full_name, email, mobile, street_address, barangay_id, bio, avatar_url, show_mobile, allow_pre_offer_msg, show_trade_count, show_barangay, show_last_active, show_usual_meetup, hide_from_search',
        )
        .eq('id', userId)
        .maybeSingle(),
      db.from('barangays').select('id, name').eq('is_enabled', true).order('name'),
      db.from('notification_preferences').select('type, in_app, email').eq('user_id', userId),
      db
        .from('residency_documents')
        .select('id, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1),
    ])

  if (!profile) redirect('/onboarding')

  const known = new Set(prefs?.map((p) => p.type) ?? [])
  const prefRows = NOTIFY_TYPES.map((type) => {
    const row = prefs?.find((p) => p.type === type)
    return {
      type,
      inApp: row?.in_app ?? true,
      email: row?.email ?? true,
    }
  })
  void known

  return (
    <div className="wrap py-7 md:py-11 max-w-4xl">
      <div className="mb-6">
        <div className="t-meta mb-1.5">Settings</div>
        <h1 className="t-h1">Your profile and preferences</h1>
      </div>

      <SettingsScreen
        profile={profile as ProfileRow}
        barangays={(barangays ?? []).map((b) => ({ id: b.id, name: b.name }))}
        prefs={prefRows}
        doc={docs?.[0] ? { id: docs[0].id, status: docs[0].status } : null}
      />
    </div>
  )
}
