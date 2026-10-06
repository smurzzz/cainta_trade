import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

/**
 * Unit tests for the Clerk webhook (docs/09 §1, case T-A8:
 * "Clerk webhook with bad signature → 400, no change").
 *
 * The Supabase admin client is mocked; the Svix/standard-webhooks signature is
 * computed here exactly the way @clerk/backend verifies it.
 */

const SIGNING_SECRET = 'whsec_' + Buffer.from('caintatrade-test-signing-secret!').toString('base64')
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/clerk'

type DbResult = { error: { message: string } | null }

const db = vi.hoisted(() => {
  const eq = vi.fn<(column: string, value: string) => DbResult>()
  const update = vi.fn<(payload: Record<string, unknown>) => { eq: typeof eq }>()
  const upsert = vi.fn<
    (payload: Record<string, unknown>, options?: { onConflict?: string }) => DbResult
  >()
  const from = vi.fn<
    (table: string) => { upsert: typeof upsert; update: typeof update }
  >()
  return { eq, update, upsert, from }
})

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: () => ({ from: db.from }),
}))

function sign(secretWithPrefix: string, msgId: string, timestampSecs: number, payload: string) {
  const key = Buffer.from(secretWithPrefix.replace(/^whsec_/, ''), 'base64')
  const sig = createHmac('sha256', key).update(`${msgId}.${timestampSecs}.${payload}`).digest('base64')
  return `v1,${sig}`
}

function makeRequest(body: unknown, opts: { tamper?: boolean; omitHeaders?: boolean } = {}) {
  const payload = JSON.stringify(body)
  const msgId = 'msg_' + Math.random().toString(36).slice(2)
  const timestampSecs = Math.floor(Date.now() / 1000)
  const signature = sign(
    opts.tamper ? 'whsec_' + Buffer.from('a-different-signing-secret!!!!').toString('base64') : SIGNING_SECRET,
    msgId,
    timestampSecs,
    payload,
  )

  const headers = new Headers({ 'content-type': 'application/json' })
  if (!opts.omitHeaders) {
    headers.set('svix-id', msgId)
    headers.set('svix-timestamp', String(timestampSecs))
    headers.set('svix-signature', signature)
  }

  return new NextRequest(WEBHOOK_URL, { method: 'POST', body: payload, headers })
}

const baseUser = {
  id: 'user_test123',
  first_name: 'Juan',
  last_name: 'Dela Cruz',
  username: null,
  image_url: 'https://img.clerk.example/u.png',
  primary_email_address_id: 'emai_1',
  email_addresses: [{ id: 'emai_1', email_address: 'juan@example.com' }],
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CLERK_WEBHOOK_SIGNING_SECRET = SIGNING_SECRET
  db.eq.mockReturnValue({ error: null })
  db.upsert.mockReturnValue({ error: null })
  db.update.mockReturnValue({ eq: db.eq })
  db.from.mockReturnValue({ upsert: db.upsert, update: db.update })
})

describe('POST /api/webhooks/clerk', () => {
  it('rejects a request with a bad signature (400, no writes)', async () => {
    const res = await POST(makeRequest({ type: 'user.created', data: baseUser }, { tamper: true }))
    expect(res.status).toBe(400)
    expect(db.from).not.toHaveBeenCalled()
  })

  it('rejects a request without svix headers (400, no writes)', async () => {
    const res = await POST(makeRequest({ type: 'user.created', data: baseUser }, { omitHeaders: true }))
    expect(res.status).toBe(400)
    expect(db.from).not.toHaveBeenCalled()
  })

  it('user.created upserts a profile without touching role/status', async () => {
    const res = await POST(makeRequest({ type: 'user.created', object: 'event', data: baseUser }))
    expect(res.status).toBe(200)

    expect(db.from).toHaveBeenCalledWith('profiles')
    expect(db.upsert).toHaveBeenCalledTimes(1)

    const [payload, options] = db.upsert.mock.calls[0]
    expect(payload).toEqual({
      id: 'user_test123',
      full_name: 'Juan Dela Cruz',
      email: 'juan@example.com',
      avatar_url: 'https://img.clerk.example/u.png',
    })
    // role/status must fall back to column defaults so a retried event can
    // never reset an admin-set role or account status.
    expect(payload).not.toHaveProperty('role')
    expect(payload).not.toHaveProperty('status')
    expect(options).toEqual({ onConflict: 'id' })
  })

  it('user.updated refreshes name/email/avatar only', async () => {
    const res = await POST(
      makeRequest({
        type: 'user.updated',
        data: { ...baseUser, first_name: 'Maria', last_name: 'Santos' },
      }),
    )
    expect(res.status).toBe(200)

    const [payload] = db.upsert.mock.calls[0]
    expect(payload.full_name).toBe('Maria Santos')
    expect(payload).not.toHaveProperty('role')
    expect(payload).not.toHaveProperty('status')
  })

  it('user.deleted marks the profile deleted', async () => {
    const res = await POST(makeRequest({ type: 'user.deleted', data: { id: 'user_test123' } }))
    expect(res.status).toBe(200)

    expect(db.update).toHaveBeenCalledTimes(1)
    const [updatePayload] = db.update.mock.calls[0]
    expect(updatePayload.status).toBe('deleted')
    expect(updatePayload.deleted_at).toBeTruthy()
    expect(db.eq).toHaveBeenCalledWith('id', 'user_test123')
    expect(db.upsert).not.toHaveBeenCalled()
  })

  it('returns 500 so Clerk retries when Supabase fails', async () => {
    db.upsert.mockReturnValue({ error: { message: 'connection refused' } })
    const res = await POST(makeRequest({ type: 'user.created', data: baseUser }))
    expect(res.status).toBe(500)
  })

  it('acknowledges event types it does not handle', async () => {
    const res = await POST(makeRequest({ type: 'session.created', data: { id: 'sess_1' } }))
    expect(res.status).toBe(200)
    expect(db.from).not.toHaveBeenCalled()
  })
})
