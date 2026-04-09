import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSubscription } from '@/lib/paypal'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { planId, planKey } = await request.json()

    if (!planId || !planKey) {
      return NextResponse.json({ error: 'Plan requis' }, { status: 400 })
    }

    // Vérifier qu'il n'a pas déjà un abonnement actif
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (existingSub) {
      return NextResponse.json({ error: 'Vous avez déjà un abonnement actif' }, { status: 400 })
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
    console.error('[PayPal] Create subscription error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'abonnement' },
      { status: 500 }
    )
  }
}
