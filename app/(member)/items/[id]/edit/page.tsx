import type { Metadata } from 'next'
import { forbidden, notFound, redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { ItemForm, type ItemDraft } from '@/components/member/item-form'
import { getProfile } from '@/lib/auth/guards'
import { getFormOptions } from '@/lib/queries/meta'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const metadata: Metadata = {
  title: 'Edit listing — CaintaTrade',
}

type Ctx = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

/** docs/02 C12 · edit a listing: prefilled form, photo manager, status control,
 *  renew and delete. Owner-only — a stranger gets the 403 page (docs/09 T-L4),
 *  a missing listing stays a 404. */
export default async function EditItemPage({ params, searchParams }: Ctx) {
  const { id } = await params
  const sp = await searchParams
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const profile = await getProfile(userId)
  if (!profile) redirect('/onboarding')

  const db = supabaseAdmin()
  const { data: item } = await db
    .from('items')
    .select(
      'id, owner_id, title, description, category_id, condition, looking_for, trade_type, barangay_id, meetup_spot_id, status',
    )
    .eq('id', id)
    .maybeSingle()
  if (!item) notFound()
  if (item.owner_id !== userId) forbidden()

  const [{ data: photos }, options] = await Promise.all([
    db
      .from('item_photos')
      .select('id, storage_path, sort_order, is_main')
      .eq('item_id', item.id)
      .order('is_main', { ascending: false })
      .order('sort_order'),
    getFormOptions(),
  ])

  const initial: ItemDraft = {
    id: item.id,
    title: item.title,
    description: item.description ?? '',
    categoryId: item.category_id ?? '',
    condition: item.condition,
    lookingFor: item.looking_for ?? '',
    tradeType: item.trade_type,
    barangayId: item.barangay_id ?? '',
    meetupSpotId: item.meetup_spot_id ?? '',
    status: item.status,
  }

  return (
    <div className="wrap py-7 md:py-11 max-w-5xl">
      <div className="mb-6">
        <div className="t-meta mb-1.5">My listings / edit</div>
        <h1 className="t-h1">{item.title}</h1>
      </div>

      <ItemForm
        mode="edit"
        options={options}
        initial={initial}
        photos={(photos ?? []).map((p) => ({ id: p.id, path: p.storage_path }))}
        justCreated={Boolean(sp.created)}
      />
    </div>
  )
}
