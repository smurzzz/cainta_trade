import { NextRequest } from 'next/server'
import { runCron } from '@/lib/cron'
import { removeFiles, BUCKETS } from '@/lib/storage'

/** docs/03 3.14 · purge-residency (daily 02:00): residency proofs are kept
 *  90 days after approval (docs/11 §5) — once `delete_after` passes, remove
 *  the file from the private bucket and then the row. */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return runCron(req, 'purge-residency', async ({ db, dryRun }) => {
    const nowIso = new Date().toISOString()

    const { data: due } = await db
      .from('residency_documents')
      .select('id, storage_path, user_id')
      .not('delete_after', 'is', null)
      .lt('delete_after', nowIso)
      .limit(1000)

    const rows = due ?? []
    if (!rows.length) return { purged: 0, filesRemoved: 0, ids: [] }
    if (dryRun) return { wouldPurge: rows.length, ids: rows.slice(0, 50).map((r) => r.id) }

    await removeFiles(BUCKETS.residencyDocs, rows.map((r) => r.storage_path))
    const { error } = await db.from('residency_documents').delete().in('id', rows.map((r) => r.id))
    if (error) throw error

    return { purged: rows.length, filesRemoved: rows.length, ids: rows.slice(0, 50).map((r) => r.id) }
  })
}
