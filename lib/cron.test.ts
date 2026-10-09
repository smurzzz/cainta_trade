import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { runCron } from './cron'
import { logAdminAction } from '@/lib/audit'

/** docs/09 §7: cron endpoints must reject missing/wrong CRON_SECRET, support
 *  ?dryRun=1, and log every run as an automatic audit row (docs/03 3.14). */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/audit', () => ({ logAdminAction: vi.fn(async () => {}) }))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: () => ({}) }))

const SECRET = 'test-cron-secret-123'

function req(url = 'http://localhost/api/cron/test', bearer?: string) {
  return new NextRequest(url, {
    headers: bearer ? { authorization: `Bearer ${bearer}` } : {},
  })
}

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', SECRET)
  vi.mocked(logAdminAction).mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('runCron', () => {
  it('rejects a request without a bearer token (401)', async () => {
    const res = await runCron(req(), 'test', async () => ({ fine: true }))
    expect(res.status).toBe(401)
    expect(logAdminAction).not.toHaveBeenCalled()
  })

  it('rejects a wrong bearer token (401)', async () => {
    const res = await runCron(req('http://localhost/api/cron/test', 'wrong'), 'test', async () => ({ fine: true }))
    expect(res.status).toBe(401)
    expect(logAdminAction).not.toHaveBeenCalled()
  })

  it('fails closed when CRON_SECRET is not configured (503)', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const res = await runCron(req('http://localhost/api/cron/test', ''), 'test', async () => ({}))
    expect(res.status).toBe(503)
  })

  it('runs the job, logs an automatic audit row, and returns the report', async () => {
    const job = vi.fn(async () => ({ expired: 3 }))
    const res = await runCron(req('http://localhost/api/cron/test', SECRET), 'expire-test', job)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, job: 'expire-test', dryRun: false, report: { expired: 3 } })
    expect(job).toHaveBeenCalledTimes(1)
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: null, action: 'cron_expire-test', subjectType: 'cron' }),
    )
  })

  it('parses ?dryRun=1 and passes it to the job', async () => {
    const job = vi.fn(async () => ({ listed: 2 }))
    const res = await runCron(req(`http://localhost/api/cron/test?dryRun=1`, SECRET), 'test', job)
    expect(res.status).toBe(200)
    expect(job).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }))
    const body = await res.json()
    expect(body.dryRun).toBe(true)
    // dry runs are still audited, marked as such
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ reason: expect.stringContaining('dry-run') }),
    )
  })

  it('returns 500 and skips the audit row when the job throws', async () => {
    const res = await runCron(
      req('http://localhost/api/cron/test', SECRET),
      'boom',
      async () => {
        throw new Error('database exploded')
      },
    )
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('database exploded')
    expect(logAdminAction).not.toHaveBeenCalled()
  })
})
