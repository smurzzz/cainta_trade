import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { forbidden, redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type AppRole = 'resident' | 'moderator' | 'admin'
export type ProfileStatus = 'pending' | 'verified' | 'suspended' | 'deleted'

/** Profile lookup after Clerk auth. Uses the service-role client because the
 *  anon key can never read another viewer's profile row under RLS (docs/11 §2
 *  sketch shows the same pattern). */
export async function getProfile(userId?: string) {
  const id = userId ?? (await auth()).userId
  if (!id) return null

  const { data, error } = await supabaseAdmin()
    .from('profiles')
    .select('id, role, status, full_name, barangay_id, onboarded_at, suspended_until')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Failed to load profile: ${error.message}`)
  return data
}

/** Signed in and not deleted. Pending/suspended users pass — they still have
 *  browse / settings / wishlist access (docs/08 #4). */
export async function requireSignedIn() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const profile = await getProfile(userId)
  if (!profile || profile.status === 'deleted') redirect('/')
  return { userId, profile }
}

/** Verified resident (docs/11 §2). Pending and suspended land on /account-status. */
export async function requireVerified() {
  const { userId, profile } = await requireSignedIn()
  if (profile.status !== 'verified') redirect('/account-status')
  return { userId, profile }
}

/** Role gate for server actions: pass 'admin' to exclude moderators. */
export async function requireRole(min: 'moderator' | 'admin' = 'moderator') {
  const { userId, profile } = await requireVerified()
  const ok =
    profile.role === 'admin' || (min === 'moderator' && profile.role === 'moderator')
  if (!ok) redirect('/home')
  return { userId, role: profile.role as AppRole, profile }
}

/** Member area (layout): signed-in humans with a live profile. */
export async function requireMember() {
  const { userId } = await auth.protect()
  const profile = await getProfile(userId)

  // signed in but never onboarded → finish onboarding first (docs/09 T-A4)
  if (!profile) redirect('/onboarding')
  if (profile.status === 'deleted') redirect('/')
  if (profile.status === 'suspended') redirect('/account-status')

  return { userId, profile }
}

/** Admin console (layout): moderator or admin only. Non-staff get the 403
 *  page (app/forbidden.tsx, docs/02 E32) instead of a silent bounce. */
export async function requireAdmin() {
  const { userId } = await auth.protect()
  const profile = await getProfile(userId)

  if (!profile) redirect('/onboarding')
  if (profile.role !== 'admin' && profile.role !== 'moderator') forbidden()

  return { userId, profile }
}
