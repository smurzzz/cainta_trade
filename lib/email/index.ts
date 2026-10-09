import 'server-only'
import { Resend } from 'resend'

/** Sender wrapper with plain-text fallback (docs/03 3.13).
 *  Without RESEND_API_KEY (local/CI) sends are logged and skipped so tests
 *  never depend on the provider. */

export type Mail = { to: string; subject: string; text: string; html?: string }

export async function sendEmail(mail: Mail): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    console.info(`[email skipped] to=${mail.to} subject=${mail.subject}`)
    return { sent: false }
  }
  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      ...(mail.html ? { html: mail.html } : {}),
    })
    if (error) {
      console.error('[email]', error)
      return { sent: false }
    }
    return { sent: true }
  } catch (e) {
    console.error('[email]', e)
    return { sent: false }
  }
}
