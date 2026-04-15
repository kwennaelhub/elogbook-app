import { test, expect } from '@playwright/test'

test.describe('Pages publiques', () => {
  test('page feedback est accessible sans auth', async ({ page }) => {
    const response = await page.goto('/feedback')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/feedback/)
  })

  test('page adhésion est accessible sans auth', async ({ page }) => {
    const response = await page.goto('/adhesion')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/adhesion/)
  })

  test('pages légales redirigent vers login (protégées par proxy)', async ({ page }) => {
    // Les pages légales sont dans le layout (app) protégé
    await page.goto('/legal/cgu')
    await page.waitForURL('**/login**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('route inexistante redirige vers login (proxy)', async ({ page }) => {
    // Le proxy redirige toutes les routes inconnues vers /login si non authentifié
    await page.goto('/cette-page-nexiste-pas')
    await page.waitForURL('**/login**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('robots.txt est accessible', async ({ page }) => {
    const response = await page.goto('/robots.txt')
    expect(response?.status()).toBe(200)
    const text = await page.innerText('body')
    expect(text).toContain('Disallow: /api/')
    expect(text).toContain('internlog.app')
  })

  test('manifest.json est accessible', async ({ page }) => {
    const response = await page.goto('/manifest.json')
    expect(response?.status()).toBe(200)
  })
})
