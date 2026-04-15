import { NextRequest, NextResponse } from 'next/server'
import { emailLogger as log } from '@/lib/logger'

// API interne pour l'envoi d'emails de bienvenue via Brevo API v3
// Appelée automatiquement à l'inscription d'un nouvel utilisateur
// Protégée par clé interne pour empêcher les appels externes
export async function POST(request: NextRequest) {
  try {
    const { email, firstName, internalKey } = await request.json()

    // Vérification clé interne — seul le server action auth.ts peut appeler
    if (internalKey !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16)) {
      return NextResponse.json({ error: 'error.unauthorized' }, { status: 401 })
    }

    if (!email || !firstName) {
      return NextResponse.json({ error: 'error.missingFields' }, { status: 400 })
    }

    const brevoApiKey = process.env.BREVO_API_KEY
    if (!brevoApiKey) {
      log.warn({ email, firstName }, 'Brevo non configuré — email non envoyé')
      return NextResponse.json({ success: true, message: 'Brevo non configuré, email logué' })
    }

    // Template HTML de l'email de bienvenue
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f1f5f9; }
    .container { max-width: 560px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px 24px; text-align: center; }
    .header h1 { color: #10b981; font-size: 24px; margin: 0; }
    .header p { color: #94a3b8; font-size: 14px; margin-top: 4px; }
    .body { padding: 32px 24px; }
    .body h2 { color: #0f172a; font-size: 20px; margin: 0 0 16px; }
    .body p { color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
    .features { background: #f0fdf4; border-radius: 12px; padding: 16px; margin: 16px 0; }
    .features li { color: #166534; font-size: 13px; margin-bottom: 8px; }
    .cta { display: inline-block; background: #10b981; color: white !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 8px; }
    .footer { padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>InternLog</h1>
      <p>Logbook Médical DES</p>
    </div>
    <div class="body">
      <h2>Bienvenue ${firstName} !</h2>
      <p>
        Votre compte InternLog a été créé avec succès. Vous pouvez maintenant commencer à enregistrer
        vos interventions et suivre votre progression dans votre formation DES.
      </p>
      <div class="features">
        <ul>
          <li>Enregistrez vos interventions (opérateur, assistant, observateur)</li>
          <li>Suivez votre progression vers les objectifs DES</li>
          <li>Gérez votre calendrier de gardes</li>
          <li>Accédez au référentiel médical (techniques, CRO, ordonnances)</li>
          <li>Dashboard avec statistiques et graphiques</li>
        </ul>
      </div>
      <p>Connectez-vous dès maintenant pour commencer :</p>
      <a href="https://internlog.app/login" class="cta">Se connecter</a>
    </div>
    <div class="footer">
      <p>InternLog — Logbook Médical DES</p>
    </div>
  </div>
</body>
</html>`

    // Envoi via Brevo API v3 (transactional email)
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'InternLog',
          email: process.env.BREVO_SENDER_EMAIL || 'noreply@internlog.app',
        },
        to: [{ email, name: firstName }],
        subject: `Bienvenue sur InternLog, ${firstName} !`,
        htmlContent,
      }),
    })

    if (!brevoRes.ok) {
      const error = await brevoRes.text()
      log.error({ err: error, email }, 'Erreur Brevo envoi email')
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    }

    const result = await brevoRes.json()
    log.info({ email, messageId: result.messageId }, 'Email de bienvenue envoyé via Brevo')

    // Aussi créer le contact dans Brevo pour le CRM
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        attributes: { PRENOM: firstName },
        listIds: process.env.BREVO_LIST_ID ? [parseInt(process.env.BREVO_LIST_ID)] : [],
        updateEnabled: true,
      }),
    }).catch((err) => log.error({ err, email }, 'Erreur création contact Brevo'))

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    log.error({ err: error }, 'Erreur route send-welcome')
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
