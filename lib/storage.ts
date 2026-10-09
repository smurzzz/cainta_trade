import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const BUCKETS = {
  listingPhotos: 'listing-photos',
  residencyDocs: 'residency-docs',
  chatPhotos: 'chat-photos',
  reportEvidence: 'report-evidence',
} as const

/** Upload bytes to `{bucket}/{folder}/{randomName}` with the service role.
 *  Returns the storage path (never a public URL — private buckets use
 *  `signedUrl`). */
export async function uploadFile(
  bucket: string,
  folder: string,
  bytes: Uint8Array,
  filename: string,
  contentType: string,
) {
  const path = `${folder}/${filename}`
  const { error } = await supabaseAdmin()
    .storage.from(bucket)
    .upload(path, bytes, { contentType, upsert: false, cacheControl: '3600' })
  if (error) {
    console.error('[storage upload]', error)
    throw new Error('Upload failed — please try again.')
  }
  return path
}

/** 60-second signed URL (docs/11 §5: residency proofs, chat/evidence photos). */
export async function signedUrl(bucket: string, path: string, expiresIn = 60) {
  const { data, error } = await supabaseAdmin()
    .storage.from(bucket)
    .createSignedUrl(path, expiresIn)
  if (error) {
    console.error('[storage signed]', error)
    throw new Error('Could not open that file.')
  }
  return data.signedUrl
}

/** Best-effort removal (purge jobs, photo deletes, account deletion). */
export async function removeFiles(bucket: string, paths: string[]) {
  if (!paths.length) return
  const { error } = await supabaseAdmin().storage.from(bucket).remove(paths)
  if (error) console.error('[storage remove]', error)
}

/** Public URL for the public listing-photos bucket (browse cards). */
export function publicUrl(bucket: string, path: string) {
  return supabaseAdmin().storage.from(bucket).getPublicUrl(path).data.publicUrl
}
