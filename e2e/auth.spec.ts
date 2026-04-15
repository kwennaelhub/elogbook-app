import { test, expect } from '@playwright/test'

// Compte test developer
const TEST_EMAIL = 'test@elogbook.bj'
const TEST_PASSWORD = 'Test2026!'

test.describe('Authentification', () => {
  test('page login est accessible', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/InternLog/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('login avec mauvais identifiants affiche une erreur', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'fake@fake.com')
    await page.fill('input[type="password"]', 'WrongPassword123!')
    await page.click('button[type="submit"]')

    // Attendre le message d'erreur
    await expect(page.locator('[class*="destructive"], [class*="red"], [role="alert"]')).toBeVisible({ timeout: 10_000 })
  })

  test('login valide redirige vers /logbook', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')

    await page.waitForURL('**/logbook', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/logbook/)
  })

  test('accès /logbook sans auth redirige vers /login', async ({ page }) => {
    await page.goto('/logbook')
    await page.waitForURL('**/login**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('page register est accessible', async ({ page }) => {
    await page.goto('/register')
    // Le formulaire ou la page doit être visible
    await expect(page.locator('form, [data-testid="register"]')).toBeVisible({ timeout: 10_000 })
  })

  test('racine / redirige vers /logbook ou /login', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL(/\/(logbook|login)/, { timeout: 10_000 })
  })
})
