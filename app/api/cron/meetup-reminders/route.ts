import { NextRequest } from 'next/server'
import { runCron } from '@/lib/cron'
import { notifyUser } from '@/lib/notify'
import { meetupReminderEmail } from '@/lib/email/templates'

/** docs/03 3.14 · meetup-reminders (daily 09:00): trades meeting in the next
 *  24 hours get a day-before reminder to both parties, deduped by
 *  trades.reminder_sent_at (024). */

export const dynamic = 'force-dynamic'

type TradeRow = {
  id: string
  code: string
  meetup_at: string | null
  meetup_spot_id: string | null
  offers: { from_user_id: string; to_user_id: string } | Array<{ from_user_id: string; to_user_id: string }>
}

export async function GET(req: NextRequest) {
  return runCron(req, 'meetup-reminders', async ({ db, dryRun }) => {
    const now = new Date()
    const soon = new Date(now.getTime() + 86_400_000)

    const { data } = await db
      .from('trades')
      .select('id, code, meetup_at, meetup_spot_id, reminder_sent_at, offers!inner(from_user_id, to_user_id)')
      .in('status', ['meetup_pending', 'meetup_set'])
      .gte('meetup_at', now.toISOString())
      .lt('meetup_at', soon.toISOString())
      .is('reminder_sent_at', null)
      .limit(500)

    // PostgREST may type a to-one embed as an array — normalise it.
    const trades = ((data ?? []) as TradeRow[]).map((t) => ({
      ...t,
      offer: Array.isArray(t.offers) ? t.offers[0] : t.offers,
    })).filter((t) => t.offer && t.meetup_at)

    if (!trades.length) return { reminded: 0, ids: [] }
    if (dryRun) return { wouldRemind: trades.length * 2, ids: trades.slice(0, 50).map((t) => t.id) }

    // hydrate parties and places in two queries (view embeds don't resolve)
    const userIds = [...new Set(trades.flatMap((t) => [t.offer!.from_user_id, t.offer!.to_user_id]))]
    const spotIds = [...new Set(trades.map((t) => t.meetup_spot_id).filter(Boolean))] as string[]
    const [profilesRes, spotsRes] = await Promise.all([
      db.from('profiles').select('id, full_name, email').in('id', userIds),
      spotIds.length
        ? db.from('meetup_spots').select('id, name').in('id', spotIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    ])
    const people = new Map((profilesRes.data ?? []).map((p) => [p.id, p]))
    const spots = new Map((spotsRes.data ?? []).map((s) => [s.id, s.name]))

    for (const t of trades) {
      const { from_user_id: from, to_user_id: to } = t.offer!
      const spot = (t.meetup_spot_id && spots.get(t.meetup_spot_id)) || 'your agreed spot'
      const when = new Date(t.meetup_at!).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

      for (const [self, other] of [[from, to], [to, from]] as const) {
        const me = people.get(self)
        if (!me) continue
        const partner = people.get(other)?.full_name ?? 'your trading partner'
        await notifyUser({
          userId: self,
          type: 'meetup_updated',
          title: 'Meetup reminder',
          body: `You are meeting ${partner} at ${spot} — ${when}.`,
          link: `/trades/${t.id}`,
          email: me.email
            ? {
                to: me.email,
                subject: 'Meetup reminder — CaintaTrade',
                text: `You are meeting ${partner} at ${spot}.\nWhen: ${when}`,
                template: () => meetupReminderEmail(partner, spot, when),
              }
            : undefined,
        })
      }
    }

    const { error } = await db
      .from('trades')
      .update({ reminder_sent_at: now.toISOString() })
      .in('id', trades.map((t) => t.id))
    if (error) throw error

    return { reminded: trades.length * 2, ids: trades.slice(0, 50).map((t) => t.id) }
  })
}
