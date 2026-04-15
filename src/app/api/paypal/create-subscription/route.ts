import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSubscription } from '@/lib/paypal'
import { paypalLogger as log } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'error.unauthorized' }, { status: 401 })
    }

    const { planKey } = await request.json()

    if (!planKey || !['premium', 'institutional'].includes(planKey)) {
      return NextResponse.json({ error: 'Plan requis' }, { status: 400 })
    }

    const planId = planKey === 'premium'
      ? process.env.PAYPAL_PLAN_PREMIUM
      : process.env.PAYPAL_PLAN_INSTITUTIONAL

    if (!planId) {
      return NextResponse.json({ error: 'Configuration PayPal manquante' }, { status: 500 })
    }

    // Vérifier l'abonnement actif — permettre les upgrades
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, plan, status, payment_reference')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (existingSub) {
      const planHierarchy: Record<string, number> = { free: 0, premium: 1, institutional: 2 }
      const currentLevel = planHierarchy[existingSub.plan] ?? 0
      const requestedLevel = planHierarchy[planKey] ?? 0

      if (requestedLevel <= currentLevel) {
        return NextResponse.json(
          { error: 'subscription.error.alreadyHigher' },
          { status: 400 }
        )
      }

      // Marquer l'ancien abonnement comme remplacé
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' as const, ends_at: new Date().toISOString() })
        .eq('id', existingSub.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://internlog.app'

    const { subscriptionId, approvalUrl } = await createSubscription(
      planId,
      user.id,
      user.email!,
      `${appUrl}/subscription?status=success`,
      `${appUrl}/subscription?status=cancelled`
    )

    // Créer l'entrée en base avec statut "pending"
    await supabase.from('subscriptions').insert({
      user_id: user.id,
      plan: planKey,
      status: 'pending' as const,
      payment_provider: 'paypal',
      payment_reference: subscriptionId,
      amount_fcfa: planKey === 'premium' ? 4999 : 29999,
      starts_at: new Date().toISOString(),
    })

    return NextResponse.json({ approvalUrl, subscriptionId })
  } catch (error) {
    log.error({ err: error }, 'Erreur création abonnement')
    return NextResponse.json(
      { error: 'subscription.error.creationFailed' },
      { status: 500 }
    )
  }
}
