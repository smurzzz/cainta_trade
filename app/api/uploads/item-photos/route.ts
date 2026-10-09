import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { readUpload, randomName, safeFolder, MAX_ITEM_PHOTOS, UploadError } from '@/lib/uploads'
import { uploadFile, BUCKETS } from '@/lib/storage'
import { rateLimit } from '@/lib/ratelimit'
import { REF, toActionError } from '@/lib/errors'

/** docs/07: POST /api/uploads/item-photos — V owner; ≤8 photos, JPG/PNG ≤5 MB,
 *  random names in {userId}/, main photo = lowest sort_order. */
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

    const form = await req.formData()
    const itemId = String(form.get('itemId') ?? '')
    const file = form.get('file')
    if (!itemId || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing item or file.' }, { status: 400 })
    }

    await rateLimit('uploads', userId)
    const db = supabaseAdmin()

    const { data: item } = await db
      .from('items')
      .select('id, owner_id')
      .eq('id', itemId)
      .maybeSingle()
    if (!item || item.owner_id !== userId) {
      return NextResponse.json({ error: 'Not your listing.' }, { status: 403 })
    }

    const { count } = await db
      .from('item_photos')
      .select('id', { count: 'exact', head: true })
      .eq('item_id', itemId)
    if ((count ?? 0) >= MAX_ITEM_PHOTOS) {
      return NextResponse.json({ error: `Up to ${MAX_ITEM_PHOTOS} photos.` }, { status: 400 })
    }

    let up: { bytes: Uint8Array; ext: string }
    try {
      up = await readUpload(file, ['jpg', 'png'])
    } catch (e) {
      if (e instanceof UploadError) {
        return NextResponse.json({ error: e.message }, { status: 400 })
      }
      throw e
    }

    const path = await uploadFile(
      BUCKETS.listingPhotos,
      safeFolder(userId),
      up.bytes,
      randomName(up.ext),
      up.ext === 'jpg' ? 'image/jpeg' : 'image/png',
    )

    const { data: photo, error } = await db
      .from('item_photos')
      .insert({
        item_id: itemId,
        storage_path: path,
        sort_order: count ?? 0,
        is_main: (count ?? 0) === 0,
      })
      .select('id, storage_path, sort_order, is_main')
      .single()
    if (error) throw error

    return NextResponse.json({ photo })
  } catch (e) {
    const err = toActionError(e, REF.LISTING)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
