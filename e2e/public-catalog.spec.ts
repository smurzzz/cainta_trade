import { expect, test } from '@playwright/test'

/**
 * docs/09 · runnable-now specs: the public catalog reads real seed data
 * (016_seed.sql — demo items CT-100-DEMO1..5). No sign-in required, so these
 * run regardless of Clerk configuration.
 */

test.describe('public catalog', () => {
  test('landing page shows real listings and a live total', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Trade what you have')
    // featured cards come from the database, not fixtures — assert on the
    // item links rather than exact seed titles: parallel specs publish
    // temporary listings and the landing page shows the newest 4 (revalidate
    // 60 s), so seed titles legitimately rotate out of the featured row mid-run
    await expect(page.locator('a[href^="/items/"]').first()).toBeVisible()
    await expect(page.getByText(/Browse all \d+ items/)).toBeVisible()
    // no mockup fixture titles remain
    await expect(page.getByText('Three-seater fabric sofa')).toHaveCount(0)
  })

  test('browse lists seed items and search narrows to matches (T-L7)', async ({ page }) => {
    await page.goto('/browse')
    await expect(page.getByRole('heading', { name: 'Browse items' })).toBeVisible()
    // each card renders its title twice (photo placeholder + title link)
    await expect(page.getByText('Wooden dining set').first()).toBeVisible()
    await expect(page.getByText('Preloved storybooks (12 pcs)').first()).toBeVisible()

    // keyword search: only the fan matches
    await page.getByRole('searchbox', { name: 'Search items' }).fill('fan')
    await expect(page).toHaveURL(/q=fan/)
    await expect(page.getByText('Box fan + extension cord').first()).toBeVisible()
    await expect(page.getByText('Wooden dining set')).toHaveCount(0)
  })

  test('category and barangay filters compose in the URL', async ({ page }) => {
    await page.goto('/browse?category=books-school')
    await expect(page.getByText('Preloved storybooks (12 pcs)').first()).toBeVisible()
    await expect(page.getByText('Box fan + extension cord')).toHaveCount(0)

    await page.goto('/browse?barangay=san-juan&condition=fair')
    await expect(page.getByText('Box fan + extension cord').first()).toBeVisible()
    await expect(page.getByText('Wooden dining set')).toHaveCount(0) // it is 'good', not 'fair'
  })

  test('item detail renders owner, spots and the guest gate', async ({ page }) => {
    // resolve an id from browse, then open the detail page
    await page.goto('/browse')
    const itemLink = page.getByRole('link', { name: 'Box fan + extension cord' }).first()
    await itemLink.click()
    await expect(page).toHaveURL(/\/items\/[0-9a-f-]{36}$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Box fan + extension cord' })).toBeVisible()
    await expect(page.getByText('Demo Resident A')).toBeVisible()
    await expect(page.getByText('Looking for in exchange')).toBeVisible()
    await expect(page.getByText('Suggested meetup spots nearby')).toBeVisible()
    await expect(page.getByRole('link', { name: /Log in to save/ }).first()).toBeVisible()
    // detail works by item code too
    await page.goto('/items/CT-100-DEMO2')
    await expect(page.getByRole('heading', { level: 1, name: 'Box fan + extension cord' })).toBeVisible()
  })

  test('unknown item is a 404', async ({ page }) => {
    const res = await page.goto('/items/00000000-0000-4000-8000-000000000000')
    expect(res?.status()).toBe(404)
  })

  test('view counter counts once per browser session', async ({ page, context }) => {
    await page.goto('/browse')
    const id = await page.evaluate(async () => {
      const res = await fetch('/browse')
      const html = await res.text()
      const m = html.match(/\/items\/([0-9a-f-]{36})/)
      return m ? m[1] : null
    })
    expect(id).toBeTruthy()

    const first = await page.evaluate((itemId) => fetch(`/api/items/${itemId}/view`, { method: 'POST' }).then((r) => r.json()), id)
    expect(first).toEqual({ ok: true, counted: true })
    const second = await page.evaluate((itemId) => fetch(`/api/items/${itemId}/view`, { method: 'POST' }).then((r) => r.json()), id)
    expect(second).toEqual({ ok: true, counted: false })
    void context // cookie jar is per-context; both calls share it
  })

  test('account-status sends signed-out visitors to sign-in (T-A4 area)', async ({ page }) => {
    const res = await page.goto('/account-status')
    expect(res?.request().url()).toContain('/sign-in')
  })
})
