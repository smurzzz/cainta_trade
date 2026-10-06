import type { NextRequest } from 'next/server'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import type { WebhookEvent } from '@clerk/nextjs/webhooks'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Clerk webhook endpoint (docs/10 §8).
 *
 * Keeps the `profiles` table in sync with Clerk, which owns identity:
 * - user.created  -> insert a pending resident profile (column defaults)
 * - user.updated  -> refresh name/email/avatar only (never role/status)
 * - user.deleted  -> mark the profile deleted
 *
 * The Svix signature is verified against CLERK_WEBHOOK_SIGNING_SECRET.
 * All writes use the service-role client (server only); RLS does not apply here.
 */
export async function POST(req: NextRequest) {
  let evt: WebhookEvent

  try {
    evt = await verifyWebhook(req)
  } catch (err) {
    console.error('[webhooks/clerk] signature verification failed', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = supabaseAdmin()

  try {
    switch (evt.type) {
      case 'user.created':
      case 'user.updated': {
        const user = evt.data
        const email =
          user.email_addresses.find((e) => e.id === user.primary_email_address_id)
            ?.email_address ??
          user.email_addresses[0]?.email_address ??
          null
        const fullName =
          [user.first_name, user.last_name].filter(Boolean).join(' ') ||
          user.username ||
          'New member'

        // Upsert so a retried event is idempotent. role/status are intentionally
        // omitted: on insert they fall back to the column defaults
        // (resident / pending), and an update must never overwrite an
        // admin-set role or account status.
        const { error } = await supabase.from('profiles').upsert(
          {
            id: user.id,
            full_name: fullName,
            email,
            avatar_url: user.image_url || null,
          },
          { onConflict: 'id' },
        )

        if (error) throw new Error(`profiles upsert failed: ${error.message}`)
        break
      }

      case 'user.deleted': {
        const userId = evt.data.id
        if (!userId) break // nothing to sync

        const { error } = await supabase
          .from('profiles')
          .update({ status: 'deleted', deleted_at: new Date().toISOString() })
          .eq('id', userId)

        if (error) throw new Error(`profiles delete-mark failed: ${error.message}`)
        break
      }

      default:
        // Subscribed to user.* only (docs/07); anything else is acknowledged.
        break
    }

    return Response.json({ received: true })
  } catch (err) {
    // Non-2xx makes Clerk retry with backoff, so a transient Supabase error
    // does not silently drop the sync.
    console.error('[webhooks/clerk] handler failed', err)
    return new Response('Webhook handler failed', { status: 500 })
  }
}
