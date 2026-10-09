import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getMember, listMemberRatings } from '@/actions/profile'
import { MemberActions } from '@/components/member/member-actions'
import { Badge, Rating } from '@/components/ui/badge'
import { Empty } from '@/components/ui/feedback'
import { Icon } from '@/components/ui/icon'
import { ItemCard } from '@/components/ui/item-card'
import { SectionHead } from '@/components/ui/card'
import { photoUrl, timeAgo, type BrowseCard } from '@/lib/queries/catalog'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata: Metadata = {
  title: 'Member — CaintaTrade',
}

type Ctx = { params: Promise<{ id: string }> }

type ProfileView = {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  status?: string
  role?: string
  isSelf: boolean
  blockedByYou?: boolean
  approved_at?: string | null
  barangay_name?: string | null
  barangays?: { name: string } | null
  avg_rating?: number | null
  rating_count?: number | null
  completed_trades?: number | null
  responseRate?: number | null
  last_active_at?: string | null
}

/** docs/02 C21 · public profile: cover, badges, ratings, active listings and
 *  the trust/report rail. */
export default async function MemberPage({ params }: Ctx) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const res = await getMember(id)
  if (!res.ok || !res.data) notFound()
  const m = res.data as unknown as ProfileView

  const ratingsRes = await listMemberRatings(id, 1)
  const ratingRows =
    ratingsRes.ok && ratingsRes.data ? (ratingsRes.data.rows as Array<Record<string, unknown>>) : []
  const avg = ratingsRes.ok && ratingsRes.data ? ratingsRes.data.avg : null
  const ratingTotal = ratingsRes.ok && ratingsRes.data ? ratingsRes.data.total : 0

  const { data: listings } = await supabaseAdmin()
    .from('items')
    .select('id, title, status, created_at')
    .eq('owner_id', id)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(8)

  const cards: BrowseCard[] = []
  if (listings?.length) {
    const { data: photos } = await supabaseAdmin()
      .from('item_photos')
      .select('item_id, storage_path, is_main, sort_order')
      .in('item_id', listings.map((l) => l.id))
      .order('is_main', { ascending: false })
      .order('sort_order')
    const main = new Map<string, string>()
    for (const p of photos ?? []) if (!main.has(p.item_id)) main.set(p.item_id, p.storage_path)
    for (const l of listings) {
      const path = main.get(l.id)
      cards.push({
        id: l.id,
        code: l.id,
        title: l.title,
        status: l.status,
        category: '',
        barangay: '',
        lookingFor: null,
        photo: path ? (photoUrl(path) as string) : null,
        photoLabel: l.title,
        owner: null,
        createdAt: l.created_at,
        views: 0,
        saves: 0,
      } as unknown as BrowseCard)
    }
  }

  const barangay = m.barangay_name ?? m.barangays?.name ?? null

  return (
    <div className="wrap py-7 md:py-11">
      {/* cover + identity */}
      <div className="border border-line rounded-md bg-surface overflow-hidden">
        <div className="h-28 bg-ink relative">
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(200,69,42,.5),transparent_60%)]" />
        </div>
        <div className="px-6 pb-6 -mt-10 flex flex-wrap items-end gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.avatar_url ?? '/assets/avatar-1.svg'}
            alt=""
            className="w-24 h-24 rounded-full object-cover bg-paper2 border-[3px] border-surface flex-none"
          />
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="t-h1 !mb-0">{m.full_name ?? 'A neighbour'}</h1>
              {m.status === 'verified' ? <Badge variant="available">Verified resident</Badge> : null}
              {m.role === 'admin' || m.role === 'moderator' ? <Badge>Admin-reviewed</Badge> : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 t-meta mt-1.5">
              {barangay ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="pin" size={13} /> {barangay}, Cainta
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" size={13} /> member since{' '}
                {m.approved_at
                  ? new Date(m.approved_at).toLocaleDateString('en-PH', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'recently'}
              </span>
              {m.last_active_at ? <span>active {timeAgo(m.last_active_at)}</span> : null}
            </div>
            <div className="mt-2">
              <Rating stars={avg ?? 0} count={`${ratingTotal}`} />
            </div>
          </div>
          {!m.isSelf ? (
            <div className="pb-1">
              <MemberActions memberId={id} blocked={Boolean(m.blockedByYou)} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] mt-7">
        <div>
          {m.bio ? (
            <div className="border border-line rounded-md bg-surface p-6">
              <div className="t-label mb-2">About</div>
              <p className="t-body">{m.bio}</p>
            </div>
          ) : null}

          <div className="mt-7">
            <SectionHead label="Trading" title="Active listings" />
            {cards.length === 0 ? (
              <Empty icon="box" title="No active listings">
                Everything this member posted is currently paused, pending or exchanged.
              </Empty>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mt-4">
                {cards.map((c) => (
                  <ItemCard key={c.id} item={c} />
                ))}
              </div>
            )}
          </div>

          <div className="mt-9">
            <SectionHead label="Reputation" title="Ratings and feedback" />
            {ratingRows.length === 0 ? (
              <Empty icon="star" title="No ratings yet">
                Ratings appear after both sides confirm a meetup.
              </Empty>
            ) : (
              <ul className="mt-4 space-y-4">
                {ratingRows.map((r) => (
                  <li key={String(r.id)} className="border border-line rounded-md bg-surface p-5">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={String(r.rater_avatar ?? '/assets/avatar-3.svg')}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover bg-paper2 border border-line flex-none"
                      />
                      <div className="min-w-0">
                        <div className="text-[14.5px] text-ink">{String(r.rater_name ?? 'A neighbour')}</div>
                        <div className="t-meta">{timeAgo(String(r.created_at))}</div>
                      </div>
                      <div className="ml-auto text-brass text-[15px] flex-none">
                        {'★'.repeat(Number(r.stars ?? 0))}
                        <span className="text-linestrong">
                          {'★'.repeat(5 - Number(r.stars ?? 0))}
                        </span>
                      </div>
                    </div>
                    {r.comment ? <p className="t-small text-ink70 mt-2.5">{String(r.comment)}</p> : null}
                    {Array.isArray(r.tags) && (r.tags as string[]).length ? (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {(r.tags as string[]).map((t) => (
                          <span
                            key={t}
                            className="font-mono text-[11px] border border-line rounded-sm px-2 py-0.5 text-ink70"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="border border-line rounded-md bg-surface p-5">
            <div className="t-label mb-3">Trust checklist</div>
            <ul className="space-y-3">
              {[
                ['Verified resident', m.status === 'verified'],
                ['Proof of residency reviewed', Boolean(m.approved_at)],
                ['Trades completed', (m.completed_trades ?? 0) > 0],
                ['Responds to offers', (m.responseRate ?? 0) >= 50],
              ].map(([label, ok]) => (
                <li key={String(label)} className="flex items-center gap-2.5 text-[14px]">
                  <Icon
                    name={ok ? 'check' : 'x'}
                    size={15}
                    className={ok ? 'text-olive' : 'text-ink45'}
                  />
                  <span className={ok ? 'text-ink' : 'text-ink45'}>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-line rounded-md bg-surface p-5">
            <div className="t-label mb-3">Stats</div>
            <div className="flex justify-between py-2 border-b border-line last:border-0">
              <span className="t-small">Completed trades</span>
              <b>{m.completed_trades ?? 0}</b>
            </div>
            <div className="flex justify-between py-2 border-b border-line last:border-0">
              <span className="t-small">Response rate</span>
              <b>{m.responseRate != null ? `${m.responseRate}%` : '—'}</b>
            </div>
            <div className="flex justify-between py-2 border-b border-line last:border-0">
              <span className="t-small">Active listings</span>
              <b>{cards.length}</b>
            </div>
            <div className="flex justify-between py-2">
              <span className="t-small">Average rating</span>
              <b>{avg != null ? avg.toFixed(1) : '—'}</b>
            </div>
          </div>

          <div className="border border-line rounded-md bg-paper2 p-5">
            <div className="t-label mb-2">Meeting safely</div>
            <p className="t-small text-ink70">
              Agree the swap at one of the seven public meetup spots, in daylight, and inspect both
              items first.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
