import { redirect } from 'next/navigation'
import { requireSignedIn } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { AccountStatusView, type AccountStatusData } from '@/components/account-status-view'
import { isOlderThan } from '@/lib/time'

const DAY = 86_400_000

/** docs/03 3.15 · account status wired to the real profile: pending vs
 *  suspended come from `profiles.status`, the review tracker from residency
 *  documents, and the suspension panel from the audit log. Verified users do
 *  not need this screen. */
export default async function AccountStatusPage() {
  const { userId, profile } = await requireSignedIn()
  if (profile.status === 'verified') redirect('/browse')
  if (profile.status === 'deleted') redirect('/')

  const db = supabaseAdmin()
  const suspended = profile.status === 'suspended'

  const [{ data: full }, { data: doc }, brgy, audit] = await Promise.all([
    db
      .from('profiles')
      .select('full_name, email, mobile, created_at, onboarded_at, suspended_until')
      .eq('id', userId)
      .maybeSingle(),
    db
      .from('residency_documents')
      .select('id, proof_type, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    profile.barangay_id
      ? db.from('barangays').select('name').eq('id', profile.barangay_id).maybeSingle()
      : Promise.resolve({ data: null }),
    suspended
      ? db
          .from('admin_actions')
          .select('reason, created_at')
          .eq('action', 'user_suspended')
          .eq('subject_type', 'profile')
          .eq('subject_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const overdue = !suspended && isOlderThan(profile.onboarded_at ?? full?.created_at, DAY)

  // one still-open trade, if any (suspended members may finish accepted swaps)
  let openTrade: AccountStatusData['openTrade'] = null
  if (suspended) {
    const { data: tradeRow } = await db
      .from('trades')
      .select('id, code, status, offers!inner(from_user_id, to_user_id, wanted_item_id, offered_item_id)')
      .in('status', ['meetup_pending', 'meetup_set', 'both_confirmed'])
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`, { foreignTable: 'offers' })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (tradeRow) {
      const offer = Array.isArray(tradeRow.offers) ? tradeRow.offers[0] : tradeRow.offers
      if (offer) {
        const mineId = offer.from_user_id === userId ? offer.offered_item_id : offer.wanted_item_id
        const theirsId = offer.from_user_id === userId ? offer.wanted_item_id : offer.offered_item_id
        const partnerId = offer.from_user_id === userId ? offer.to_user_id : offer.from_user_id
        const [{ data: mine }, { data: theirs }, { data: partner }] = await Promise.all([
          db.from('items').select('id, title, status').eq('id', mineId).maybeSingle(),
          db.from('items').select('id, title, status').eq('id', theirsId).maybeSingle(),
          db.from('public_profiles').select('id, full_name').eq('id', partnerId).maybeSingle(),
        ])
        const photosFor = async (itemId: string) => {
          const { data } = await db
            .from('item_photos')
            .select('storage_path, is_main, sort_order')
            .eq('item_id', itemId)
            .order('is_main', { ascending: false })
            .order('sort_order')
            .limit(1)
          return data?.[0]?.storage_path ?? null
        }
        openTrade = {
          code: tradeRow.code,
          partnerName: partner?.full_name ?? 'Your neighbour',
          mine: { title: mine?.title ?? 'Your item', photo: await photosFor(mineId) },
          theirs: { title: theirs?.title ?? 'Their item', photo: await photosFor(theirsId) },
        }
      }
    }
  }

  const data: AccountStatusData = {
    mode: suspended ? 'suspended' : 'pending',
    name: full?.full_name ?? profile.full_name ?? 'neighbour',
    firstName: (full?.full_name ?? profile.full_name ?? '').split(/\s+/)[0] || 'neighbour',
    barangay: brgy.data?.name ?? null,
    mobile: full?.mobile ?? null,
    email: full?.email ?? null,
    createdAt: full?.created_at ?? null,
    submittedAt: doc?.created_at ?? profile.onboarded_at ?? full?.onboarded_at ?? null,
    proofType: doc?.proof_type ?? null,
    overdue,
    suspendedUntil: suspended ? (full?.suspended_until ?? profile.suspended_until) : null,
    suspendReason: audit.data?.reason ?? null,
    suspendAt: audit.data?.created_at ?? null,
    openTrade,
  }

  return <AccountStatusView data={data} />
}
