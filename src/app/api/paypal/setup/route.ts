import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createProduct, createBillingPlan } from '@/lib/paypal'
import { paypalLogger as log } from '@/lib/logger'

// Route d'initialisation PayPal — À appeler UNE SEULE FOIS
// Crée le produit + les 2 plans dans PayPal
// Ensuite, sauvegarder les IDs dans les variables d'environnement
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'error.unauthorized' }, { status: 401 })
    }

    // Vérifier que c'est un developer
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'developer') {
      return NextResponse.json({ error: 'error.forbidden' }, { status: 403 })
    }

    // Créer le produit PayPal
    const productId = await createProduct(
      'InternLog',
      'Logbook médical électronique pour étudiants DES — suivi des compétences et interventions'
    )

    // Créer les 2 plans
    const premiumPlanId = await createBillingPlan(productId, 'premium')
    const institutionalPlanId = await createBillingPlan(productId, 'institutional')

    const result = {
      productId,
      premiumPlanId,
      institutionalPlanId,
      message: 'Produit et plans créés avec succès. Ajoutez ces IDs dans vos variables d\'environnement :',
      env: {
        PAYPAL_PRODUCT_ID: productId,
        PAYPAL_PLAN_PREMIUM: premiumPlanId,
        PAYPAL_PLAN_INSTITUTIONAL: institutionalPlanId,
      },
    }

    log.info({ productId, premiumPlanId, institutionalPlanId }, 'PayPal setup terminé')

    return NextResponse.json(result)
  } catch (error) {
    log.error({ err: error }, 'Erreur setup PayPal')
    return NextResponse.json(
      { error: 'Erreur lors de la configuration PayPal' },
      { status: 500 }
    )
  }
}
