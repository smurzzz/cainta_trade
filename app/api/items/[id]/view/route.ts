import { NextRequest, NextResponse } from 'next/server'
import { supabaseUser } from '@/lib/supabase/server'

/** docs/07 · view counting: POST /api/items/[id]/view increments views_count
 *  through the anon-callable increment_views() SQL function, deduped per
 *  browser session with a 7-day cookie holding the ids already counted. */

const COOKIE = 'ct_views'
const MAX_IDS = 40
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: 'Bad item id.' }, { status: 400 })
  }

  const cookie = _req.cookies.get(COOKIE)?.value ?? ''
  const seen = new Set(cookie.split(',').filter((v) => UUID_RE.test(v)))
  if (seen.has(id)) {
    return NextResponse.json({ ok: true, counted: false })
  }

  const { error } = await supabaseUser().rpc('increment_views', { p_item_id: id })
  if (error) {
    console.error('[views]', error)
    return NextResponse.json({ ok: false, error: 'Could not count that view.' }, { status: 500 })
  }

  seen.add(id)
  const next = [...seen].slice(-MAX_IDS).join(',')
  const res = NextResponse.json({ ok: true, counted: true })
  res.cookies.set(COOKIE, next, {
    path: '/',
    maxAge: 7 * 86_400,
    sameSite: 'lax',
    httpOnly: true,
  })
  return res
}
