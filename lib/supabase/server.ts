import { createClient } from '@supabase/supabase-js'/** Public server-side client (anon key).
 *
 *  Deliberately sends NO bearer token: public rows and RLS-anon reads only.
 *  User-scoped reads and ALL writes run through `supabaseAdmin()` *after* a
 *  Clerk guard (`requireSignedIn` / `requireVerified` / `requireRole`) —
 *  docs/11 §2. Client-side realtime subscribes through
 *  `useSupabaseAuthedClient()` (lib/supabase/authed.ts), which attaches the
 *  Clerk `supabase` JWT now that third-party auth is enabled (docs/05 §E). */
export function supabaseUser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
