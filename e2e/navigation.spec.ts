import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'test@elogbook.bj'
const TEST_PASSWORD = 'Test2026!'

test.describe.serial('Navigation app (authentifié)', () => {
  test('login + navigation vers pages principales', async ({ page }) => {
    test.setTimeout(120_000) // 2 min pour cold starts Vercel

    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/logbook', { timeout: 30_000 })

    // Naviguer vers chaque page et vérifier qu'on n'est PAS redirigé vers /login
    const pages = ['/dashboard', '/calendar', '/notes', '/settings']
    for (const path of pages) {
      await page.goto(path)
      await page.waitForLoadState('domcontentloaded')
      expect(page.url()).not.toContain('/login')
    }
  })
})

test.describe('Navigation mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('login page est responsive', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')
    // Vérifier qu'un formulaire ou input est visible
    const hasForm = await page.locator('form').count()
    const hasInput = await page.locator('input').count()
    expect(hasForm + hasInput).toBeGreaterThan(0)
  })
})
