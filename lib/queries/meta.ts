import { cache } from 'react'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type FormOptions = {
  categories: Array<{ id: string; name: string }>
  barangays: Array<{ id: string; name: string }>
  spots: Array<{ id: string; name: string }>
}

/** Shared select options for the item/offer/settings forms. Server-rendered and
 *  React-cached so a page's selects and its preview share one round trip. */
export const getFormOptions = cache(async (): Promise<FormOptions> => {
  const db = supabaseAdmin()
  const [cats, bars, spots] = await Promise.all([
    db.from('categories').select('id, name').order('sort_order'),
    db.from('barangays').select('id, name').eq('is_enabled', true).order('name'),
    db.from('meetup_spots').select('id, name').eq('is_enabled', true).order('name'),
  ])
  if (cats.error) throw new Error(`categories: ${cats.error.message}`)
  if (bars.error) throw new Error(`barangays: ${bars.error.message}`)
  if (spots.error) throw new Error(`meetup_spots: ${spots.error.message}`)
  return {
    categories: (cats.data ?? []).map((c) => ({ id: c.id, name: c.name })),
    barangays: (bars.data ?? []).map((b) => ({ id: b.id, name: b.name })),
    spots: (spots.data ?? []).map((s) => ({ id: s.id, name: s.name })),
  }
})
