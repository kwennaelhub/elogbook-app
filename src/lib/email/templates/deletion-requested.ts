/**
 * Email Brevo — Notification "Demande de suppression enregistrée".
 * Envoyé après un POST /api/account/delete réussi.
 * Rappelle la fenêtre de 30 jours et le lien d'annulation.
 */

import { emailLogger as log } from '@/lib/logger'

type DeletionRequestedOpts = {
  email: string
  firstName: string
  scheduledFor: Date
  cancelUrl: string
}

const STYLES = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f1f5f9; }
.container { max-width: 560px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.header { background: linear-gradient(135deg, #7f1d1d, #991b1b); padding: 32px 24px; text-align: center; }
.header h1 { color: #fecaca; font-size: 24px; margin: 0; }
.header p { color: #fca5a5; font-size: 14px; margin-top: 4px; }
.body { padding: 32px 24px; }
.body h2 { color: #0f172a; font-size: 20px; margin: 0 0 16px; }
.body p { color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
.countdown { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
.countdown .date { color: #991b1b; font-size: 22px; font-weight: 700; margin: 0; }
.countdown .label { color: #7f1d1d; font-size: 13px; margin: 4px 0 0; }
.info { background: #f0f9ff; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 8px; margin: 16px 0; }
.info p { color: #075985; font-size: 13px; margin: 0; }
.cta-cancel { display: inline-block; background: #10b981; color: white !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 8px; }
.footer { padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
.footer p { color: #94a3b8; font-size: 12px; margin: 0; }
`

export async function sendDeletionRequestedEmail(opts: DeletionRequestedOpts): Promise<void> {
  try {
    const brevoApiKey = process.env.BREVO_API_KEY
    if (!brevoApiKey) {
      log.warn({ email: opts.email }, 'Brevo non configuré — email deletion-requested ignoré')
      return
    }

    const displayName = opts.firstName || 'utilisateur'
    const subject = 'Suppression de votre compte InternLog — action requise sous 30 jours'
    const formattedDate = new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(opts.scheduledFor)

    const htmlContent = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>${subject}</title><style>${STYLES}</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>InternLog</h1>
      <p>Demande de suppression enregistrée</p>
    </div>
    <div class="body">
      <h2>Bonjour ${displayName},</h2>
      <p>
        Vous avez demandé la suppression de votre compte InternLog conformément à
        l'article 17 du RGPD (droit à l'effacement). Cette demande est enregistrée
        et sera exécutée automatiquement après un délai de 30 jours.
      </p>
      <div class="countdown">
        <p class="date">${formattedDate}</p>
        <p class="label">Date d'effacement effectif</p>
      </div>
      <p>
        Pendant ces 30 jours, votre compte reste accessible en lecture seule. Vous ne
        pouvez plus créer ni modifier d'entrées, de gardes ou de notes. À l'issue du
        délai, toutes vos données personnelles seront supprimées ou anonymisées
        (interventions référencées par vos superviseurs pour préserver leur valeur
        académique).
      </p>
      <div class="info">
        <p>
          💡 <strong>Vous avez changé d'avis&nbsp;?</strong> Vous pouvez annuler cette
          demande à tout moment avant le ${formattedDate} en vous connectant et en
          cliquant sur le bouton ci-dessous.
        </p>
      </div>
      <p><a href="${opts.cancelUrl}" class="cta-cancel">Annuler ma demande de suppression</a></p>
      <p style="font-size:12px;color:#94a3b8;margin-top:16px;line-height:1.6">
        Si vous n'êtes pas à l'origine de cette demande, connectez-vous immédiatement
        et annulez-la. Changez également votre mot de passe depuis
        <em>Paramètres → Sécurité</em>.<br><br>
        Lien direct : 🔗 <a href="${opts.cancelUrl}" style="color:#0f172a;word-break:break-all">${opts.cancelUrl}</a>
      </p>
    </div>
    <div class="footer"><p>InternLog — Logbook Médical DES</p></div>
  </div>
</body>
</html>`

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'InternLog',
          email: process.env.BREVO_SENDER_EMAIL || 'noreply@internlog.app',
        },
        to: [{ email: opts.email, name: displayName }],
        subject,
        htmlContent,
      }),
    })

    if (!res.ok) {
      const errTxt = await res.text().catch(() => '?')
      log.error(
        { email: opts.email, err: errTxt, status: res.status },
        'Brevo send deletion-requested échoué',
      )
      return
    }

    log.info({ email: opts.email, scheduledFor: opts.scheduledFor }, 'Email deletion-requested envoyé')
  } catch (err) {
    log.warn({ email: opts.email, err }, 'Envoi email deletion-requested impossible')
  }
}
