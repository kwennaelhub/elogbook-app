import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { adhesionLogger as log } from '@/lib/logger'

// GET — lister hôpitaux et spécialités pour le formulaire
export async function GET() {
  const supabase = await createServiceClient()

  const [{ data: hospitals }, { data: specialties }] = await Promise.all([
    supabase.from('hospitals').select('id, name').eq('is_active', true).order('name'),
    supabase.from('specialties').select('id, name').eq('is_active', true).eq('level', 0).order('name'),
  ])

  return NextResponse.json({
    hospitals: hospitals ?? [],
    specialties: specialties ?? [],
  })
}

// POST — soumettre une demande d'adhésion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, hospitalId, hospitalOther, specialtyId, desLevel, promotionYear, phone, motivation } = body

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !desLevel) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    const { error } = await supabase.from('adhesion_requests').insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      hospital_id: hospitalId || null,
      hospital_other: hospitalOther?.trim() || null,
      specialty_id: specialtyId || null,
      des_level: desLevel,
      promotion_year: promotionYear ? parseInt(promotionYear) : null,
      phone: phone?.trim() || null,
      motivation: motivation?.trim() || null,
    })

    if (error) {
      log.error({ err: error, email }, 'Erreur insertion demande adhésion')
      return NextResponse.json({ error: 'Erreur lors de la soumission' }, { status: 500 })
    }

    // Email de confirmation automatique
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
          to: [{ email: email.trim().toLowerCase(), name: firstName.trim() }],
          subject: `Demande d'adhésion reçue — InternLog`,
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
  .info { background: #f0f9ff; border-radius: 12px; padding: 16px; margin: 16px 0; }
  .info li { color: #0369a1; font-size: 13px; margin-bottom: 6px; }
  .footer { padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
  .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
</style></head><body>
<div class="container">
  <div class="header"><h1>InternLog</h1></div>
  <div class="body">
    <h2>Demande reçue, ${firstName.trim()} !</h2>
    <p>Nous avons bien reçu votre demande d'adhésion à InternLog. Elle est actuellement <strong>en cours d'évaluation</strong> par notre équipe.</p>
    <div class="info">
      <ul>
        <li><strong>Nom :</strong> ${lastName.trim()} ${firstName.trim()}</li>
        <li><strong>Niveau :</strong> ${desLevel}</li>
        <li><strong>Email :</strong> ${email.trim().toLowerCase()}</li>
      </ul>
    </div>
    <p>Vous recevrez un email avec votre <strong>matricule DES</strong> dès que votre demande sera validée. Cela prend généralement 24 à 48 heures.</p>
  </div>
  <div class="footer"><p>InternLog — Logbook Médical DES</p></div>
</div></body></html>`,
        }),
      }).catch(err => log.error({ err, email }, 'Erreur envoi email confirmation adhésion'))
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
