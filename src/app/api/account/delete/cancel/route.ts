/**
 * POST /api/account/delete/cancel — Annule une demande de suppression
 * en cours avant expiration du sursis de 30 jours.
 *
 * L'utilisateur DOIT être connecté (sa session reste valide même en sursis,
 * le middleware le redirige juste vers /account/deletion-pending). Cette
 * route accepte l'appel depuis cette page et clear les champs deletion_*.
 *
 * Pas de ré-auth password ici : l'utilisateur possède déjà un cookie de
 * session valide, et l'annulation est une action réversible (à l'inverse
 * du delete initial). Un attaquant qui aurait volé la session ne gagne
 * rien à annuler la suppression.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { gdprLogger as log } from '@/lib/logger'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'error.unauthorized' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('deletion_requested_at')
    .eq('id', user.id)
    .single()

  if (!profile?.deletion_requested_at) {
    return NextResponse.json(
      { error: 'gdpr.error.noPendingDeletion' },
      { status: 409 },
    )
  }

  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({
      deletion_requested_at: null,
      deletion_scheduled_for: null,
      deletion_reason: null,
    })
    .eq('id', user.id)

  if (updateError) {
    log.error({ userId: user.id, err: updateError.message }, 'Annulation deletion échouée')
    return NextResponse.json({ error: 'gdpr.error.cancelFailed' }, { status: 500 })
  }

  await serviceClient.from('audit_log').insert({
    user_id: user.id,
    action: 'gdpr_delete_cancelled',
    table_name: 'profiles',
    record_id: user.id,
    old_data: { deletion_requested_at: profile.deletion_requested_at },
    new_data: null,
  })

  log.info({ userId: user.id }, 'Demande de suppression annulée')

  return NextResponse.json({ success: true })
}
