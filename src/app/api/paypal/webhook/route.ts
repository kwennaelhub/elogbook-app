import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/paypal'

// Événements webhook PayPal pour les souscriptions
// https://developer.paypal.com/docs/api/webhooks/v1/#webhooks-event-types
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Vérifier la signature du webhook en production
    if (process.env.PAYPAL_MODE === 'live') {
      const isValid = await verifyWebhookSignature(headers, body)
      if (!isValid) {
        console.error('[PayPal Webhook] Signature invalide')
        return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
      }
    }

    const event = JSON.parse(body)
    const eventType = event.event_type as string
    const resource = event.resource

    console.log(`[PayPal Webhook] ${eventType}`, resource?.id)

    const supabase = await createServiceClient()

    switch (eventType) {
      // Abonnement activé (paiement initial réussi)
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const subscriptionId = resource.id
        const customId = resource.custom_id // user_id

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            starts_at: resource.start_time || new Date().toISOString(),
          })
          .eq('payment_reference', subscriptionId)

        // Mettre à jour le profil si c'est un plan institutionnel
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan, user_id')
          .eq('payment_reference', subscriptionId)
          .single()

        if (sub?.plan === 'institutional') {
          // Créer les sièges institutionnels
          await supabase.from('institutional_seats').insert({
            subscription_id: sub.user_id,
            max_seats: 20,
            used_seats: 0,
          })
        }

        console.log(`[PayPal] Abonnement activé pour user ${customId}`)
        break
      }

      // Paiement récurrent réussi
      case 'PAYMENT.SALE.COMPLETED': {
        const subscriptionId = resource.billing_agreement_id
        if (subscriptionId) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('payment_reference', subscriptionId)
            .eq('status', 'active')
        }
        break
      }

      // Abonnement annulé
      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        const subscriptionId = resource.id
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            expires_at: new Date().toISOString(),
          })
          .eq('payment_reference', subscriptionId)

        console.log(`[PayPal] Abonnement annulé: ${subscriptionId}`)
        break
      }

      // Abonnement suspendu (échec de paiement)
      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        const subscriptionId = resource.id
        await supabase
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('payment_reference', subscriptionId)

        console.log(`[PayPal] Abonnement suspendu: ${subscriptionId}`)
        break
      }

      // Paiement échoué
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
        const subscriptionId = resource.id
        console.log(`[PayPal] Paiement échoué: ${subscriptionId}`)
        break
      }

      default:
        console.log(`[PayPal Webhook] Événement non géré: ${eventType}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[PayPal Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
