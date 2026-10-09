/** Public object URL for the public listing-photos bucket (no signed URL).
 *  Lives outside lib/queries/catalog so client components can use it without
 *  pulling in the `server-only` module graph. */
export function photoUrl(path: string | null | undefined) {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return `${base}/storage/v1/object/public/listing-photos/${path}`
}
