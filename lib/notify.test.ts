import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createNotification, emailIfAllowed, notifyUser } from './notify'
import { sendEmail } from '@/lib/email'

/** docs/03 3.13: email goes out through notify preferences, with the React
 *  Email template supplying subject/text/html when provided. */

type Row = Record<string, unknown>

const db = vi.hoisted(() => {
  const state: { prefs: Row | null; inserted: Row[] } = { prefs: null, inserted: [] }

  function prefsBuilder() {
    const b: Record<string, unknown> = {}
    for (const op of ['select', 'eq']) b[op] = () => b
    b.maybeSingle = () => Promise.resolve({ data: state.prefs, error: null })
    return b
  }

  function notifBuilder() {
    const b: Record<string, unknown> = {}
    b.insert = (row: Row) => {
      state.inserted.push(row)
      return Promise.resolve({ error: null })
    }
    return b
  }

  return {
    state,
    client: {
      from: (table: string) => (table === 'notification_preferences' ? prefsBuilder() : notifBuilder()),
    },
    reset() {
      state.prefs = { in_app: true, email: true }
      state.inserted = []
    },
  }
})

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: () => db.client }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ sent: true })) }))

beforeEach(() => {
  db.reset()
  vi.mocked(sendEmail).mockClear()
})

describe('emailIfAllowed', () => {
  it('sends when the preference allows it', async () => {
    await emailIfAllowed({
      userId: 'user_1',
      type: 'account_approved',
      to: 'a@example.com',
      subject: 'Approved',
      text: 'Welcome',
    })
    expect(sendEmail).toHaveBeenCalledWith({ to: 'a@example.com', subject: 'Approved', text: 'Welcome', html: undefined })
  })

  it('does not send when the email preference is off', async () => {
    db.state.prefs = { in_app: true, email: false }
    await emailIfAllowed({
      userId: 'user_1',
      type: 'admin_notice',
      to: 'a@example.com',
      subject: 'x',
      text: 'x',
    })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('does not send when there is no address', async () => {
    await emailIfAllowed({ userId: 'user_1', type: 'admin_notice', to: '', subject: 'x', text: 'x' })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('uses the React Email template for subject/text/html when provided', async () => {
    const template = vi.fn(async () => ({
      subject: 'Template subject',
      text: 'Template text',
      html: '<html><body>hi</body></html>',
    }))
    await emailIfAllowed({
      userId: 'user_1',
      type: 'listing_expiring',
      to: 'a@example.com',
      subject: 'ignored',
      text: 'ignored',
      template,
    })
    expect(template).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'a@example.com',
      subject: 'Template subject',
      text: 'Template text',
      html: '<html><body>hi</body></html>',
    })
  })
})

describe('createNotification / notifyUser', () => {
  it('inserts an in-app row when the preference allows', async () => {
    await createNotification({ userId: 'user_1', type: 'new_offer', title: 'New offer', body: 'b', link: '/offers' })
    expect(db.state.inserted).toHaveLength(1)
    expect(db.state.inserted[0]).toMatchObject({ user_id: 'user_1', type: 'new_offer', title: 'New offer' })
  })

  it('skips the insert when in-app is off', async () => {
    db.state.prefs = { in_app: false, email: true }
    await createNotification({ userId: 'user_1', type: 'new_offer', title: 'New offer' })
    expect(db.state.inserted).toHaveLength(0)
  })

  it('notifyUser does both channels in one call', async () => {
    await notifyUser({
      userId: 'user_1',
      type: 'account_approved',
      title: 'Approved',
      body: 'Welcome',
      email: { to: 'a@example.com', subject: 'Approved', text: 'Welcome' },
    })
    expect(db.state.inserted).toHaveLength(1)
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })
})
