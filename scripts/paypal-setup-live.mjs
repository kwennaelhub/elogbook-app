// Script one-shot : crée le produit + plans PayPal en mode LIVE
// Usage : node scripts/paypal-setup-live.mjs
import { readFileSync } from 'fs'

// Charger les env vars depuis .vercel/.env.production.local
const envFile = readFileSync('.vercel/.env.production.local', 'utf-8')
const env = {}
for (const line of envFile.split('\n')) {
  const match = line.match(/^(\w+)="(.+)"$/)
  if (match) env[match[1]] = match[2]
}

const BASE_URL = env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

console.log(`Mode : ${env.PAYPAL_MODE}`)
console.log(`Base URL : ${BASE_URL}`)

// 1. Obtenir un access token
async function getToken() {
  const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`Auth failed: ${await res.text()}`)
  const data = await res.json()
  return data.access_token
}

// 2. Créer le produit
async function createProduct(token) {
  const res = await fetch(`${BASE_URL}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'InternLog',
      description: 'Logbook médical électronique pour étudiants DES — suivi des compétences et interventions',
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  })
  if (!res.ok) throw new Error(`Create product failed: ${await res.text()}`)
  return (await res.json()).id
}

// 3. Créer un plan
async function createPlan(token, productId, planKey) {
  const plans = {
    premium: {
      name: 'Premium DES',
      description: 'Accès complet pour étudiants DES — saisie illimitée, export, dashboard avancé, newsletter scientifique',
      price: '7.99',
    },
    institutional: {
      name: 'Institutionnel',
      description: 'Pack hôpital — 20 postes, dashboard coordinateur, gestion DES, statistiques par promotion',
      price: '45.99',
    },
  }
  const plan = plans[planKey]

  const res = await fetch(`${BASE_URL}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      name: plan.name,
      description: plan.description,
      status: 'ACTIVE',
      billing_cycles: [{
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: plan.price, currency_code: 'EUR' } },
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: { value: '0', currency_code: 'EUR' },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    }),
  })
  if (!res.ok) throw new Error(`Create plan ${planKey} failed: ${await res.text()}`)
  return (await res.json()).id
}

// Main
try {
  console.log('\n1. Authentification PayPal Live...')
  const token = await getToken()
  console.log('   ✅ Token obtenu')

  console.log('\n2. Création du produit...')
  const productId = await createProduct(token)
  console.log(`   ✅ Produit créé : ${productId}`)

  console.log('\n3. Création du plan Premium...')
  const premiumId = await createPlan(token, productId, 'premium')
  console.log(`   ✅ Plan Premium : ${premiumId}`)

  console.log('\n4. Création du plan Institutionnel...')
  const institutionalId = await createPlan(token, productId, 'institutional')
  console.log(`   ✅ Plan Institutionnel : ${institutionalId}`)

  console.log('\n══════════════════════════════════════')
  console.log('Variables à mettre à jour dans Vercel :')
  console.log(`PAYPAL_PRODUCT_ID=${productId}`)
  console.log(`PAYPAL_PLAN_PREMIUM=${premiumId}`)
  console.log(`PAYPAL_PLAN_INSTITUTIONAL=${institutionalId}`)
  console.log('══════════════════════════════════════\n')
} catch (err) {
  console.error('❌ Erreur:', err.message)
  process.exit(1)
}
