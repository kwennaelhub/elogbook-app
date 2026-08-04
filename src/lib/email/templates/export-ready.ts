/**
 * Email Brevo — Notification "Votre export RGPD est prêt".
 * Envoyé après un POST /api/user/export réussi.
 */

import { emailLogger as log } from '@/lib/logger'

type ExportReadyOpts = {
  email: string
  firstName: string
  downloadUrl: string
  rowCount: number
  sizeKb: number
  expiresInHours: number
}

const STYLES = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f1f5f9; }
.container { max-width: 560px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px 24px; text-align: center; }
.header h1 { color: #10b981; font-size: 24px; margin: 0; }
.header p { color: #94a3b8; font-size: 14px; margin-top: 4px; }
.body { padding: 32px 24px; }
.body h2 { color: #0f172a; font-size: 20px; margin: 0 0 16px; }
.body p { color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
.summary { background: #f0fdf4; border-radius: 12px; padding: 16px; margin: 16px 0; }
.summary p { margin: 0 0 8px; color: #166534; font-size: 13px; }
.summary strong { color: #14532d; }
.warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px; margin: 16px 0; }
.warning p { color: #78350f; font-size: 13px; margin: 0; }
.cta { display: inline-block; background: #10b981; color: white !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 8px; }
.footer { padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
.footer p { color: #94a3b8; font-size: 12px; margin: 0; }
`

export async function sendExportReadyEmail(opts: ExportReadyOpts): Promise<void> {
  try {
    const brevoApiKey = process.env.BREVO_API_KEY
    if (!brevoApiKey) {
      log.warn({ email: opts.email }, 'Brevo non configuré — email export RGPD ignoré')
      return
    }

    const displayName = opts.firstName || 'utilisateur'
    const subject = 'Votre export de données InternLog est prêt'

    const htmlContent = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>${subject}</title><style>${STYLES}</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>InternLog</h1>
      <p>Export de vos données personnelles</p>
    </div>
    <div class="body">
      <h2>Bonjour ${displayName},</h2>
      <p>
        Votre demande d'export de données personnelles au titre de l'article 20 du RGPD
        (droit à la portabilité) a été traitée avec succès.
      </p>
      <div class="summary">
        <p><strong>${opts.rowCount}</strong> enregistrements exportés</p>
        <p>Taille du fichier : <strong>${opts.sizeKb} Ko</strong></p>
        <p>Format : <strong>JSON</strong> (portable, lisible dans tout éditeur de texte)</p>
      </div>
      <p>
        Vous pouvez télécharger votre archive en cliquant sur le bouton ci-dessous.
        Le lien est personnel et expire dans <strong>${opts.expiresInHours} heures</strong>.
      </p>
      <p><a href="${opts.downloadUrl}" class="cta">Télécharger mon export</a></p>
      <div class="warning">
        <p>
          🔒 Ce fichier contient vos données personnelles (profil, interventions, gardes,
          notes, historique). Conservez-le dans un endroit sûr. Si vous ne l'avez pas demandé,
          contactez immédiatement le support.
        </p>
      </div>
      <p style="font-size:12px;color:#94a3b8;margin-top:16px;line-height:1.6">
        Si le bouton ne s'affiche pas, copiez-collez ce lien dans votre navigateur :<br>
        🔗 <a href="${opts.downloadUrl}" style="color:#0f172a;word-break:break-all">${opts.downloadUrl}</a>
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
        'Brevo send export-ready échoué',
      )
      return
    }

    log.info({ email: opts.email, rowCount: opts.rowCount }, 'Email export-ready envoyé')
  } catch (err) {
    log.warn({ email: opts.email, err }, 'Envoi email export-ready impossible')
  }
}
