import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'test@elogbook.bj'
const TEST_PASSWORD = 'Test2026!'

test.describe.serial('Permissions & Accès', () => {
  test('developer accède à /admin', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/logbook', { timeout: 30_000 })

    await page.goto('/admin')
    await page.waitForLoadState('domcontentloaded')
    // Developer ne doit PAS être redirigé vers /logbook
    expect(page.url()).toContain('/admin')
  })

  test('/admin sans auth redirige vers /login', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL('**/login**', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('/settings sans auth redirige vers /login', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForURL('**/login**', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
