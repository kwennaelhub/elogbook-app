import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cancelSubscription } from '@/lib/paypal'
import { paypalLogger as log } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'error.unauthorized' }, { status: 401 })
    }

    const { reason } = await request.json()

    // Trouver l'abonnement actif
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, payment_reference')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub?.payment_reference) {
      return NextResponse.json({ error: 'subscription.error.noActive' }, { status: 404 })
    }

    // Annuler côté PayPal
    await cancelSubscription(sub.payment_reference, reason || 'Annulé par l\'utilisateur')

    // Mettre à jour en base
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        expires_at: new Date().toISOString(),
      })
      .eq('id', sub.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ err: error }, 'Erreur annulation abonnement')
    return NextResponse.json(
      { error: 'Erreur lors de l\'annulation' },
      { status: 500 }
    )
  }
}
