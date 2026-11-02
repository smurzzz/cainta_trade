'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type ClerkGetToken = ReturnType<typeof useAuth>['getToken']

class ClerkTokenProvider {
  private getToken: ClerkGetToken

  constructor(getToken: ClerkGetToken) {
    this.getToken = getToken
  }

  update(getToken: ClerkGetToken) {
    this.getToken = getToken
  }

  get(options: Parameters<ClerkGetToken>[0]) {
    return this.getToken(options)
  }
}

function useClerkTokenProvider(getToken: ClerkGetToken) {
  const [provider] = useState(() => new ClerkTokenProvider(getToken))
  useEffect(() => provider.update(getToken), [getToken, provider])
  return provider
}

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
  const tokenProvider = useClerkTokenProvider(getToken)
  return useMemo(() => {
    if (!isLoaded) return null
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        accessToken: async () => {
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const token = await tokenProvider.get({ template: 'supabase' })
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
  }, [isLoaded, tokenProvider])
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
  const tokenProvider = useClerkTokenProvider(getToken)
  return useCallback(async (): Promise<boolean> => {
    if (!supabase) return false
    try {
      const token = await tokenProvider.get({ template: 'supabase', skipCache: true })
      if (!token) return false
      await supabase.realtime.setAuth(token)
      return true
    } catch {
      return false
    }
  }, [supabase, tokenProvider])
}
