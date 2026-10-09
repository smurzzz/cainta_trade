import type { Metadata } from 'next'
import { forbidden } from 'next/navigation'
import { CategoriesScreen, type CategoryRow, type KeywordRow } from '@/components/admin/categories-screen'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Categories — Admin — CaintaTrade',
}

/** docs/02 D29 · categories and prohibited keywords: reorder, add/edit,
 *  enable/disable. Deletion is refused while listings or children exist
 *  (server rule) — rename updates every listing automatically. */
export default async function AdminCategoriesPage() {
  // admin-only page: moderators get the 403 (docs/03 phase 3, docs/09 T-R3)
  const { profile } = await requireAdmin()
  if (profile.role !== 'admin') forbidden()

  const db = supabaseAdmin()
  const [{ data: cats }, { data: words }] = await Promise.all([
    db
      .from('categories')
      .select('id, name, parent_id, sort_order, is_enabled')
      .order('sort_order')
      .limit(200),
    db.from('prohibited_keywords').select('id, word, action, is_enabled').order('word').limit(200),
  ])

  return (
    <div>
      <div className="mb-6">
        <div className="t-meta mb-1.5">Admin / categories</div>
        <h1 className="t-h1">Categories and keywords</h1>
        <p className="t-small text-ink70 mt-2">
          Drag-free reorder with the arrows. Keywords “hold” a listing for review or “flag” it for
          moderators.
        </p>
      </div>

      <CategoriesScreen
        categories={(cats ?? []) as unknown as CategoryRow[]}
        keywords={(words ?? []) as unknown as KeywordRow[]}
      />
    </div>
  )
}
