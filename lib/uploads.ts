/** Upload validation (docs/03 3.2, docs/11 §5): magic-byte type sniffing,
 *  size limit, random file names, per-user folders. EXIF is stripped client-side
 *  by browser-image-compression before upload (re-encode drops metadata);
 *  the server never re-hosts the original bytes unexamined. */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_ITEM_PHOTOS = 8

export type SniffedType = 'jpg' | 'png' | 'pdf'

/** Detect the real type from leading bytes — never trust the extension. */
export function sniffType(bytes: Uint8Array): SniffedType | null {
  if (bytes.length < 4) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) return 'png'
  if (
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
  ) return 'pdf'
  return null
}

export class UploadError extends Error {}

/** Read + validate an uploaded File. Throws UploadError with safe copy. */
export async function readUpload(file: File, kinds: SniffedType[] = ['jpg', 'png']) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError('That file is over 5 MB — please choose a smaller one.')
  }
  const buf = new Uint8Array(await file.arrayBuffer())
  const kind = sniffType(buf)
  if (!kind || !kinds.includes(kind)) {
    throw new UploadError(
      kinds.includes('pdf')
        ? 'We could not read that file. Upload a JPG, PNG or PDF under 5 MB.'
        : 'That does not look like a JPG or PNG photo.',
    )
  }
  return { bytes: buf, ext: kind === 'jpg' ? 'jpg' : kind }
}

/** Random, unguessable file name (docs/11 §5 — no user-controlled paths). */
export function randomName(ext: string) {
  return `${crypto.randomUUID()}.${ext}`
}

/** Strip anything that could escape the folder: segments + odd characters. */
export function safeFolder(userId: string) {
  return userId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'anon'
}
