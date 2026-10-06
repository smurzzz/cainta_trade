import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseUser } from '@/lib/supabase/server'

export type AppRole = 'resident' | 'moderator' | 'admin'
export type ProfileStatus = 'pending' | 'verified' | 'suspended' | 'deleted'

export async function getProfile() {
  const { userId } = await auth()
  if (!userId) return null

  const supabase = supabaseUser()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, status, full_name, barangay_id')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(`Failed to load profile: ${error.message}`)
  return data
}

export async function requireMember() {
  const { userId } = await auth.protect()
  const profile = await getProfile()

  if (!profile || profile.status === 'deleted') redirect('/')
  if (profile.status === 'suspended') redirect('/account-status')

  return { userId, profile }
}

export async function requireAdmin() {
  const { userId } = await auth.protect()
  const profile = await getProfile()

  if (!profile) redirect('/onboarding')
  if (profile.role !== 'admin' && profile.role !== 'moderator') redirect('/home')

  return { userId, profile }
}