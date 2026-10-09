import { describe, expect, it } from 'vitest'
import {
  accountApprovedEmail,
  accountSuspendedEmail,
  adminNoticeEmail,
  listingRemovedEmail,
  meetupReminderEmail,
  newOfferEmail,
  offerAcceptedEmail,
  reportOutcomeEmail,
  welcomeEmail,
  type BuiltMail,
} from './templates'

/**
 * docs/09 §1: every React Email template must build a subject, a plain-text
 * fallback and HTML that contains the heading (docs/03 3.13).
 */

const CASES: Array<{ name: string; build: () => Promise<BuiltMail>; subject: string; heading: string }> = [
  { name: 'welcome', build: () => welcomeEmail('Ana'), subject: 'Welcome to CaintaTrade', heading: 'Welcome to CaintaTrade, Ana!' },
  { name: 'new offer', build: () => newOfferEmail('Desk lamp'), subject: 'New trade offer on your listing', heading: 'You have a new trade offer' },
  { name: 'offer accepted', build: () => offerAcceptedEmail(), subject: 'Your trade offer was accepted', heading: 'Your offer was accepted' },
  { name: 'account approved', build: () => accountApprovedEmail('Ana'), subject: 'Your CaintaTrade account is approved', heading: "You're verified, Ana!" },
  { name: 'account suspended', build: () => accountSuspendedEmail('Repeated no-shows', '2026-11-01T00:00:00.000Z'), subject: 'Your CaintaTrade account is suspended', heading: 'Account suspended' },
  { name: 'listing removed', build: () => listingRemovedEmail('Rice cooker', 'Prohibited item'), subject: 'Your listing was removed', heading: 'Listing removed' },
  { name: 'report outcome', build: () => reportOutcomeEmail('Warning issued', 'Please keep chats on the platform.'), subject: 'Your report was resolved', heading: 'Your report has been reviewed' },
  { name: 'meetup reminder', build: () => meetupReminderEmail('Ben', 'Cainta Plaza', 'Saturday 10:00'), subject: 'Meetup reminder — CaintaTrade', heading: 'Your meetup is coming up' },
  { name: 'admin notice', build: () => adminNoticeEmail('Profile update needed', 'Please confirm your barangay.'), subject: 'Profile update needed', heading: 'Profile update needed' },
]

/** React Email escapes text nodes (&#x27; etc.) — decode before matching. */
function unesc(s: string) {
  return s
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

describe('email templates (docs/03 3.13)', () => {
  it('builds all 9 templates', () => {
    expect(CASES).toHaveLength(9)
  })

  for (const c of CASES) {
    it(`${c.name}: subject, text fallback and HTML render`, async () => {
      const mail = await c.build()
      expect(mail.subject).toBe(c.subject)
      expect(mail.text).toContain(c.heading)
      expect(mail.text.trim().length).toBeGreaterThan(c.heading.length)
      expect(mail.html).toContain('<html')
      expect(unesc(mail.html)).toContain(c.heading)
      // branded footer present in every template
      expect(mail.html).toContain('CaintaTrade')
      // every CTA links to the app origin (no absolute foreign hosts)
      expect(mail.html).not.toMatch(/href="(?!http:\/\/localhost|https:\/\/localhost)/)
    })
  }

  it('escapes user-supplied values into the text body verbatim', async () => {
    const mail = await newOfferEmail('Table & chair <set>')
    expect(mail.text).toContain('Table & chair <set>')
  })
})
