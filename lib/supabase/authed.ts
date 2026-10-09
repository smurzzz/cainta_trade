'use client'

import { useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Browser client that authenticates REST requests with the Clerk `supabase`
 *  JWT template (aud/role `authenticated`). Needs Supabase **third-party auth
 *  (Clerk)** + the template; both are enabled (docs/05 §E blocker 2), so
 *  realtime and user-scoped queries run as `authenticated` with RLS keyed on
 *  `auth.jwt()->>'sub'` (= the Clerk user id).
 *
 *  Returns `null` until Clerk has loaded: constructing the client earlier
 *  makes the token callback fail during SSR/first paint (and realtime only
 *  retries it once). Signed-out visitors fall back to the anon key — safe,
 *  this client is only used behind a signed-in guard. */
export function useSupabaseAuthedClient(): SupabaseClient | null {
  const { isLoaded, getToken } = useAuth()
  // Clerk hands out a fresh getToken identity on re-render; keeping the client
  // alive across renders stops the subscribe effects (and their resubscribes)
  // from churning — which otherwise drops events during the churn window.
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  return useMemo(() => {
    if (!isLoaded) return null
    console.log('[rt-client] created', Date.now()) // TEMP-RT-DEBUG
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        accessToken: async () => {
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const token = await getTokenRef.current({ template: 'supabase' })
              if (token) return token
            } catch {
              // Clerk not ready yet — fall through to backoff
            }
            await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
          }
          return null
        },
      },
    )
  }, [isLoaded])
}

/** Pushes a FRESH `supabase` token onto the realtime socket once a channel
 *  has joined, and returns whether that succeeded.
 *
 *  Why this is needed: realtime-js only transmits a token when it differs
 *  from `accessTokenValue` — its cache, primed by the construction-time
 *  fetch, i.e. *before any channel exists*. A later `setAuth` with the same
 *  (Clerk-cached) token is a no-op, so the join goes out anonymous and RLS
 *  silently drops every event. A `skipCache` mint always differs, so it is
 *  pushed on the joined channel and the server re-registers the subscription
 *  with our claims (the "Subscribed to PostgreSQL" that follows the push).
 *  Fires again on every resubscribe (reconnects), which re-applies auth after
 *  realtime's own reconnect refresh too. */
export function usePushRealtimeAuth(supabase: SupabaseClient | null) {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  return useCallback(async (): Promise<boolean> => {
    if (!supabase) return false
    try {
      const token = await getTokenRef.current({ template: 'supabase', skipCache: true })
      if (!token) return false
      await supabase.realtime.setAuth(token)
      console.log('[rt-push] ok', Date.now()) // TEMP-RT-DEBUG
      return true
    } catch {
      console.log('[rt-push] failed', Date.now()) // TEMP-RT-DEBUG
      return false
    }
  }, [supabase])
}
