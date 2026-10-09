import { existsSync, readFileSync } from 'node:fs'
import { clerk } from '@clerk/testing/playwright'
import { expect, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { CLERK_ENV_FILE } from './global-setup'

/** Parse `.env.local` (Playwright's test process does not load it itself). */
let cached: Record<string, string> | null = null
export function envLocal(): Record<string, string> {
  if (cached) return cached
  const out: Record<string, string> = {}
  if (existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim())
      if (m) out[m[1]] = m[2]
    }
  }
  // Shell overrides win for keys already defined in the file — lets a run
  // pin NEXT_PUBLIC_APP_URL to a side port (e.g. http://localhost:3100) when
  // :3000 is occupied by a dev server, so every request hits one server.
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k in out) out[k] = v
  }
  cached = out
  return out
}

/** Make CLERK_FAPI / CLERK_TESTING_TOKEN visible inside the test worker —
 *  process env when inherited from global setup, transient file otherwise. */
export function ensureClerkTestingEnv(): void {
  if (!process.env.CLERK_FAPI || !process.env.CLERK_TESTING_TOKEN) {
    if (existsSync(CLERK_ENV_FILE)) {
      const j = JSON.parse(readFileSync(CLERK_ENV_FILE, 'utf8')) as Record<string, string>
      if (!process.env.CLERK_FAPI && j.CLERK_FAPI) process.env.CLERK_FAPI = j.CLERK_FAPI
      if (!process.env.CLERK_TESTING_TOKEN && j.CLERK_TESTING_TOKEN)
        process.env.CLERK_TESTING_TOKEN = j.CLERK_TESTING_TOKEN
    }
  }
  if (!process.env.CLERK_FAPI || !process.env.CLERK_TESTING_TOKEN) {
    throw new Error('Clerk testing env missing — global setup did not run (clerkSetup).')
  }
}

/** Test identity: `+clerk_test` subaddress ⇒ verification code is fixed 424242
 *  and no email is ever sent (docs/09 §5). The `cte2e` marker lets the
 *  teardown sweep anything a failed run left behind. */
export function testEmail(prefix: string): string {
  return `cte2e${prefix}+clerk_test_${Date.now()}@example.com`
}

/** Service-role Supabase client for assertions and fixture cleanup. */
export function adminDb(): SupabaseClient {
  const e = envLocal()
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function clerkGet(path: string): Promise<unknown> {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    headers: { Authorization: `Bearer ${envLocal().CLERK_SECRET_KEY}` },
  })
  if (!res.ok) throw new Error(`Clerk GET ${path} → ${res.status}`)
  return res.json()
}

export async function clerkDelete(path: string): Promise<void> {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${envLocal().CLERK_SECRET_KEY}` },
  })
  if (!res.ok && res.status !== 404) throw new Error(`Clerk DELETE ${path} → ${res.status}`)
}

/** Mirrors lib/uploads.ts safeFolder — keep in sync. */
function safeFolder(userId: string): string {
  return userId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'anon'
}

/** Wait until the Clerk JS runtime is actually loaded — otherwise the
 *  form's signIn handle is null and a click silently no-ops. */
async function waitForClerk(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      Boolean(
        (window as { Clerk?: { client?: unknown } }).Clerk?.client,
      ),
    null,
    { timeout: 45_000 },
  )
}

/** Full UI sign-up round trip (docs/09 T-A1 steps): your details → proof +
 *  consent → fixed OTP 424242 → lands on /account-status with the pending
 *  badge. The caller runs setupClerkTestingToken({ page }) first. Shared by
 *  T-A1 and T-A10 (which signs back out and signs in again). */
export async function signUpViaUi(
  page: Page,
  opts: { email: string; fullName: string; password?: string },
): Promise<void> {
  const { email, fullName, password = 'E2ePassword123456!' } = opts

  // — step 1 · your details —
  await page.goto('/sign-up')
  await waitForClerk(page)
  await expect(page.getByRole('heading', { name: 'Join CaintaTrade' })).toBeVisible()
  await page.getByLabel(/^Full name/).fill(fullName)
  await page.getByLabel(/^Email address/).fill(email)
  await page.getByLabel(/^Mobile number/).fill('9171234567')
  await page.locator('select').selectOption({ index: 1 }) // first of the 7 barangays
  await page.getByLabel(/^Street/).fill('123 E2E Street')
  await page.getByLabel(/^Password/).fill(password)
  await page.getByRole('button', { name: 'Continue to step 2' }).click()
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 20_000 })

  // — step 2 · proof and consent —
  await page.locator('input[type=file]').setInputFiles('e2e/fixtures/proof.png')
  await expect(page.getByText('Uploaded')).toBeVisible()
  for (let i = 0; i < 3; i++) {
    await page.locator('input[type=checkbox]').nth(i).check()
  }
  await page.getByRole('button', { name: 'Create my account' }).click()

  // — email verification dialog (test addresses use the fixed OTP) —
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  await dialog.getByPlaceholder('6-digit code').fill('424242')
  await page.getByRole('button', { name: 'Verify and continue' }).click()

  // — lands on account-status with the pending badge —
  await expect(page).toHaveURL(/\/account-status/, { timeout: 45_000 })
  await expect(page.getByText('Pending approval', { exact: true }).first()).toBeVisible()
}

/** Resolve the signed-in Clerk user id from the page (falls back to BAPI
 *  lookup by email — `window.Clerk` may still be hydrating). */
export async function currentClerkUserId(page: Page, email?: string): Promise<string | null> {
  const inPage = await page.evaluate(
    () =>
      (window as unknown as { Clerk?: { user?: { id: string } | null } }).Clerk?.user?.id ?? null,
  )
  if (inPage) return inPage
  if (!email) return null
  const found = (await clerkGet(
    `/users?email_address[]=${encodeURIComponent(email)}`,
  )) as { id: string }[]
  return Array.isArray(found) && found.length ? found[0].id : null
}

/** Remove a test user end to end: storage proof, profile rows (cascades to
 *  residency_documents), then the Clerk user itself. */
export async function cleanupTestUser(userId: string): Promise<void> {
  const db = adminDb()
  const folder = safeFolder(userId)
  for (const bucket of ['residency-docs', 'avatars']) {
    const { data: files } = await db.storage.from(bucket).list(folder, { limit: 50 })
    if (files?.length) await db.storage.from(bucket).remove(files.map((f) => `${folder}/${f.name}`))
  }
  await db.from('profiles').delete().eq('id', userId) // cascades residency_documents
  await clerkDelete(`/users/${userId}`)
}

/** Teardown sweep: delete any `cte2e`-marked user a failed run left behind. */
export async function sweepTestUsers(): Promise<number> {
  const res = await clerkGet('/users?limit=250&query=cte2e')
  const list = Array.isArray(res)
    ? res
    : ((res as { data?: unknown[] })?.data ?? [])
  const users = list as { id: string; email_addresses?: { email_address: string }[] }[]
  const stale = users.filter((u) => u.email_addresses?.some((e) => e.email_address.includes('cte2e')))
  for (const u of stale) await cleanupTestUser(u.id)
  return stale.length
}

/** Teardown sweep for the other leak: a test killed at its timeout can lose
 *  the race between its `finally` and worker shutdown — Clerk user deleted
 *  (or swept above) but the Supabase profile row survives, and a name-based
 *  sweep can never find it again. Every fixture profile is named `E2E …`. */
export async function sweepTestProfiles(): Promise<number> {
  const db = adminDb()
  const { data } = await db.from('profiles').select('id').like('full_name', 'E2E %')
  const ids = (data ?? []).map((r) => r.id)
  for (const id of ids) await db.from('profiles').delete().eq('id', id)
  return ids.length
}

/* ── fast fixtures (tests that are not about the sign-up UI) ───────────────── */

/** POST to the Clerk Backend API (create users without the sign-up flow). */
export async function clerkPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${envLocal().CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Clerk POST ${path} → ${res.status}: ${await res.text()}`)
  return res.json()
}

/** Create a user through BAPI with a known password so the sign-in form can
 *  open a session in one step. Tries the detailed email form (verified: true)
 *  first, falls back to the plain address list. */
export async function createUserDirect(
  prefix: string,
): Promise<{ email: string; password: string; userId: string }> {
  const email = testEmail(prefix)
  const password = 'E2ePassword123456!'
  let user: { id: string }
  try {
    user = (await clerkPost('/users', {
      email_address: [{ email_address: email, verified: true, primary: true }],
      password,
      skip_password_checks: true,
      skip_password_requirement: true,
    })) as { id: string }
  } catch {
    user = (await clerkPost('/users', {
      email_address: [email],
      password,
      skip_password_checks: true,
    })) as { id: string }
  }
  return { email, password, userId: user.id }
}

/** Seed the profiles row the Clerk webhook would have created on localhost
 *  (docs/09 §5: the webhook cannot reach the test machine). */
export async function seedProfile(
  userId: string,
  opts: {
    email?: string
    fullName?: string
    status?: 'pending' | 'verified' | 'suspended'
    role?: 'resident' | 'moderator' | 'admin'
  } = {},
): Promise<void> {
  const db = adminDb()
  const { data: brgy } = await db.from('barangays').select('id').order('name').limit(1)
  const { error } = await db.from('profiles').upsert({
    id: userId,
    full_name: opts.fullName ?? 'E2E Resident',
    email: opts.email ?? null,
    status: opts.status ?? 'verified',
    role: opts.role ?? 'resident',
    barangay_id: brgy?.[0]?.id ?? null,
    onboarded_at: new Date().toISOString(),
  })
  if (error) throw new Error(`seedProfile: ${error.message}`)
}

/** A submitted residency proof so approveUser has a document to stamp. */
export async function seedResidencyDoc(userId: string): Promise<void> {
  const db = adminDb()
  const { error } = await db.from('residency_documents').insert({
    user_id: userId,
    storage_path: `${userId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)}/proof.png`,
    status: 'submitted',
  })
  if (error) throw new Error(`seedResidencyDoc: ${error.message}`)
}

/** Seed a listing directly (service role) for flows that are not about the
 *  post-item form itself. */
export async function seedItem(
  ownerId: string,
  title: string,
  opts: { status?: string; expiresAt?: string } = {},
): Promise<{ id: string }> {
  const db = adminDb()
  const [{ data: cats }, { data: brgy }] = await Promise.all([
    db.from('categories').select('id').order('sort_order').limit(1),
    db.from('barangays').select('id').order('name').limit(1),
  ])
  const code = `CT-9${Math.floor(100 + Math.random() * 900)}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`
  const { data, error } = await db
    .from('items')
    .insert({
      code,
      owner_id: ownerId,
      category_id: cats?.[0]?.id ?? null,
      barangay_id: brgy?.[0]?.id ?? null,
      title,
      condition: 'good',
      status: opts.status ?? 'available',
      expires_at: opts.expiresAt ?? new Date(Date.now() + 30 * 86_400_000).toISOString(),
    })
    .select('id')
    .single()
  if (error) throw new Error(`seedItem: ${error.message}`)
  return { id: data.id }
}

/** Establish a signed-in session for an existing account.
 *
 *  The interactive password form itself is covered by T-A10 (same browser as
 *  sign-up). Here we use Clerk's testing ticket via `clerk.signIn`: a password
 *  sign-in from a *fresh* browser context returns the `needs_client_trust`
 *  status (Device Trust — docs/07 follow-up), which the custom form does not
 *  handle yet, so the form would hang. The ticket completes the same session
 *  server-side and keeps these tests focused on the guards they assert. */
export async function openSession(page: Page, email: string): Promise<void> {
  await page.goto('/sign-in')
  await clerk.signIn({ page, emailAddress: email })
}

/** trades.offer_id has no ON DELETE CASCADE — drop a user's trades (ratings
 *  cascade from there) before cleanupTestUser removes the profile. */
export async function cleanupTradeUsers(userIds: string[]): Promise<void> {
  const db = adminDb()
  for (const id of userIds) {
    const { data: offs } = await db
      .from('offers')
      .select('id')
      .or(`from_user_id.eq.${id},to_user_id.eq.${id}`)
    const ids = (offs ?? []).map((o) => o.id)
    if (ids.length) await db.from('trades').delete().in('offer_id', ids)
  }
}
