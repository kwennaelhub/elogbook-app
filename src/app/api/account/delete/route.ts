/**
 * POST /api/account/delete — Suppression self-service RGPD Art. 17.
 *
 * Sécurité :
 *   - Ré-authentification par mot de passe obligatoire (empêche un attaquant
 *     ayant volé un cookie de session de supprimer le compte).
 *   - Blocage si un abonnement PayPal actif existe → message explicite
 *     demandant l'annulation préalable.
 *   - Le compte n'est PAS supprimé immédiatement : marquage
 *     deletion_requested_at + deletion_scheduled_for = now() + 30j.
 *     La destruction effective est faite par le cron .github/workflows/gdpr-purge.yml.
 *
 * Après succès : signOut + email confirmation Brevo + audit log.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { gdprLogger as log } from '@/lib/logger'
import { sendDeletionRequestedEmail } from '@/lib/email/templates/deletion-requested'

const GRACE_PERIOD_DAYS = 30

type DeleteRequestBody = {
  password?: string
  reason?: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user || !user.email) {
    return NextResponse.json({ error: 'error.unauthorized' }, { status: 401 })
  }

  let body: DeleteRequestBody
  try {
    body = (await request.json()) as DeleteRequestBody
  } catch {
    return NextResponse.json({ error: 'gdpr.error.invalidBody' }, { status: 400 })
  }

  if (!body.password || typeof body.password !== 'string' || body.password.length < 1) {
    return NextResponse.json({ error: 'gdpr.error.passwordRequired' }, { status: 400 })
  }

  // 1. Ré-auth via signInWithPassword (n'écrase pas la session courante grâce
  //    à un client temporaire fait exprès pour ce check).
  const serviceClient = await createServiceClient()
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const authCheckClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { error: reauthError } = await authCheckClient.auth.signInWithPassword({
    email: user.email,
    password: body.password,
  })

  if (reauthError) {
    log.warn({ userId: user.id, err: reauthError.message }, 'Ré-auth delete échouée')
    return NextResponse.json({ error: 'gdpr.error.passwordInvalid' }, { status: 401 })
  }

  // 2. Bloquer si subscription PayPal ACTIVE
  const { data: activeSub } = await serviceClient
    .from('subscriptions')
    .select('id, status, paypal_subscription_id')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .maybeSingle()

  if (activeSub) {
    log.info({ userId: user.id, subId: activeSub.id }, 'Delete bloqué par subscription active')
    return NextResponse.json(
      {
        error: 'gdpr.error.activeSubscription',
        message:
          'Un abonnement est encore actif sur votre compte. Annulez-le depuis Paramètres → Abonnement avant de supprimer votre compte.',
      },
      { status: 409 },
    )
  }

  // 3. Bloquer si demande déjà en cours
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, first_name, deletion_requested_at')
    .eq('id', user.id)
    .single()

  if (profile?.deletion_requested_at) {
    return NextResponse.json(
      { error: 'gdpr.error.alreadyPending' },
      { status: 409 },
    )
  }

  // 4. Marquer le compte pour suppression
  const now = new Date()
  const scheduledFor = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)

  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({
      deletion_requested_at: now.toISOString(),
      deletion_scheduled_for: scheduledFor.toISOString(),
      deletion_reason: body.reason?.slice(0, 500) ?? null,
    })
    .eq('id', user.id)

  if (updateError) {
    log.error({ userId: user.id, err: updateError.message }, 'Marquage deletion échoué')
    return NextResponse.json({ error: 'gdpr.error.markFailed' }, { status: 500 })
  }

  // 5. Audit log
  await serviceClient.from('audit_log').insert({
    user_id: user.id,
    action: 'gdpr_delete_requested',
    table_name: 'profiles',
    record_id: user.id,
    new_data: {
      scheduled_for: scheduledFor.toISOString(),
      reason: body.reason?.slice(0, 500) ?? null,
      grace_period_days: GRACE_PERIOD_DAYS,
    },
  })

  // 6. Email de confirmation
  await sendDeletionRequestedEmail({
    email: user.email,
    firstName: profile?.first_name ?? '',
    scheduledFor,
    cancelUrl: 'https://internlog.app/account/deletion-pending',
  })

  // 7. SignOut de la session courante
  await supabase.auth.signOut()

  log.info(
    { userId: user.id, scheduledFor: scheduledFor.toISOString() },
    'Demande de suppression enregistrée',
  )

  return NextResponse.json({
    success: true,
    scheduled_for: scheduledFor.toISOString(),
    grace_period_days: GRACE_PERIOD_DAYS,
  })
}
