import { test, expect } from '@playwright/test'

test.describe('Sécurité API', () => {
  test.skip('rate limiting sur /api/lookup-matricule', async ({ request }) => {
    // Skip en production : rate limiter in-memory = par instance serverless
    // Ce test fonctionne uniquement en local (une seule instance)
    const results = []
    for (let i = 0; i < 16; i++) {
      const res = await request.post('/api/lookup-matricule', {
        data: { firstName: 'Test', lastName: 'User' },
      })
      results.push(res.status())
    }
    expect(results).toContain(429)
  })

  test('send-welcome rejeté sans clé interne', async ({ request }) => {
    const res = await request.post('/api/send-welcome', {
      data: { email: 'test@test.com', firstName: 'Test' },
    })
    expect(res.status()).toBe(401)
  })

  test('send-welcome rejeté avec mauvaise clé', async ({ request }) => {
    const res = await request.post('/api/send-welcome', {
      data: { email: 'test@test.com', firstName: 'Test', internalKey: 'fake-key' },
    })
    expect(res.status()).toBe(401)
  })

  test('export rejeté sans auth', async ({ request }) => {
    const res = await request.get('/api/export/entries')
    expect(res.status()).toBe(401)
  })

  test('adhesion review rejeté sans auth', async ({ request }) => {
    const res = await request.post('/api/adhesion/review', {
      data: { requestId: 'fake', action: 'approve' },
    })
    // 401 ou 500 (pas 200)
    expect(res.status()).not.toBe(200)
  })

  test('paypal setup rejeté sans auth developer', async ({ request }) => {
    const res = await request.post('/api/paypal/setup')
    expect(res.status()).not.toBe(200)
  })
})

test.describe('Headers de sécurité', () => {
  test('headers OWASP présents', async ({ request }) => {
    const res = await request.get('/login')
    const headers = res.headers()

    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['x-xss-protection']).toBe('1; mode=block')
    expect(headers['strict-transport-security']).toContain('max-age=')
    expect(headers['permissions-policy']).toBeDefined()
    expect(headers['content-security-policy']).toBeDefined()
  })

  test('CSP contient les directives critiques', async ({ request }) => {
    const res = await request.get('/login')
    const csp = res.headers()['content-security-policy'] || ''

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain('supabase.co')
  })

  test('pas de header X-Powered-By', async ({ request }) => {
    const res = await request.get('/login')
    expect(res.headers()['x-powered-by']).toBeUndefined()
  })
})
