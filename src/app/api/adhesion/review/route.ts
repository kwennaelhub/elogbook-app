import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { adhesionLogger as log } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'error.unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['admin', 'superadmin', 'developer'].includes(profile.role)) {
      return NextResponse.json({ error: 'error.forbidden' }, { status: 403 })
    }

    const { id, action } = await request.json()
    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'error.invalidParams' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Récupérer la demande
    const { data: req } = await serviceClient
      .from('adhesion_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (!req) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

    if (action === 'approve') {
      const year = new Date().getFullYear()

      // --- Codes courts hôpitaux ---
      const hospitalCodes: Record<string, string> = {
        'CHIC': 'CHIC', 'CHU-MEL': 'MEL', 'CHUD-O': 'CHUDO',
        'CHUZ Abomey-Calavi': 'CHUZAC', 'CHUZ Suru-Léré': 'CHUZSL',
        'CNHU-HKM': 'CNHU', 'HZ Klouékanmey': 'HZKL',
      }

      // --- Codes courts spécialités ---
      const specialtyCodes: Record<string, string> = {
        'CHIRURGIE CARDIAQUE': 'CARD', 'CHIRURGIE DIGESTIVE': 'DIG',
        'CHIRURGIE ENDOCRINIENNE': 'ENDO', 'CHIRURGIE GYNECOLOGIQUE': 'GYN',
        'CHIRURGIE MAMMAIRE': 'MAM', 'CHIRURGIE PLASTIQUE': 'PLAST',
        'CHIRURGIE THORACIQUE': 'THOR', 'CHIRURGIE UROLOGIQUE ET ANDROLOGIQUE': 'URO',
        'CHIRURGIE VASCULAIRE': 'VASC', 'COMPETENCES NON TECHNIQUES': 'CNT',
        'MAXILLO-FACIALE': 'MAXF', 'NEUROCHIRURGIE': 'NEURO',
        'ORTHOPEDIE - TRAUMATOLOGIE': 'ORTHO',
      }

      // Récupérer noms hôpital et spécialité
      let hospitalCode = 'XX'
      let specialtyCode = 'XX'

      if (req.hospital_id) {
        const { data: hospital } = await serviceClient.from('hospitals').select('name').eq('id', req.hospital_id).single()
        if (hospital) hospitalCode = hospitalCodes[hospital.name] || hospital.name.substring(0, 4).toUpperCase()
      } else if (req.hospital_other) {
        hospitalCode = req.hospital_other.substring(0, 4).toUpperCase()
      }

      if (req.specialty_id) {
        const { data: specialty } = await serviceClient.from('specialties').select('name').eq('id', req.specialty_id).single()
        if (specialty) specialtyCode = specialtyCodes[specialty.name] || specialty.name.substring(0, 4).toUpperCase()
      }

      // Compteur séquentiel global
      const { count } = await serviceClient
        .from('des_registry')
        .select('*', { count: 'exact', head: true })

      const seq = String((count || 0) + 1).padStart(4, '0')

      // Version courte (étudiant) : IL-0042
      const matricule = `IL-${seq}`

      // Version longue (admin) : CNHU-CHIR-DES1-2026-0042
      const matriculeLong = `${hospitalCode}-${specialtyCode}-${req.des_level}-${year}-${seq}`

      // Créer l'entrée dans le registre DES
      const { error: regError } = await serviceClient.from('des_registry').insert({
        matricule,
        matricule_long: matriculeLong,
        first_name: req.first_name,
        last_name: req.last_name,
        email: req.email,
        des_level: req.des_level,
        promotion_year: req.promotion_year || year,
        is_active: true,
      })

      if (regError) {
        log.error({ err: regError, adhesionId: id }, 'Erreur insertion registre DES')
        return NextResponse.json({ error: 'admin.error.registryCreationFailed' }, { status: 500 })
      }

      // Mettre à jour le statut
      await serviceClient.from('adhesion_requests').update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id)

      // Envoyer l'email d'approbation
      const brevoApiKey = process.env.BREVO_API_KEY
      if (brevoApiKey) {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'InternLog', email: process.env.BREVO_SENDER_EMAIL || 'noreply@internlog.app' },
            to: [{ email: req.email, name: req.first_name }],
            subject: `Votre adhésion InternLog est approuvée !`,
            htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f1f5f9; }
  .container { max-width: 560px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
  .header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px 24px; text-align: center; }
  .header h1 { color: #10b981; font-size: 24px; margin: 0; }
  .body { padding: 32px 24px; }
  .body h2 { color: #0f172a; font-size: 20px; margin: 0 0 16px; }
  .body p { color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
  .matricule { background: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0; }
  .matricule .code { font-size: 28px; font-weight: 700; color: #059669; letter-spacing: 2px; }
  .matricule .label { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .cta { display: inline-block; background: #10b981; color: white !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 8px; }
  .footer { padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
  .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
</style></head><body>
<div class="container">
  <div class="header"><h1>InternLog</h1></div>
  <div class="body">
    <h2>Félicitations ${req.first_name} !</h2>
    <p>Votre demande d'adhésion à InternLog a été <strong>approuvée</strong>. Voici votre matricule DES :</p>
    <div class="matricule">
      <div class="code">${matricule}</div>
      <div class="label">Votre identifiant — utilisez-le pour vous inscrire</div>
    </div>
    <p style="color:#6b7280;font-size:12px;text-align:center;margin-top:-8px;">Réf. interne : <code>${matriculeLong}</code></p>
    <p>Vous pouvez maintenant créer votre compte sur InternLog en utilisant l'identifiant <strong>${matricule}</strong> et l'email <strong>${req.email}</strong>.</p>
    <a href="https://internlog.app/register" class="cta">Créer mon compte</a>
  </div>
  <div class="footer"><p>InternLog — Logbook Médical DES</p></div>
</div></body></html>`,
          }),
        }).catch(err => log.error({ err, email: req.email }, 'Erreur envoi email approbation'))
      }

      return NextResponse.json({ success: true, matricule })
    }

    // Rejet
    await serviceClient.from('adhesion_requests').update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ err: error }, 'Erreur revue adhésion')
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
