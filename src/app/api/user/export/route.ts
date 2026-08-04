/**
 * POST /api/user/export — Export self-service RGPD Art. 20 (portabilité).
 *
 * Flow :
 *   1. Auth user (session)
 *   2. Rate-limit : max 3 exports par 24h par user (empêche le DoS storage)
 *   3. Collecte toutes les données via helper collectUserData()
 *   4. Sérialise en JSON, upload dans bucket privé `gdpr-exports`
 *   5. Génère une signed URL 24h
 *   6. Envoie l'URL par email (Brevo)
 *   7. Log audit
 *
 * Bucket `gdpr-exports` : privé, service_role uniquement.
 * Purge auto : GitHub Action supprime les fichiers > 7 jours.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { gdprLogger as log } from '@/lib/logger'
import { collectUserData, countExportRows } from '@/lib/gdpr/export'
import { sendExportReadyEmail } from '@/lib/email/templates/export-ready'

const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000 // 24h
const RATE_LIMIT_MAX = 3
const SIGNED_URL_EXPIRES_IN = 24 * 60 * 60 // 24h en secondes
const BUCKET = 'gdpr-exports'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'error.unauthorized' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()

  // 1. Rate-limit via audit_log
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count: recentExports } = await serviceClient
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('action', 'gdpr_export')
    .gte('created_at', since)

  if ((recentExports ?? 0) >= RATE_LIMIT_MAX) {
    log.warn({ userId: user.id, recentExports }, 'Export RGPD rate-limité')
    return NextResponse.json(
      { error: 'gdpr.error.rateLimited', message: `Maximum ${RATE_LIMIT_MAX} exports par 24h.` },
      { status: 429 },
    )
  }

  try {
    // 2. Collecte des données (RLS s'applique : impossible d'exfiltrer autre chose)
    const bundle = await collectUserData(supabase, user.id)
    const rowCount = countExportRows(bundle)
    const json = JSON.stringify(bundle, null, 2)
    const bytes = new TextEncoder().encode(json)
    const sizeKb = Math.round(bytes.length / 1024)

    // 3. Upload dans bucket privé
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const path = `${user.id}/internlog-export-${timestamp}.json`

    const { error: uploadError } = await serviceClient.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: 'application/json',
        upsert: false,
      })

    if (uploadError) {
      log.error({ userId: user.id, err: uploadError.message }, 'Upload export RGPD échoué')
      return NextResponse.json({ error: 'gdpr.error.uploadFailed' }, { status: 500 })
    }

    // 4. Signed URL 24h
    const { data: signed, error: signedError } = await serviceClient.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_EXPIRES_IN)

    if (signedError || !signed) {
      log.error({ userId: user.id, err: signedError?.message }, 'Signed URL échoué')
      return NextResponse.json({ error: 'gdpr.error.signedUrlFailed' }, { status: 500 })
    }

    // 5. Email Brevo
    const profileEmail = bundle.profile?.email as string | undefined
    const firstName = (bundle.profile?.first_name as string | undefined) ?? ''
    if (profileEmail) {
      await sendExportReadyEmail({
        email: profileEmail,
        firstName,
        downloadUrl: signed.signedUrl,
        rowCount,
        sizeKb,
        expiresInHours: 24,
      })
    }

    // 6. Audit log
    await serviceClient.from('audit_log').insert({
      user_id: user.id,
      action: 'gdpr_export',
      table_name: 'profiles',
      record_id: user.id,
      new_data: {
        path,
        row_count: rowCount,
        size_kb: sizeKb,
        format: 'json',
      },
    })

    log.info(
      { userId: user.id, rowCount, sizeKb, path },
      'Export RGPD généré et envoyé par email',
    )

    return NextResponse.json({
      success: true,
      message: 'gdpr.export.success',
      row_count: rowCount,
      size_kb: sizeKb,
      expires_in_hours: 24,
    })
  } catch (err) {
    log.error({ userId: user.id, err: (err as Error).message }, 'Erreur export RGPD')
    return NextResponse.json({ error: 'gdpr.error.internal' }, { status: 500 })
  }
}
