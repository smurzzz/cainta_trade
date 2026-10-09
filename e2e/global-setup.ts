import { clerkSetup } from '@clerk/testing/playwright'
import { writeFileSync } from 'node:fs'

export const CLERK_ENV_FILE = '.e2e-clerk-env.json'

/** docs/09 · Playwright global setup.
 *
 *  clerkSetup() loads `.env.local`, fetches a short-lived Clerk Testing Token
 *  from the Backend API and exposes `CLERK_FAPI` + `CLERK_TESTING_TOKEN`.
 *  Workers then register `setupClerkTestingToken({ page })`, which intercepts
 *  every Frontend API request, appends the token and flips `captcha_bypass` —
 *  the documented way past Cloudflare bot protection in tests.
 *
 *  The values are also mirrored to a transient file because Playwright worker
 *  processes do not reliably inherit setup-process env vars; helpers.ts falls
 *  back to it. */
export default async function globalSetup() {
  await clerkSetup() // sets CLERK_FAPI + CLERK_TESTING_TOKEN on process.env
  const env = {
    CLERK_FAPI: process.env.CLERK_FAPI,
    CLERK_TESTING_TOKEN: process.env.CLERK_TESTING_TOKEN,
  }
  if (!env.CLERK_FAPI || !env.CLERK_TESTING_TOKEN) {
    throw new Error('clerkSetup did not expose CLERK_FAPI / CLERK_TESTING_TOKEN')
  }
  writeFileSync(CLERK_ENV_FILE, JSON.stringify(env, null, 2))
}
