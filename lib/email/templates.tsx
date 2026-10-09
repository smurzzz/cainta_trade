// React Email templates (docs/03 3.13): welcome, new offer, offer accepted,
// account approved, account suspended, listing removed, report outcome,
// meetup reminder, admin notice. Each builder returns subject + plain-text
// fallback + rendered HTML; sendEmail() accepts all three.

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
  render,
} from '@react-email/components'

export type BuiltMail = { subject: string; text: string; html: string }

const APP = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function shell(preview: string, heading: string, lines: string[], cta?: { label: string; href: string }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f6f7f9', padding: '24px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px', maxWidth: '520px' }}>
          <Heading style={{ fontSize: '20px', margin: '0 0 16px' }}>{heading}</Heading>
          {lines.map((l, i) => (
            <Text key={i} style={{ fontSize: '15px', lineHeight: '1.6', color: '#333', margin: '0 0 12px' }}>
              {l}
            </Text>
          ))}
          {cta ? (
            <Button
              href={cta.href}
              style={{ backgroundColor: '#1d6f42', borderRadius: '6px', color: '#fff', padding: '12px 20px', textDecoration: 'none', display: 'inline-block' }}
            >
              {cta.label}
            </Button>
          ) : null}
          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
          <Text style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            CaintaTrade — barter trading for Cainta residents. This mailbox is not monitored; reply in the app instead.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

async function build(
  subject: string,
  preview: string,
  heading: string,
  lines: string[],
  cta?: { label: string; href: string },
): Promise<BuiltMail> {
  const html = await render(shell(preview, heading, lines, cta))
  return { subject, text: [heading, '', ...lines].join('\n'), html }
}

/* ───────────────────────── 9 templates (docs/03 3.13) ───────────────────────── */

export function welcomeEmail(name: string) {
  return build(
    'Welcome to CaintaTrade',
    'Your neighbourhood barter board is ready.',
    `Welcome to CaintaTrade, ${name}!`,
    [
      'CaintaTrade lets you trade items with neighbours — no cash, no shipping, just a meetup at a public spot.',
      'Next: verify your residency so you can post listings and make offers.',
    ],
    { label: 'Finish setup', href: `${APP}/onboarding` },
  )
}

export function newOfferEmail(itemTitle: string) {
  return build(
    'New trade offer on your listing',
    'A neighbour wants to swap for your item.',
    'You have a new trade offer',
    [
      `A neighbour made an offer for your listing "${itemTitle}".`,
      'Open your offers to accept, reject or suggest a different meetup.',
    ],
    { label: 'View offer', href: `${APP}/offers` },
  )
}

export function offerAcceptedEmail() {
  return build(
    'Your trade offer was accepted',
    'Great news — the other side said yes.',
    'Your offer was accepted',
    [
      'The listing owner accepted your offer.',
      'Agree on a meetup place and time in the chat, then confirm the swap together.',
    ],
    { label: 'Open the chat', href: `${APP}/messages` },
  )
}

export function accountApprovedEmail(name: string) {
  return build(
    'Your CaintaTrade account is approved',
    'Residency verified — you can trade now.',
    `You're verified, ${name}!`,
    [
      'Your proof of residency was approved. You can now post listings, make offers and trade with neighbours.',
    ],
    { label: 'Start browsing', href: `${APP}/browse` },
  )
}

export function accountSuspendedEmail(reason: string, until: string) {
  return build(
    'Your CaintaTrade account is suspended',
    'Your account is temporarily suspended.',
    'Account suspended',
    [
      `Reason: ${reason}`,
      `Suspension ends: ${until}`,
      'You can appeal from your account status page once you are signed in.',
    ],
    { label: 'View account status', href: `${APP}/account-status` },
  )
}

export function listingRemovedEmail(title: string, reason: string) {
  return build(
    'Your listing was removed',
    'A moderator removed one of your listings.',
    'Listing removed',
    [`Your listing "${title}" was removed by a moderator.`, `Reason: ${reason}`],
    { label: 'View my listings', href: `${APP}/my-listings` },
  )
}

export function reportOutcomeEmail(decision: string, note: string) {
  return build(
    'Your report was resolved',
    'A moderator reviewed your report.',
    'Your report has been reviewed',
    [`Outcome: ${decision}`, note ? `Moderator note: ${note}` : 'Thanks for helping keep CaintaTrade safe.'],
    { label: 'Open reports', href: `${APP}/report` },
  )
}

export function meetupReminderEmail(partnerName: string, place: string, when: string) {
  return build(
    'Meetup reminder — CaintaTrade',
    'Your swap is scheduled for soon.',
    'Your meetup is coming up',
    [
      `You are meeting ${partnerName} at ${place}.`,
      `When: ${when}`,
      'Confirm in the app right after you swap so the trade can be completed.',
    ],
    { label: 'Open trade', href: `${APP}/offers` },
  )
}

export function adminNoticeEmail(title: string, body: string) {
  return build(
    title,
    'A note from the CaintaTrade team.',
    title,
    [body],
    { label: 'Open CaintaTrade', href: APP },
  )
}
