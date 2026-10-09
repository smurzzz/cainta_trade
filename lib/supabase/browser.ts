'use client'

import { createClient } from '@supabase/supabase-js'/** Public browser client (anon key) for catalog reads (browse, item detail).
 *
 *  No bearer token on purpose — this client only touches public rows. For
 *  realtime subscriptions and any user-scoped client query use
 *  `useSupabaseAuthedClient()` from lib/supabase/authed.ts (Clerk `supabase`
 *  JWT template + Supabase third-party auth — both enabled, docs/05 §E). */
export function useSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
