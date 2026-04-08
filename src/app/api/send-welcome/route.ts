import { NextRequest, NextResponse } from 'next/server'

// API interne pour l'envoi d'emails de bienvenue
// Appelée automatiquement à l'inscription d'un nouvel utilisateur
export async function POST(request: NextRequest) {
  try {
    const { email, firstName } = await request.json()

    if (!email || !firstName) {
      return NextResponse.json({ error: 'Email et prénom requis' }, { status: 400 })
    }

    // Utilise Resend, Brevo ou tout autre service email configuré
    // Pour l'instant, on log l'email et on retourne un succès
    // L'email de confirmation Supabase est déjà envoyé automatiquement
    console.log(`[WELCOME EMAIL] → ${email} (${firstName})`)

    // Template HTML de l'email de bienvenue
    const htmlContent = `
<!DOCTYPE html>
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
      <h1>🏥 InternLog</h1>
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
          <li>📋 Enregistrez vos interventions (opérateur, assistant, observateur)</li>
          <li>📊 Suivez votre progression vers les objectifs DES</li>
          <li>📅 Gérez votre calendrier de gardes</li>
          <li>📖 Accédez au référentiel médical (techniques, CRO, ordonnances)</li>
          <li>📈 Dashboard avec statistiques et graphiques</li>
        </ul>
      </div>
      <p>
        Connectez-vous dès maintenant pour commencer :
      </p>
      <a href="https://elogbook-app.vercel.app/login" class="cta">Se connecter →</a>
    </div>
    <div class="footer">
      <p>InternLog — Logbook Médical DES</p>
    </div>
  </div>
</body>
</html>`

    // TODO: Intégrer avec un service d'email réel (Resend, Brevo, Nodemailer)
    // Pour l'instant, l'email sera envoyé via Supabase Auth (confirmation d'email)
    // Le template ci-dessus est prêt à être utilisé avec un service d'envoi

    return NextResponse.json({
      success: true,
      message: 'Email de bienvenue préparé (en attente du service d\'envoi)',
    })
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
