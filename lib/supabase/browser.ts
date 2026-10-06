'use client'

import { useAuth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export function useSupabaseClient() {
  const { getToken } = useAuth()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return getToken()
      },
    },
  )
}