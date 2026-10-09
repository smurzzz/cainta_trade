import { expect, test } from '@playwright/test'

/**
 * docs/09 §7 · security checks that run without sign-in:
 *  - cron endpoints reject requests without the CRON_SECRET bearer
 *  - the Clerk webhook rejects a bad signature (T-A8)
 * (The client-bundle service-key grep runs in the final gate against .next.)
 */

const CRON_ROUTES = [
  '/api/cron/expire-listings',
  '/api/cron/expire-offers',
  '/api/cron/purge-residency',
  '/api/cron/purge-old',
  '/api/cron/meetup-reminders',
  '/api/cron/overdue-approvals',
]

test.describe('cron secret', () => {
  for (const route of CRON_ROUTES) {
    test(`${route} rejects a missing bearer`, async ({ request }) => {
      const res = await request.get(route)
      expect(res.status()).toBe(401)
    })

    test(`${route} rejects a wrong bearer`, async ({ request }) => {
      const res = await request.get(route, { headers: { authorization: 'Bearer not-the-secret' } })
      expect(res.status()).toBe(401)
    })
  }

  test('dry run works end to end when CRON_SECRET is available', async ({ request }) => {
    const secret = process.env.CRON_SECRET
    test.skip(!secret, 'CRON_SECRET not exported to the Playwright environment')
    const res = await request.get('/api/cron/expire-offers?dryRun=1', {
      headers: { authorization: `Bearer ${secret}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, job: 'expire-offers', dryRun: true })
    expect(body.report).toHaveProperty('wouldExpire')
  })
})

test.describe('Clerk webhook', () => {
  test('rejects a payload with no signature (T-A8)', async ({ request }) => {
    const res = await request.post('/api/webhooks/clerk', {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({ type: 'user.created', data: { id: 'user_x' } }),
    })
    expect(res.status()).toBe(400)
  })

  test('rejects a tampered signature (T-A8)', async ({ request }) => {
    const res = await request.post('/api/webhooks/clerk', {
      headers: {
        'content-type': 'application/json',
        'svix-id': 'msg_test',
        'svix-timestamp': String(Math.floor(Date.now() / 1000)),
        'svix-signature': 'v1,dGhpcy1pcy1ub3QtYS1yZWFsLXNpZ25hdHVyZQ==',
      },
      data: JSON.stringify({ type: 'user.created', data: { id: 'user_x' } }),
    })
    expect(res.status()).toBe(400)
  })
})
