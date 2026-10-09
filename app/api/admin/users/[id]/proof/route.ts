import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { signedUrl, BUCKETS } from '@/lib/storage'
import { logAdminAction } from '@/lib/audit'
import { REF } from '@/lib/errors'

/** docs/03 3.4: GET /api/admin/users/[id]/proof — moderator+ only, 60 s
 *  signed URL for the user's latest residency proof + `document_viewed`
 *  audit row. The residency-docs bucket has no client policies at all. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { userId: adminId } = await requireRole('moderator')
    const { id } = await ctx.params

    const { data: doc } = await supabaseAdmin()
      .from('residency_documents')
      .select('id, storage_path, status')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!doc) {
      return NextResponse.json({ error: 'No document on file.' }, { status: 404 })
    }

    const url = await signedUrl(BUCKETS.residencyDocs, doc.storage_path, 60)
    await logAdminAction({
      adminId,
      action: 'document_viewed',
      subjectType: 'profile',
      subjectId: id,
      ruleRef: doc.id,
    })
    return NextResponse.json({ url, expiresInSeconds: 60 })
  } catch (e) {
    console.error('[proof]', e)
    // requireRole redirects throw NEXT_REDIRECT — let it propagate
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
    return NextResponse.json({ error: 'Not allowed.', code: REF.ADMIN }, { status: 403 })
  }
}
