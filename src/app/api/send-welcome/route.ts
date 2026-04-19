import { NextRequest, NextResponse } from 'next/server'
import { emailLogger as log } from '@/lib/logger'

// API interne pour l'envoi d'emails de bienvenue via Brevo API v3
// Appelée automatiquement à l'inscription d'un nouvel utilisateur
// Protégée par clé interne pour empêcher les appels externes
export async function POST(request: NextRequest) {
  try {
    const { email, firstName, internalKey, tempPassword, role, title } = await request.json()

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

    // Template DES (par défaut) vs template superviseur (quand tempPassword présent)
    const isSupervisorInvite = typeof tempPassword === 'string' && tempPassword.length > 0
    const displayName = title ? `${title} ${firstName}` : firstName
    const subject = isSupervisorInvite
      ? `Votre compte InternLog est prêt — ${displayName}`
      : `Bienvenue sur InternLog, ${firstName} !`

    const htmlStyles = `
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
    .credentials { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 16px; margin: 16px 0; }
    .credentials p { margin: 0 0 8px; color: #78350f; font-size: 13px; }
    .credentials code { background: #0f172a; color: #10b981; padding: 8px 12px; border-radius: 6px; font-family: 'SF Mono', Menlo, monospace; font-size: 13px; display: inline-block; letter-spacing: 0.5px; word-break: break-all; }
    .warning { background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 8px; margin: 16px 0; }
    .warning p { color: #7f1d1d; font-size: 13px; margin: 0; }
    .cta { display: inline-block; background: #10b981; color: white !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 8px; }
    .cta-secondary { display: inline-block; background: white; color: #0f172a !important; border: 1px solid #e2e8f0; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-left: 8px; }
    .footer { padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0; }`

    const supervisorBody = isSupervisorInvite ? `
      <h2>Votre compte InternLog a été créé</h2>
      <p>
        Bonjour ${displayName}, un administrateur de votre hôpital vient de créer votre compte
        superviseur sur InternLog — la plateforme de logbook des étudiants en DES.
      </p>
      <p>En tant que superviseur, vous pourrez :</p>
      <div class="features">
        <ul>
          <li>Valider les interventions que les DES réalisent sous votre supervision</li>
          <li>Commenter et rejeter une entrée si les informations sont incorrectes</li>
          <li>Consulter l'historique et la progression des DES assignés</li>
          <li>Recevoir des notifications quand un DES soumet une intervention</li>
        </ul>
      </div>
      <div class="credentials">
        <p><strong>Vos identifiants de connexion</strong></p>
        <p>Email : <code>${email}</code></p>
        <p style="margin-top:12px">Mot de passe temporaire :</p>
        <code>${tempPassword}</code>
      </div>
      <div class="warning">
        <p>
          🔒 <strong>Important</strong> — Changez votre mot de passe dès votre première connexion
          depuis l'onglet <em>Paramètres → Sécurité</em>. Ce mot de passe temporaire ne doit pas
          être réutilisé et ne vous sera plus communiqué.
        </p>
      </div>
      <p>
        <a href="https://internlog.app/login" class="cta">Se connecter</a>
        <a href="https://internlog.app/settings" class="cta-secondary">Changer le mot de passe</a>
      </p>
      <p style="font-size:12px;color:#94a3b8;margin-top:24px">
        Si vous n'êtes pas à l'origine de cette demande ou ne connaissez pas InternLog, ignorez
        simplement cet email — aucune action ne sera engagée sur votre adresse.
      </p>
    ` : `
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
    `

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${htmlStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>InternLog</h1>
      <p>Logbook Médical DES ${role === 'supervisor' ? '— Espace superviseur' : ''}</p>
    </div>
    <div class="body">${supervisorBody}</div>
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
        to: [{ email, name: displayName }],
        subject,
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
