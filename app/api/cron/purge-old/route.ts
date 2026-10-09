import { NextRequest } from 'next/server'
import { runCron } from '@/lib/cron'
import { removeFiles, BUCKETS } from '@/lib/storage'

/** docs/03 3.14 · purge-old (monthly 03:00 on the 1st): retention from
 *  docs/11 §10 — messages 24 months, audit 24 months, document-view audit
 *  rows 12 months. Audit rows can only go through purge_admin_actions()
 *  because the append-only trigger blocks DELETE (009/024). */

export const dynamic = 'force-dynamic'

function monthsAgo(n: number) {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() - n)
  return d
}

export async function GET(req: NextRequest) {
  return runCron(req, 'purge-old', async ({ db, dryRun }) => {
    const cut24 = monthsAgo(24)
    const cut12 = monthsAgo(12)

    // ── messages older than 24 months (count now; photos go too) ───────────
    const { count: msgCount } = await db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .lt('created_at', cut24.toISOString())
    const { data: photoRows } = await db
      .from('messages')
      .select('id, photo_path')
      .lt('created_at', cut24.toISOString())
      .not('photo_path', 'is', null)
      .limit(1000)

    // ── audit rows: 24 months overall, document views 12 ───────────────────
    const { count: auditCount } = await db
      .from('admin_actions')
      .select('id', { count: 'exact', head: true })
      .lt('created_at', cut24.toISOString())
    const { count: viewCount } = await db
      .from('admin_actions')
      .select('id', { count: 'exact', head: true })
      .eq('action', 'document_viewed')
      .lt('created_at', cut12.toISOString())

    if (dryRun) {
      return {
        wouldPurgeMessages: msgCount ?? 0,
        wouldRemovePhotos: (photoRows ?? []).length,
        wouldPurgeAudit: auditCount ?? 0,
        wouldPurgeDocumentViews: viewCount ?? 0,
      }
    }

    const photos = (photoRows ?? []).map((r) => r.photo_path)
    if (photos.length) await removeFiles(BUCKETS.chatPhotos, photos)

    const { data: deleted, error: msgErr } = await db
      .from('messages')
      .delete()
      .lt('created_at', cut24.toISOString())
      .select('id')
    if (msgErr) throw msgErr

    // service-role RPCs (revoked from anon/authenticated — 009/024)
    const { data: views, error: e1 } = await db.rpc('purge_admin_actions', {
      p_before: cut12.toISOString(),
      p_action: 'document_viewed',
    })
    if (e1) throw e1
    const { data: audit, error: e2 } = await db.rpc('purge_admin_actions', {
      p_before: cut24.toISOString(),
      p_action: null,
    })
    if (e2) throw e2

    return {
      messagesPurged: deleted?.length ?? 0,
      photosRemoved: photos.length,
      documentViewsPurged: views ?? 0,
      auditPurged: audit ?? 0,
    }
  })
}
