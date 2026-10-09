import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect, test, type Page } from '@playwright/test'
import {
  adminDb,
  cleanupTestUser,
  cleanupTradeUsers,
  createUserDirect,
  currentClerkUserId,
  ensureClerkTestingEnv,
  envLocal,
  openSession,
  seedItem,
  seedProfile,
  seedResidencyDoc,
  signUpViaUi,
  testEmail,
} from './helpers'

/** docs/09 §1–§5 · member and admin flows (T-A1 → T-R5).
 *
 * What runs and why:
 *  - **T-A1 / T-A10** drive the full Clerk sign-up and sign-in round trips
 *    (fixed OTP 424242, captcha bypass via Clerk Testing Tokens).
 *  - **T-A4, T-A7, T-L\*, T-O\*, T-R\*** use `createUserDirect` (BAPI user +
 *    service-role profile seed) so they start from a known account state and
 *    drive the real screens built in docs/05 §C/§D. Server-side rules that no
 *    UI exposes (confirm-before-meetup, cron jobs) are asserted through the
 *    same SQL functions the actions call.
 *  - The Clerk webhook cannot reach localhost, so profile rows are seeded by
 *    the helpers; the webhook handler itself is covered by
 *    app/api/webhooks/clerk/route.test.ts.
 *
 * Known gaps this file works around (docs/05):
 *  - Supabase Realtime over the Clerk token is not enabled yet, so T-M1
 *    asserts delivery to the partner's thread on refresh rather than a live
 *    push; flip that assertion on when §3.8 unblocks.
 *  - T-R5 (RLS deny on audit writes) lives in
 *    supabase/migrations/999_test_assertions.sql, which runs with every
 *    `db push --include-all`.
 */

/* ── sign-up and sign-in ─────────────────────────────────────────────────── */

test.describe('sign-up to approval (T-A1)', () => {
  test('sign up, verify, onboard, land on pending account status', async ({ page }) => {
    test.setTimeout(150_000)
    ensureClerkTestingEnv()
    await setupClerkTestingToken({ page })

    const email = testEmail('a1')
    const fullName = 'E2E Test Resident'
    let userId: string | null = null

    try {
      await signUpViaUi(page, { email, fullName })
      userId = await currentClerkUserId(page, email)
      expect(userId, 'Clerk user id after sign-up').toBeTruthy()

      // — server state: profile pending, residency document submitted —
      const db = adminDb()
      const { data: profile } = await db
        .from('profiles')
        .select('full_name, status, barangay_id, onboarded_at')
        .eq('id', userId as string)
        .maybeSingle()
      expect(profile).toMatchObject({ full_name: fullName, status: 'pending' })
      expect(profile?.barangay_id).toBeTruthy()
      expect(profile?.onboarded_at).toBeTruthy()

      const { data: docs } = await db
        .from('residency_documents')
        .select('status, storage_path')
        .eq('user_id', userId as string)
      expect(docs?.length).toBe(1)
      expect(docs?.[0].status).toBe('submitted')
      // storage_path is bucket-relative: residency-docs/{clerkId}/{uuid}.png
      expect(docs?.[0].storage_path).toContain(`${userId}/`)
      expect(docs?.[0].storage_path).toMatch(/\.png$/)
    } finally {
      if (!userId) userId = await currentClerkUserId(page, email)
      if (userId) await cleanupTestUser(userId)
    }
  })
})

test.describe('sign-in round trip (T-A10)', () => {
  test('sign out, fail a wrong password, then sign back in with email + password', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    ensureClerkTestingEnv()
    await setupClerkTestingToken({ page })

    const email = testEmail('a10')
    const fullName = 'E2E Signin Resident'
    const password = 'E2ePassword123456!'
    let userId: string | null = null

    try {
      // — a real pending account, created through the sign-up flow —
      await signUpViaUi(page, { email, fullName, password })
      userId = await currentClerkUserId(page, email)
      expect(userId, 'Clerk user id after sign-up').toBeTruthy()

      // — sign out from the avatar menu —
      await page.locator('button[aria-haspopup="true"]').click()
      await page.getByRole('button', { name: 'Sign out' }).click()
      await expect(page).toHaveURL(/\/$/, { timeout: 20_000 })

      // server-side proof the session is gone: a member route bounces to /sign-in
      await page.goto('/account-status')
      await expect(page).toHaveURL(/\/sign-in/, { timeout: 20_000 })

      // — wrong password → error panel + attempt counter (docs/07 error UX) —
      await page.goto('/sign-in')
      await page.getByLabel(/^Email address/).fill(email)
      await page.getByLabel(/^Password/).fill('NotThePassword123!')
      await page.getByRole('button', { name: 'Log in', exact: true }).click()
      await expect(page.getByText('We could not sign you in')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText('failed attempt')).toBeVisible()

      // — right password → completes and lands by profile status —
      await page.getByLabel(/^Password/).fill(password)
      await page.getByRole('button', { name: 'Try again' }).click()
      await expect(page).toHaveURL(/\/account-status/, { timeout: 45_000 })
      await expect(page.getByText('Pending approval', { exact: true }).first()).toBeVisible()

      const sessionId = await page.evaluate(
        () =>
          (window as unknown as { Clerk?: { session?: { id: string } | null } }).Clerk?.session
            ?.id ?? null,
      )
      expect(sessionId, 'Clerk session after sign-in').toBeTruthy()

      // the round trip must not have altered the profile row
      const { data: profile } = await adminDb()
        .from('profiles')
        .select('status, onboarded_at')
        .eq('id', userId as string)
        .maybeSingle()
      expect(profile).toMatchObject({ status: 'pending' })
      expect(profile?.onboarded_at).toBeTruthy()
    } finally {
      if (!userId) userId = await currentClerkUserId(page, email)
      if (userId) await cleanupTestUser(userId)
    }
  })
})

/* ── guards and admin approvals ──────────────────────────────────────────── */

test.describe('protected member route redirects (T-A4)', () => {
  test('never-onboarded → /onboarding; pending → /account-status; verified → /home', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    ensureClerkTestingEnv()
    await setupClerkTestingToken({ page })

    const { email, userId } = await createUserDirect('a4')
    try {
      await openSession(page, email)

      // no profile row yet → the layout guard sends the session to onboarding
      await page.goto('/home')
      await expect(page).toHaveURL(/\/onboarding/)

      // pending profile → account status instead of the dashboard
      await seedProfile(userId, { status: 'pending', email })
      await page.goto('/home')
      await expect(page).toHaveURL(/\/account-status/)

      // verified → the real dashboard
      await adminDb().from('profiles').update({ status: 'verified' }).eq('id', userId)
      await page.goto('/home')
      await expect(page).toHaveURL(/\/home/)
      await expect(page.getByRole('heading', { name: /^Hello,/ })).toBeVisible()
    } finally {
      await cleanupTestUser(userId)
    }
  })
})

test.describe('admin approves (T-A7) and audits (T-R4)', () => {
  test('approve → verified, approved_at, delete_after +90 d, audit row', async ({ page }) => {
    test.setTimeout(180_000)
    ensureClerkTestingEnv()
    await setupClerkTestingToken({ page })

    const candName = 'E2E Candidate A7'
    const cand = await createUserDirect('a7c')
    const adm = await createUserDirect('a7a')
    await seedProfile(cand.userId, { status: 'pending', email: cand.email, fullName: candName })
    await seedResidencyDoc(cand.userId)
    await seedProfile(adm.userId, {
      status: 'verified',
      role: 'admin',
      email: adm.email,
      fullName: 'E2E Admin A7',
    })

    try {
      await openSession(page, adm.email)
      await page.goto('/admin')
      await expect(page).toHaveURL(/\/admin/)

      await page.goto(`/admin/users?status=pending&q=${encodeURIComponent(candName)}`)
      const row = page.locator('li').filter({ hasText: candName })
      await expect(row).toHaveCount(1)
      await row.getByRole('button', { name: 'Approve', exact: true }).click()
      await expect(page.getByText('Resident approved — email sent')).toBeVisible({
        timeout: 30_000,
      })

      const db = adminDb()
      const { data: profile } = await db
        .from('profiles')
        .select('status, approved_at, approved_by')
        .eq('id', cand.userId)
        .maybeSingle()
      expect(profile?.status).toBe('verified')
      expect(profile?.approved_at).toBeTruthy()
      expect(profile?.approved_by).toBe(adm.userId)

      // residency proof stamped with the 90-day deletion clock (docs/11 §5)
      const { data: doc } = await db
        .from('residency_documents')
        .select('status, reviewed_by, delete_after')
        .eq('user_id', cand.userId)
        .single()
      expect(doc?.status).toBe('approved')
      expect(doc?.reviewed_by).toBe(adm.userId)
      const want = Date.now() + 90 * 86_400_000
      expect(Math.abs(new Date(doc!.delete_after as string).getTime() - want)).toBeLessThan(
        10 * 60_000,
      )

      // every admin write creates an audit row (docs/09 T-R4)
      const { data: audit } = await db
        .from('admin_actions')
        .select('id')
        .eq('action', 'user_approved')
        .eq('subject_id', cand.userId)
        .eq('admin_id', adm.userId)
      expect(audit?.length).toBe(1)
    } finally {
      await cleanupTestUser(cand.userId)
      await cleanupTestUser(adm.userId)
    }
  })
})

/* ── listings ────────────────────────────────────────────────────────────── */

test.describe('listing lifecycle (T-L1, T-L2, T-L3, T-L5)', () => {
  test('publish with photos, 9th photo blocked, 81-char title refused, renew +30 d', async ({
    page,
  }) => {
    test.setTimeout(300_000)
    ensureClerkTestingEnv()
    await setupClerkTestingToken({ page })

    const res = await createUserDirect('l1')
    await seedProfile(res.userId, { status: 'verified', email: res.email, fullName: 'E2E Listmaker' })
    const db = adminDb()

    try {
      await openSession(page, res.email)
      await page.goto('/home')
      await expect(page).toHaveURL(/\/home/)

      // — T-L1: publish → live with expires_at = now + 30 d —
      await page.goto('/items/new')
      await page.getByLabel(/^Listing title/).fill('E2E Lovely Sofa Bed')
      await page.getByLabel(/^Description/).fill('A comfy sofa bed, E2E run only.')
      await page.getByLabel(/^Category/).selectOption({ index: 1 })
      await page.getByLabel(/^Condition/).selectOption('good')
      await page.getByLabel(/^Your barangay/).selectOption({ index: 1 })
      await page.getByRole('button', { name: 'Publish listing' }).click()
      await expect(page).toHaveURL(/\/items\/[0-9a-f-]+\/edit\?created=live/, {
        timeout: 30_000,
      })
      const itemId = page.url().match(/\/items\/([0-9a-f-]+)\/edit/)![1]

      const { data: item } = await db
        .from('items')
        .select('status, expires_at')
        .eq('id', itemId)
        .single()
      expect(item?.status).toBe('available')
      expect(
        Math.abs(new Date(item!.expires_at as string).getTime() - (Date.now() + 30 * 86_400_000)),
      ).toBeLessThan(5 * 60_000)

      // — photos (edit step): 3 uploads land, the 8th fills the cap —
      const fileInput = page.locator('input[accept="image/jpeg,image/png"]')
      const photoCount = async () =>
        (
          await db
            .from('item_photos')
            .select('id', { count: 'exact', head: true })
            .eq('item_id', itemId)
        ).count ?? 0
      for (let n = 1; n <= 8; n++) {
        await fileInput.setInputFiles('e2e/fixtures/proof.png')
        await expect.poll(photoCount, { timeout: 30_000 }).toBe(n)
      }
      // T-L2: a 9th photo is refused — the picker is full
      await expect(fileInput).toBeDisabled()
      await expect(page.getByText('Up to 8, JPG or PNG')).toBeVisible()

      // — T-L3: an 81-character title is refused client-side before any insert —
      await page.goto('/items/new')
      await page.getByLabel(/^Listing title/).fill('x'.repeat(81))
      await page.getByLabel(/^Category/).selectOption({ index: 1 })
      await page.getByLabel(/^Your barangay/).selectOption({ index: 1 })
      await page.getByRole('button', { name: 'Publish listing' }).click()
      await expect(page.getByText('Keep the title to 80 characters.')).toBeVisible()
      await expect(page).toHaveURL(/\/items\/new/)
      const { count: stillOne } = await db
        .from('items')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', res.userId)
      expect(stillOne).toBe(1)

      // — T-L5: renew pushes the deadline out another 30 days —
      await page.goto('/my-listings')
      await page.getByRole('button', { name: 'Renew', exact: true }).click()
      await expect(page.getByText(/Renewed — now live until/)).toBeVisible({ timeout: 20_000 })
      const { data: after } = await db
        .from('items')
        .select('expires_at')
        .eq('id', itemId)
        .single()
      expect(
        Math.abs(new Date(after!.expires_at as string).getTime() - (Date.now() + 30 * 86_400_000)),
      ).toBeLessThan(5 * 60_000)
    } finally {
      await cleanupTestUser(res.userId)
    }
  })
})

test.describe('foreign listing edit (T-L4)', () => {
  test("editing someone else's listing lands on the 403 page", async ({ page }) => {
    test.setTimeout(150_000)
    ensureClerkTestingEnv()
    await setupClerkTestingToken({ page })

    const owner = await createUserDirect('l4o')
    const viewer = await createUserDirect('l4v')
    await seedProfile(owner.userId, { status: 'verified', email: owner.email, fullName: 'E2E Owner L4' })
    await seedProfile(viewer.userId, {
      status: 'verified',
      email: viewer.email,
      fullName: 'E2E Viewer L4',
    })
    const { id: itemId } = await seedItem(owner.userId, 'E2E Private Lute')

    try {
      await openSession(page, viewer.email)
      await page.goto(`/items/${itemId}/edit`)

      await expect(page.getByText('You do not have access to this page')).toBeVisible()
      await expect(page.getByText(/CT-403-/)).toBeVisible()
      // the edit form itself never rendered
      await expect(page.getByLabel('Listing title')).toHaveCount(0)
    } finally {
      await cleanupTestUser(viewer.userId)
      await cleanupTestUser(owner.userId)
    }
  })
})

test.describe('expiry cron (T-L6)', () => {
  test('expire-listings expires the overdue item and sends the reminder', async () => {
    test.setTimeout(120_000)
    ensureClerkTestingEnv()

    const owner = await createUserDirect('l6')
    await seedProfile(owner.userId, {
      status: 'verified',
      email: owner.email,
      fullName: 'E2E Expiry Owner',
    })
    const db = adminDb()

    try {
      const stale = await seedItem(owner.userId, 'E2E Stale Clock', {
        expiresAt: new Date(Date.now() - 3600_000).toISOString(),
      })
      const soon = await seedItem(owner.userId, 'E2E Soon Clock', {
        expiresAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      })

      const base = envLocal().NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const res = await fetch(`${base}/api/cron/expire-listings`, {
        headers: { Authorization: `Bearer ${envLocal().CRON_SECRET}` },
      })
      expect(res.status, await res.text()).toBe(200)

      const { data: rows } = await db.from('items').select('id, status').in('id', [stale.id, soon.id])
      expect(rows?.find((r) => r.id === stale.id)?.status).toBe('expired')
      expect(rows?.find((r) => r.id === soon.id)?.status).toBe('available')

      // the same run sends the one-time expiry reminder (docs/03 §3.14 — the
      // cron's notification work; the drop itself is silent by design)
      const { data: notes } = await db
        .from('notifications')
        .select('id, title')
        .eq('user_id', owner.userId)
        .eq('type', 'listing_expiring')
      expect((notes ?? []).length).toBeGreaterThanOrEqual(1)
    } finally {
      await cleanupTestUser(owner.userId)
    }
  })
})

/* ── offers and trades ───────────────────────────────────────────────────── */

/** Publish a listing through C10 and return the new item id. */
async function publishListing(page: Page, title: string): Promise<string> {
  await page.goto('/items/new')
  await page.getByLabel(/^Listing title/).fill(title)
  await page.getByLabel(/^Description/).fill('For the E2E trade run.')
  await page.getByLabel(/^Category/).selectOption({ index: 1 })
  await page.getByLabel(/^Condition/).selectOption('good')
  await page.getByLabel(/^Your barangay/).selectOption({ index: 1 })
  await page.getByRole('button', { name: 'Publish listing' }).click()
  await expect(page).toHaveURL(/\/items\/[0-9a-f-]+\/edit\?created=live/, { timeout: 30_000 })
  return page.url().match(/\/items\/([0-9a-f-]+)\/edit/)![1]
}

/** A sent-message bubble inside the thread's live region — never the
 *  composer: `getByText` also matches a React-controlled textarea's value, so
 *  an unscoped assertion passes before the send has landed. */
function threadBubble(page: Page, text: string) {
  return page.locator('[aria-live="polite"] p', { hasText: text })
}

const pad = (n: number) => String(n).padStart(2, '0')
function localDateTime(msFromNow: number): string {
  const d = new Date(Date.now() + msFromNow)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

test.describe('full trade (T-O1 → T-O4, T-O6, T-O7, T-M1)', () => {
  test('two verified residents negotiate, meet up and complete a swap', async ({ browser }) => {
    test.setTimeout(480_000)
    ensureClerkTestingEnv()

    const A = await createUserDirect('oa')
    const B = await createUserDirect('ob')
    const C = await createUserDirect('oc')
    await seedProfile(A.userId, { status: 'verified', email: A.email, fullName: 'E2E Alice Trader' })
    await seedProfile(B.userId, { status: 'verified', email: B.email, fullName: 'E2E Bob Trader' })
    await seedProfile(C.userId, { status: 'verified', email: C.email, fullName: 'E2E Cara Trader' })

    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const ctxC = await browser.newContext()
    const pA = await ctxA.newPage()
    const pB = await ctxB.newPage()
    const pC = await ctxC.newPage()
    const db = adminDb()

    try {
      for (const [page, creds] of [
        [pA, A],
        [pB, B],
        [pC, C],
      ] as const) {
        await setupClerkTestingToken({ page })
        await openSession(page, creds.email)
      }

      // — both sides list something (C10 → C11) —
      const bItem = await publishListing(pB, 'E2E Bob Saxophone')
      const aItem = await publishListing(pA, 'E2E Alice Amplifier')
      await publishListing(pC, 'E2E Cara Pedal')

      // T-O1: nobody can offer an item for itself
      await pA.goto(`/items/${aItem}/offer`)
      await expect(pA.getByText('This is your own listing')).toBeVisible()

      // Alice sends an offer for Bob's listing (C15)
      await pA.goto(`/items/${bItem}/offer`)
      await pA.locator('label', { hasText: 'E2E Alice Amplifier' }).click()
      await pA.getByRole('button', { name: 'Send offer' }).click()
      await expect(pA).toHaveURL(/\/offers\?view=sent/, { timeout: 30_000 })

      const { data: created } = await db
        .from('offers')
        .select('id, status, from_user_id, to_user_id, wanted_item_id, offered_item_id, expires_at')
        .eq('wanted_item_id', bItem)
      expect(created).toHaveLength(1)
      const offerId = created![0].id
      expect(created![0]).toMatchObject({
        status: 'pending',
        from_user_id: A.userId,
        to_user_id: B.userId,
        offered_item_id: aItem,
      })
      // offers expire after 3 days (docs/04 · offer lifecycle)
      expect(
        new Date(created![0].expires_at as string).getTime() - Date.now(),
      ).toBeGreaterThan(2 * 86_400_000)

      // T-O3: a second offer on the same wanted item is refused
      await pC.goto(`/items/${bItem}/offer`)
      await pC.locator('label', { hasText: 'E2E Cara Pedal' }).click()
      await pC.getByRole('button', { name: 'Send offer' }).click()
      await expect(
        pC.getByText('Someone already has an active offer on that item.'),
      ).toBeVisible({ timeout: 30_000 })
      const { count: stillOne } = await db
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('wanted_item_id', bItem)
      expect(stillOne).toBe(1)

      // T-O4: Bob accepts → both items pending, trade created
      await pB.goto('/offers?view=received')
      await pB
        .locator('li')
        .filter({ hasText: 'E2E Alice Amplifier' })
        .getByRole('button', { name: 'Accept', exact: true })
        .click()
      await expect(pB.getByText('Offer accepted — the trade is open')).toBeVisible({
        timeout: 30_000,
      })

      const { data: accepted } = await db
        .from('offers')
        .select('status')
        .eq('id', offerId)
        .single()
      expect(accepted?.status).toBe('accepted')
      const { data: reserved } = await db
        .from('items')
        .select('id, status')
        .in('id', [aItem, bItem])
      expect(reserved?.every((i) => i.status === 'pending')).toBe(true)
      const { data: trade } = await db
        .from('trades')
        .select('id, status, meetup_at')
        .eq('offer_id', offerId)
        .single()
      expect(trade).toBeTruthy()
      expect(trade?.status).toBe('meetup_pending')

      // T-O2: the reserved listing refuses further offers
      await pC.goto(`/items/${bItem}/offer`)
      await expect(pC.getByText('Offers are closed on this listing')).toBeVisible()

      // T-O6 (server rule): confirming with no meetup agreed is rejected
      const noMeetup = await db.rpc('confirm_trade', {
        p_trade_id: trade!.id,
        p_requester: A.userId,
      })
      expect(String(noMeetup.error?.message ?? '')).toContain('MEETUP_NOT_SET')

      // T-M1: a message reaches the partner's thread (Realtime push is
      // deferred per docs/05 §3.8 — the partner sees it on refresh)
      await pA.goto(`/messages/${offerId}`)
      await pB.goto(`/messages/${offerId}`)
      await pA.getByLabel('Message').fill('E2E: plaza at noon, bring the strap?')
      await pA.getByRole('button', { name: 'Send' }).click()
      // scoped to the message bubbles: getByText also matches the composer
      // textarea (React mirrors its value into the DOM), which would pass
      // before the send has even landed
      await expect(threadBubble(pA, 'E2E: plaza at noon, bring the strap?')).toBeVisible({
        timeout: 20_000,
      })
      await pB.reload()
      await expect(threadBubble(pB, 'E2E: plaza at noon, bring the strap?')).toBeVisible({
        timeout: 20_000,
      })

      // Bob sets the meetup — place and a future time (C17)
      await pB.goto(`/trades/${trade!.id}`)
      await pB.getByRole('button', { name: 'Set a meetup' }).click()
      await pB.getByLabel(/^Spot/).selectOption({ index: 1 })
      await pB.getByLabel(/^Date and time/).fill(localDateTime(45 * 60_000))
      await pB.getByRole('button', { name: 'Save meetup' }).click()
      await expect(pB.getByText('Meetup updated — both sides were notified')).toBeVisible({
        timeout: 30_000,
      })
      const { data: meetup } = await db
        .from('trades')
        .select('meetup_at, meetup_spot_id, status')
        .eq('id', trade!.id)
        .single()
      expect(meetup?.meetup_at).toBeTruthy()
      expect(meetup?.meetup_spot_id).toBeTruthy()

      // T-O6 (server rule): confirming before the agreed time is rejected
      const tooEarly = await db.rpc('confirm_trade', {
        p_trade_id: trade!.id,
        p_requester: A.userId,
      })
      expect(String(tooEarly.error?.message ?? '')).toContain('MEETUP_NOT_DUE')

      // the agreed time passes → both sides confirm → completed (T-O7)
      await db
        .from('trades')
        .update({ meetup_at: new Date(Date.now() - 60_000).toISOString() })
        .eq('id', trade!.id)

      await pB.goto(`/trades/${trade!.id}`)
      await pB.getByRole('button', { name: 'I picked up my side' }).click()
      await expect(pB.getByRole('button', { name: 'You confirmed' })).toBeVisible({
        timeout: 20_000,
      })

      await pA.goto(`/trades/${trade!.id}`)
      await pA.getByRole('button', { name: 'I picked up my side' }).click()
      await expect(pA.getByText('Rate this trade')).toBeVisible({ timeout: 30_000 })

      const { data: done } = await db
        .from('trades')
        .select('status, completed_at, owner_confirmed_at, requester_confirmed_at')
        .eq('id', trade!.id)
        .single()
      expect(done?.status).toBe('completed')
      expect(done?.completed_at).toBeTruthy()
      expect(done?.owner_confirmed_at).toBeTruthy()
      expect(done?.requester_confirmed_at).toBeTruthy()
      const { data: exchanged } = await db.from('items').select('status').in('id', [aItem, bItem])
      expect(exchanged?.every((i) => i.status === 'exchanged')).toBe(true)

      // rating prompt works: Alice rates the swap 5/5
      await pA.getByRole('button', { name: '5 stars' }).click()
      await pA.getByLabel(/^Comment/).fill('Solid trade, thanks Bob!')
      await pA.getByRole('button', { name: 'Save rating' }).click()
      await expect(pA.getByText(/You rated this trade 5\/5/)).toBeVisible({ timeout: 20_000 })
      const { data: ratings } = await db.from('ratings').select('stars, rater_id').eq('trade_id', trade!.id)
      expect(ratings?.[0]).toMatchObject({ stars: 5, rater_id: A.userId })
    } finally {
      await cleanupTradeUsers([A.userId, B.userId, C.userId])
      await Promise.all([A, B, C].map((u) => cleanupTestUser(u.userId)))
      await Promise.all([ctxA, ctxB, ctxC].map((c) => c.close()))
    }
  })
})

test.describe('cancel after accept (T-O5)', () => {
  test('the sender unwinds the trade — both items available again', async ({ browser }) => {
    test.setTimeout(360_000)
    ensureClerkTestingEnv()

    const A = await createUserDirect('o5a')
    const B = await createUserDirect('o5b')
    await seedProfile(A.userId, { status: 'verified', email: A.email, fullName: 'E2E Cara Seller' })
    await seedProfile(B.userId, { status: 'verified', email: B.email, fullName: 'E2E Dev Buyer' })

    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pA = await ctxA.newPage()
    const pB = await ctxB.newPage()
    const db = adminDb()

    try {
      await setupClerkTestingToken({ page: pA })
      await setupClerkTestingToken({ page: pB })
      await openSession(pA, A.email)
      await openSession(pB, B.email)

      const bItem = await publishListing(pB, 'E2E Dev Violin')
      const aItem = await publishListing(pA, 'E2E Cara Bow')

      await pA.goto(`/items/${bItem}/offer`)
      await pA.locator('label', { hasText: 'E2E Cara Bow' }).click()
      await pA.getByRole('button', { name: 'Send offer' }).click()
      await expect(pA).toHaveURL(/\/offers\?view=sent/, { timeout: 30_000 })

      const { data: offer } = await db
        .from('offers')
        .select('id')
        .eq('wanted_item_id', bItem)
        .single()

      await pB.goto('/offers?view=received')
      await pB
        .locator('li')
        .filter({ hasText: 'E2E Cara Bow' })
        .getByRole('button', { name: 'Accept', exact: true })
        .click()
      await expect(pB.getByText('Offer accepted — the trade is open')).toBeVisible({
        timeout: 30_000,
      })
      const { data: reserved } = await db.from('items').select('status').in('id', [aItem, bItem])
      expect(reserved?.every((i) => i.status === 'pending')).toBe(true)

      // the sender cancels from the closed view (docs/02 C16 Cancel)
      await pA.goto('/offers?view=closed')
      await pA
        .locator('li')
        .filter({ hasText: 'E2E Dev Violin' })
        .getByRole('button', { name: 'Cancel trade' })
        .click()
      await expect(
        pA.getByText('Trade cancelled — both items are available again'),
      ).toBeVisible({ timeout: 30_000 })

      // items reopen, the trade records who cancelled and why
      const { data: reopened } = await db.from('items').select('status').in('id', [aItem, bItem])
      expect(reopened?.every((i) => i.status === 'available')).toBe(true)
      const { data: after } = await db
        .from('offers')
        .select('status, responded_at')
        .eq('id', offer!.id)
        .single()
      expect(after?.status).toBe('cancelled')
      const { data: tr } = await db
        .from('trades')
        .select('status, cancel_reason, cancelled_by')
        .eq('offer_id', offer!.id)
        .single()
      expect(tr?.status).toBe('cancelled')
      expect(tr?.cancelled_by).toBe(A.userId)
      expect(tr?.cancel_reason).toBeTruthy()

      // the other side is told
      const { data: note } = await db
        .from('notifications')
        .select('id')
        .eq('user_id', B.userId)
        .eq('type', 'offer_cancelled')
      expect((note ?? []).length).toBeGreaterThanOrEqual(1)
    } finally {
      await cleanupTradeUsers([A.userId, B.userId])
      await Promise.all([A, B].map((u) => cleanupTestUser(u.userId)))
      await Promise.all([ctxA, ctxB].map((c) => c.close()))
    }
  })
})

test.describe('dispute (T-O8)', () => {
  test('either party disputes — trade pauses and moderators are notified', async ({ browser }) => {
    test.setTimeout(240_000)
    ensureClerkTestingEnv()

    const A = await createUserDirect('o8a')
    const B = await createUserDirect('o8b')
    const mod = await createUserDirect('o8m')
    await seedProfile(A.userId, { status: 'verified', email: A.email, fullName: 'E2E Disputer' })
    await seedProfile(B.userId, { status: 'verified', email: B.email, fullName: 'E2E Partner' })
    await seedProfile(mod.userId, {
      status: 'verified',
      role: 'moderator',
      email: mod.email,
      fullName: 'E2E Moderator O8',
    })

    const ctxA = await browser.newContext()
    const pA = await ctxA.newPage()
    const db = adminDb()

    try {
      // seed the accepted trade through the same SQL the UI calls
      const itemB = await seedItem(B.userId, 'E2E Dispute Sax')
      const itemA = await seedItem(A.userId, 'E2E Dispute Amp')
      const { data: offerId, error: offerErr } = await db.rpc('create_offer', {
        p_wanted: itemB.id,
        p_offered: itemA.id,
        p_requester: A.userId,
      })
      expect(offerErr).toBeNull()
      const { data: tradeId, error: tradeErr } = await db.rpc('accept_offer', {
        p_offer_id: offerId,
        p_requester: B.userId,
      })
      expect(tradeErr).toBeNull()

      await setupClerkTestingToken({ page: pA })
      await openSession(pA, A.email)
      await pA.goto(`/trades/${tradeId}`)
      await pA.getByRole('button', { name: 'Report a problem' }).click()
      await pA.getByLabel(/^What happened/).fill('We met at the plaza but they left immediately.')
      await pA.getByRole('button', { name: 'File dispute' }).click()
      await expect(pA.getByText('Dispute filed — a moderator will review it')).toBeVisible({
        timeout: 30_000,
      })

      const { data: tr } = await db.from('trades').select('status, meetup_note').eq('id', tradeId).single()
      expect(tr?.status).toBe('disputed')
      expect(tr?.meetup_note).toContain('plaza')

      // every moderator/admin was notified (docs/09 T-O8)
      const { data: notes } = await db
        .from('notifications')
        .select('id')
        .eq('user_id', mod.userId)
        .eq('type', 'trade_disputed')
      expect((notes ?? []).length).toBeGreaterThanOrEqual(1)
    } finally {
      await cleanupTradeUsers([A.userId, B.userId])
      await Promise.all([A, B, mod].map((u) => cleanupTestUser(u.userId)))
      await ctxA.close()
    }
  })
})

test.describe('offer expiry (T-O9)', () => {
  test('the cron expires offers past their 3-day window', async () => {
    test.setTimeout(120_000)
    ensureClerkTestingEnv()

    const A = await createUserDirect('o9a')
    const B = await createUserDirect('o9b')
    await seedProfile(A.userId, { status: 'verified', email: A.email })
    await seedProfile(B.userId, { status: 'verified', email: B.email })
    const db = adminDb()

    try {
      const itemB = await seedItem(B.userId, 'E2E Silent Violin')
      const itemA = await seedItem(A.userId, 'E2E Silent Case')
      const past = new Date(Date.now() - 4 * 86_400_000).toISOString()
      const { data: offer, error } = await db
        .from('offers')
        .insert({
          wanted_item_id: itemB.id,
          offered_item_id: itemA.id,
          from_user_id: A.userId,
          to_user_id: B.userId,
          status: 'pending',
          created_at: past,
          expires_at: new Date(Date.now() - 86_400_000).toISOString(),
        })
        .select('id')
        .single()
      expect(error).toBeNull()

      const base = envLocal().NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const res = await fetch(`${base}/api/cron/expire-offers`, {
        headers: { Authorization: `Bearer ${envLocal().CRON_SECRET}` },
      })
      expect(res.status, await res.text()).toBe(200)

      const { data: after } = await db.from('offers').select('status').eq('id', offer!.id).single()
      expect(after?.status).toBe('expired')
    } finally {
      await cleanupTradeUsers([A.userId, B.userId])
      await Promise.all([A, B].map((u) => cleanupTestUser(u.userId)))
    }
  })
})

/* ── moderation ──────────────────────────────────────────────────────────── */

test.describe('report to resolution (T-R1 → T-R4)', () => {
  test('an anonymous listing report never reveals the reporter (T-R1)', async ({ browser }) => {
    test.setTimeout(180_000)
    ensureClerkTestingEnv()

    const reporter = await createUserDirect('r1a')
    const owner = await createUserDirect('r1b')
    const reporterName = 'E2E Reporter R1'
    await seedProfile(reporter.userId, {
      status: 'verified',
      email: reporter.email,
      fullName: reporterName,
    })
    await seedProfile(owner.userId, { status: 'verified', email: owner.email, fullName: 'E2E Reported Owner' })
    const { id: itemId } = await seedItem(owner.userId, 'E2E Dodgy Listing')

    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const db = adminDb()

    try {
      await setupClerkTestingToken({ page })
      await openSession(page, reporter.email)

      await page.goto(`/report?type=listing&id=${itemId}`)
      await page
        .locator('label')
        .filter({ hasText: 'Keep my report anonymous' })
        .click()
      await page.getByLabel(/^Details/).fill('E2E: they never showed up at the agreed place.')
      await page.getByRole('button', { name: 'File this report' }).click()
      await expect(page.getByText('Report received')).toBeVisible({ timeout: 30_000 })

      const { data: reports } = await db
        .from('reports')
        .select('reporter_id, is_anonymous, status, target_id, reason')
        .eq('target_id', itemId)
      expect(reports).toHaveLength(1)
      expect(reports![0]).toMatchObject({
        reporter_id: reporter.userId,
        is_anonymous: true,
        status: 'open',
        reason: 'not_as_described',
      })

      // the reported member has no channel to the reporter: nothing delivered
      // to them mentions who reported (docs/09 T-R1)
      const { data: notes } = await db
        .from('notifications')
        .select('title, body, link')
        .eq('user_id', owner.userId)
      for (const n of notes ?? []) {
        const blob = JSON.stringify(n)
        expect(blob).not.toContain(reporter.userId)
        expect(blob).not.toContain(reporterName)
      }
    } finally {
      await ctx.close()
      await Promise.all([reporter, owner].map((u) => cleanupTestUser(u.userId)))
    }
  })

  test('removing a listing with an accepted offer cancels the trade (T-R2)', async ({
    browser,
  }) => {
    test.setTimeout(300_000)
    ensureClerkTestingEnv()

    const A = await createUserDirect('r2a')
    const B = await createUserDirect('r2b')
    const adm = await createUserDirect('r2m')
    await seedProfile(A.userId, { status: 'verified', email: A.email, fullName: 'E2E Trader R2A' })
    await seedProfile(B.userId, { status: 'verified', email: B.email, fullName: 'E2E Trader R2B' })
    await seedProfile(adm.userId, {
      status: 'verified',
      role: 'admin',
      email: adm.email,
      fullName: 'E2E Admin R2',
    })

    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const db = adminDb()

    try {
      // an accepted trade sitting on Bob's listing
      const itemB = await seedItem(B.userId, 'E2E Removed Sax')
      const itemA = await seedItem(A.userId, 'E2E Removed Amp')
      const { data: offerId, error: e1 } = await db.rpc('create_offer', {
        p_wanted: itemB.id,
        p_offered: itemA.id,
        p_requester: A.userId,
      })
      expect(e1).toBeNull()
      const { data: tradeId, error: e2 } = await db.rpc('accept_offer', {
        p_offer_id: offerId,
        p_requester: B.userId,
      })
      expect(e2).toBeNull()

      // admin removes it from the listings queue
      await setupClerkTestingToken({ page })
      await openSession(page, adm.email)
      await page.goto('/admin')
      await expect(page).toHaveURL(/\/admin/)
      await page.goto('/admin/listings?status=pending')
      await page
        .locator('li')
        .filter({ hasText: 'E2E Removed Sax' })
        .getByRole('button', { name: 'Remove', exact: true })
        .click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await dialog.getByLabel(/^Reason/).fill('E2E: listing breaks the rules.')
      await dialog.getByRole('button', { name: 'Remove listing' }).click()
      await expect(page.getByText('Listing removed — owner notified')).toBeVisible({
        timeout: 30_000,
      })

      // the trade is cancelled, both items reopen, both parties are told
      const { data: rows } = await db.from('items').select('id, status').in('id', [itemA.id, itemB.id])
      expect(rows?.find((r) => r.id === itemB.id)?.status).toBe('removed')
      expect(rows?.find((r) => r.id === itemA.id)?.status).toBe('available')
      const { data: offer } = await db
        .from('offers')
        .select('status')
        .eq('id', offerId)
        .single()
      expect(offer?.status).toBe('cancelled')
      const { data: tr } = await db
        .from('trades')
        .select('status, cancel_reason, cancelled_by')
        .eq('id', tradeId)
        .single()
      expect(tr?.status).toBe('cancelled')
      expect(tr?.cancel_reason).toContain('Listing removed')
      expect(tr?.cancelled_by).toBe(adm.userId)
      for (const uid of [A.userId, B.userId]) {
        const { data: notes } = await db
          .from('notifications')
          .select('id')
          .eq('user_id', uid)
          .eq('type', 'listing_removed')
        expect((notes ?? []).length).toBeGreaterThanOrEqual(1)
      }

      // and the write is audited (T-R4)
      const { data: audit } = await db
        .from('admin_actions')
        .select('id')
        .eq('action', 'listing_removed')
        .eq('subject_id', itemB.id)
        .eq('admin_id', adm.userId)
      expect(audit?.length).toBe(1)
    } finally {
      await cleanupTradeUsers([A.userId, B.userId])
      // owner rows first: items.cascade carries removed_by with them
      await Promise.all([A, B, adm].map((u) => cleanupTestUser(u.userId)))
      await ctx.close()
    }
  })

  test('a moderator gets 403 on admin-only pages (T-R3)', async ({ browser }) => {
    test.setTimeout(180_000)
    ensureClerkTestingEnv()

    const mod = await createUserDirect('r3')
    await seedProfile(mod.userId, {
      status: 'verified',
      role: 'moderator',
      email: mod.email,
      fullName: 'E2E Moderator R3',
    })

    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    try {
      await setupClerkTestingToken({ page })
      await openSession(page, mod.email)
      await page.goto('/admin')
      await expect(page).toHaveURL(/\/admin/)

      for (const path of ['/admin/audit', '/admin/categories', '/admin/settings']) {
        await page.goto(path)
        await expect(page.getByText('You do not have access to this page')).toBeVisible()
        await expect(page.getByText(/CT-403-/)).toBeVisible()
      }

      // the shared console still works for moderators
      await page.goto('/admin')
      await expect(page.getByText('You do not have access to this page')).toHaveCount(0)
      await expect(page).toHaveURL(/\/admin/)
    } finally {
      await ctx.close()
      await cleanupTestUser(mod.userId)
    }
  })
})

/* ── realtime (T-M1 live) ────────────────────────────────────────────── */

/** Resolves once a supabase realtime socket has joined a channel AND been
 *  re-authenticated: the socket opens with only the anon apikey, the channel
 *  joins, then an `access_token` message carries the Clerk `supabase` JWT and
 *  the server re-registers the subscription ("Subscribed to PostgreSQL" after
 *  the token). Waiting on those frames instead of a fixed sleep keeps the
 *  delivery assertion honest — only a real push can land inside the timeout.
 *
 *  The server sends exactly two "Subscribed" acks: one for the ANON
 *  registration created at join, one for the post-token re-registration
 *  (~2.9s after the access_token frame). The ack often arrives AFTER the
 *  token push (the token fetch can beat the join's registration work), so
 *  "first ack after tokenSent" is unreliable — it can be the anon ack,
 *  after which a message would be inserted while claims are still anon and
 *  RLS would silently drop it. Wait for the SECOND ack, and require that the
 *  token was actually pushed before it. */
function waitForAuthedSubscribe(page: Page, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let tokenSent = false
    let sockets = 0
    let subscribed = 0
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            `realtime auth wait timed out (${label}): sockets=${sockets} tokenSent=${tokenSent} subscribed=${subscribed}`,
          ),
        ),
      30_000,
    )
    page.on('websocket', (ws) => {
      if (!ws.url().includes('/realtime/')) return
      sockets += 1
      ws.on('framesent', (f) => {
        if (typeof f.payload === 'string' && f.payload.includes('"access_token"')) tokenSent = true
      })
      ws.on('framereceived', (f) => {
        const s = typeof f.payload === 'string' ? f.payload : ''
        if (s.includes('Subscribed to PostgreSQL')) subscribed += 1
        if (tokenSent && subscribed >= 2) {
          clearTimeout(timer)
          resolve()
        }
      })
    })
  })
}

test.describe('realtime messaging (T-M1 live)', () => {
  test('a sent message and a new notification stream to an open screen', async ({
    browser,
  }) => {
    test.setTimeout(240_000)
    ensureClerkTestingEnv()

    const A = await createUserDirect('m1a')
    const B = await createUserDirect('m1b')
    await seedProfile(A.userId, { status: 'verified', email: A.email, fullName: 'E2E Mia Sender' })
    await seedProfile(B.userId, { status: 'verified', email: B.email, fullName: 'E2E Ben Receiver' })

    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pA = await ctxA.newPage()
    const pB = await ctxB.newPage()
    const db = adminDb()

    try {
      await setupClerkTestingToken({ page: pA })
      await setupClerkTestingToken({ page: pB })
      await openSession(pA, A.email)
      await openSession(pB, B.email)

      const itemB = await seedItem(B.userId, 'E2E Realtime Item')
      const itemA = await seedItem(A.userId, 'E2E Realtime Offer')
      const { data: offerId, error } = await db.rpc('create_offer', {
        p_wanted: itemB.id,
        p_offered: itemA.id,
        p_requester: A.userId,
      })
      expect(error).toBeNull()

      // both sides open the thread before anything is sent — no reload after
      const bThreadReady = waitForAuthedSubscribe(pB, 'thread')
      // wire-level receipt: the postgres_changes INSERT frame on B's socket
      let bWireFrame = false
      const bFrames: string[] = []
      const bWire: string[] = []
      let bRealtimeSockets = 0
      pB.on('websocket', (ws) => {
        if (!ws.url().includes('/realtime/')) return
        bRealtimeSockets += 1
        ws.on('close', () => bWire.push(`${Date.now()} CLOSE`))
        ws.on('framesent', (f) => {
          const s = typeof f.payload === 'string' ? f.payload : '<bin>'
          bWire.push(`${Date.now()} → ${s.slice(0, 140)}`)
          if (bWire.length > 80) bWire.shift()
        })
        ws.on('framereceived', (f) => {
          const s = typeof f.payload === 'string' ? f.payload : ''
          bWire.push(`${Date.now()} ← ${s.slice(0, 140)}`)
          if (bWire.length > 80) bWire.shift()
          bFrames.push(s.slice(0, 160))
          if (bFrames.length > 60) bFrames.shift()
          // real event frames carry the row `record`; the join reply does not
          if (s.includes('"record"') && s.includes('"type":"INSERT"')) {
            bWireFrame = true
          }
        })
      })
      const bEvents: string[] = []
      pB.on('console', (m) => {
        const t = m.text()
        if (t.includes('[thread-evt]') || t.includes('[rt-sub]') || t.includes('[rt-client]') || t.includes('[rt-push]'))
          bEvents.push(t.slice(0, 160))
      })
      await pA.goto(`/messages/${offerId}`)
      await pB.goto(`/messages/${offerId}`)
      await expect(pA.getByRole('button', { name: 'Send' })).toBeVisible()
      await expect(pB.getByRole('button', { name: 'Send' })).toBeVisible()
      await bThreadReady

      const ping = `E2E realtime ping ${Date.now()}`
      await pA.getByLabel('Message').fill(ping)
      await pA.getByRole('button', { name: 'Send' }).click()
      // precondition: the sender's own bubble landed (server-rendered, so the
      // row is committed before we assert partner delivery)
      await expect(threadBubble(pA, ping)).toBeVisible({ timeout: 10_000 })
      // stage 1: the push reached B's websocket (server-side delivery + RLS)
      try {
        await expect.poll(() => bWireFrame, { timeout: 10_000 }).toBe(true)
      } catch (e) {
        console.error('[rt-debug] STAGE1 failed; events:', JSON.stringify(bEvents, null, 1))
        console.error('[rt-debug] sockets:', bRealtimeSockets)
        console.error('[rt-debug] wire:', JSON.stringify(bWire, null, 1))
        // does it arrive late, or never?
        await pB.waitForTimeout(20_000)
        console.error('[rt-debug] after +20s: wire=', bWireFrame, 'bubbleCount=', await threadBubble(pB, ping).count(), 'events=', JSON.stringify(bEvents))
        throw e
      }
      // stage 2: B's handler refreshed the server-rendered thread (no reload)
      const stage2 = threadBubble(pB, ping).waitFor({ state: 'visible', timeout: 10_000 }).then(
        () => true,
        () => false,
      )
      if (!(await stage2)) {
        console.error('[rt-debug] stage2 failed; events:', JSON.stringify(bEvents, null, 1))
        console.error('[rt-debug] sockets:', bRealtimeSockets, 'frames:', JSON.stringify(bFrames))
        console.error('[rt-debug] wire:', JSON.stringify(bWire))
        throw new Error('stage2: no bubble on B')
      }

      // the notifications channel streams server-side inserts too
      const bNotifReady = waitForAuthedSubscribe(pB, 'notifications')
      await pB.goto('/notifications')
      await expect(pB.getByRole('button', { name: 'Mark all read' })).toBeVisible()
      await bNotifReady

      const title = `E2E live notice ${Date.now()}`
      const { error: nErr } = await db.from('notifications').insert({
        user_id: B.userId,
        type: 'admin_notice',
        title,
        body: 'streamed by Supabase Realtime',
        link: null,
      })
      expect(nErr).toBeNull()
      await expect(pB.getByText(title)).toBeVisible({ timeout: 10_000 })
    } finally {
      await cleanupTradeUsers([A.userId, B.userId])
      await Promise.all([A, B].map((u) => cleanupTestUser(u.userId)))
      await Promise.all([ctxA, ctxB].map((c) => c.close()))
    }
  })
})
