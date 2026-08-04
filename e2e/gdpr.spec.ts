import { test, expect } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Tests e2e RGPD — self-service export + delete.
 *
 * Pattern RP-33 (feedback_nextjs_supabase_app.md) : on crée UN compte test
 * dédié à ce fichier via auth.admin.createUser (service_role) et on le
 * détruit en fin de suite. Aucun MDP user mémorisé n'est utilisé.
 *
 * Skippé en CI tant que NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * ne sont pas exposés au workflow e2e (à activer dans une PR de suivi une
 * fois la migration 8 déployée en prod).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const gdprSuite = SUPABASE_URL && SERVICE_KEY ? test.describe : test.describe.skip

gdprSuite('RGPD self-service', () => {
  const email = `gdpr-test-${Date.now()}@e2e.local`
  const password = 'GdprE2ETest2026!'
  let userId: string | null = null
  let admin: SupabaseClient

  test.beforeAll(async () => {
    // Init lazy — n'est appelé que si le describe n'est pas skippé.
    admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: 'Gdpr', last_name: 'Test' },
    })
    if (error) throw error
    userId = data.user?.id ?? null
    // Insérer profile minimal (le trigger de bienvenue peut le faire selon config).
    if (userId) {
      await admin.from('profiles').upsert({
        id: userId,
        first_name: 'Gdpr',
        last_name: 'Test',
        email,
        role: 'student',
      })
    }
  })

  test.afterAll(async () => {
    if (userId) {
      // Cleanup — clear deletion pending puis delete
      await admin.from('profiles').update({
        deletion_requested_at: null,
        deletion_scheduled_for: null,
      }).eq('id', userId)
      await admin.auth.admin.deleteUser(userId).catch(() => {})
    }
  })

  test('export RGPD génère un ZIP et log audit', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(logbook|)/, { timeout: 15_000 })

    // Appel direct API (l'UI est testée séparément)
    const res = await page.request.post('/api/user/export')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.row_count).toBeGreaterThanOrEqual(1)

    // Audit log doit contenir l'action
    const { count } = await admin
      .from('audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId!)
      .eq('action', 'gdpr_export')
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('delete sans password → 400', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(logbook|)/, { timeout: 15_000 })

    const res = await page.request.post('/api/account/delete', { data: {} })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('gdpr.error.passwordRequired')
  })

  test('delete avec mauvais password → 401 (ré-auth échoue)', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(logbook|)/, { timeout: 15_000 })

    const res = await page.request.post('/api/account/delete', {
      data: { password: 'WrongPassword!' },
    })
    expect(res.status()).toBe(401)
  })

  test('delete flow complet + cancel', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(logbook|)/, { timeout: 15_000 })

    // 1. Demande de suppression
    const del = await page.request.post('/api/account/delete', {
      data: { password, reason: 'Test e2e — cleanup' },
    })
    expect(del.status()).toBe(200)
    const delBody = await del.json()
    expect(delBody.success).toBe(true)
    expect(delBody.grace_period_days).toBe(30)

    // 2. Profile en DB doit avoir deletion_requested_at set
    const { data: p } = await admin
      .from('profiles')
      .select('deletion_requested_at, deletion_scheduled_for')
      .eq('id', userId!)
      .single()
    expect(p?.deletion_requested_at).not.toBeNull()
    expect(p?.deletion_scheduled_for).not.toBeNull()

    // 3. Re-login puis cancel
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    // Redirection attendue vers /account/deletion-pending
    await page.waitForURL(/\/account\/deletion-pending/, { timeout: 15_000 })

    const cancel = await page.request.post('/api/account/delete/cancel')
    expect(cancel.status()).toBe(200)

    // 4. Vérifier que les champs sont clear
    const { data: p2 } = await admin
      .from('profiles')
      .select('deletion_requested_at')
      .eq('id', userId!)
      .single()
    expect(p2?.deletion_requested_at).toBeNull()
  })
})
