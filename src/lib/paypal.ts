// PayPal Subscriptions API — InternLog
// Utilise l'API REST PayPal pour gérer les abonnements récurrents

const PAYPAL_BASE_URL = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

// Obtenir un access token PayPal (OAuth 2.0 Client Credentials)
async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!
  const secret = process.env.PAYPAL_CLIENT_SECRET!

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`PayPal auth failed: ${error}`)
  }

  const data = await res.json()
  return data.access_token
}

// Plans InternLog
export const PLANS = {
  premium: {
    name: 'Premium DES',
    description: 'Accès complet pour étudiants DES — saisie illimitée, export, dashboard avancé, newsletter scientifique',
    price_eur: '7.99',
    price_fcfa: 4999,
    interval: 'MONTH' as const,
  },
  institutional: {
    name: 'Institutionnel',
    description: 'Pack hôpital — 20 postes, dashboard coordinateur, gestion DES, statistiques par promotion',
    price_eur: '45.99',
    price_fcfa: 29999,
    interval: 'MONTH' as const,
    max_seats: 20,
  },
} as const

export type PlanKey = keyof typeof PLANS

// Créer un produit PayPal (à faire une seule fois)
export async function createProduct(name: string, description: string): Promise<string> {
  const token = await getAccessToken()

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description,
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`PayPal create product failed: ${error}`)
  }

  const data = await res.json()
  return data.id
}

// Créer un plan d'abonnement PayPal (à faire une seule fois par plan)
export async function createBillingPlan(
  productId: string,
  planKey: PlanKey
): Promise<string> {
  const token = await getAccessToken()
  const plan = PLANS[planKey]

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
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
      billing_cycles: [
        {
          frequency: { interval_unit: plan.interval, interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // illimité
          pricing_scheme: {
            fixed_price: { value: plan.price_eur, currency_code: 'EUR' },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: { value: '0', currency_code: 'EUR' },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`PayPal create plan failed: ${error}`)
  }

  const data = await res.json()
  return data.id
}

// Créer une souscription (redirige l'utilisateur vers PayPal pour approbation)
export async function createSubscription(
  planId: string,
  userId: string,
  email: string,
  returnUrl: string,
  cancelUrl: string
): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const token = await getAccessToken()

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: planId,
      subscriber: {
        email_address: email,
      },
      custom_id: userId, // pour retrouver l'utilisateur au retour webhook
      application_context: {
        brand_name: 'InternLog',
        locale: 'fr-FR',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`PayPal create subscription failed: ${error}`)
  }

  const data = await res.json()
  const approvalLink = data.links.find((l: { rel: string }) => l.rel === 'approve')

  return {
    subscriptionId: data.id,
    approvalUrl: approvalLink?.href || '',
  }
}

// Vérifier le statut d'une souscription
export async function getSubscriptionDetails(subscriptionId: string) {
  const token = await getAccessToken()

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`PayPal get subscription failed: ${error}`)
  }

  return res.json()
}

// Annuler une souscription
export async function cancelSubscription(subscriptionId: string, reason: string) {
  const token = await getAccessToken()

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`PayPal cancel subscription failed: ${error}`)
  }
}

// Vérifier la signature d'un webhook PayPal
export async function verifyWebhookSignature(
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  const token = await getAccessToken()
  const webhookId = process.env.PAYPAL_WEBHOOK_ID!

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  })

  if (!res.ok) return false

  const data = await res.json()
  return data.verification_status === 'SUCCESS'
}
