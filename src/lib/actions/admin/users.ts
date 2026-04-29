'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAdminScope, canManageDES } from './helpers'
import { adminLogger as log } from '@/lib/logger'
import type { UserRole } from '@/types/database'

// ========== GESTION DES RÔLES ==========

export async function updateUserRole(userId: string, newRole: string) {
  const { supabase, role: callerRole } = await requireAdminScope()

  const validRoles: UserRole[] = [
    'student',
    'supervisor',
    'service_chief',
    'institution_admin',
    'admin',
    'superadmin',
    'developer',
  ]
  if (!validRoles.includes(newRole as UserRole)) {
    return { error: 'admin.error.invalidRole' }
  }

  // Rôles réservés developer
  if (['developer', 'superadmin', 'institution_admin'].includes(newRole) && callerRole !== 'developer') {
    return { error: 'admin.error.developerOnly' }
  }

  // Phase C — institution_admin peut promouvoir dans son hôpital mais
  // uniquement vers student/supervisor/service_chief, et seulement sur ses DES.
  if (callerRole === 'institution_admin') {
    const institutionAllowed: UserRole[] = ['student', 'supervisor', 'service_chief']
    if (!institutionAllowed.includes(newRole as UserRole)) {
      return { error: 'admin.error.developerOnly' }
    }
    const canManage = await canManageDES(userId)
    if (!canManage) {
      return { error: 'admin.error.userBelongsToOtherHospital' }
    }
  }

  const { data: target } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (target?.role === 'developer') {
    return { error: 'admin.error.devRoleIrrevocable' }
  }

  // Empêche institution_admin de modifier un autre admin (global ou scopé)
  if (callerRole === 'institution_admin' && target?.role) {
    const upperTargetRoles: UserRole[] = ['admin', 'superadmin', 'developer', 'institution_admin']
    if (upperTargetRoles.includes(target.role as UserRole)) {
      return { error: 'admin.error.developerOnly' }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) return { error: error.message }
  return { success: true }
}

// ========== PROFIL UTILISATEUR ==========

export async function updateProfile(data: {
  first_name?: string
  last_name?: string
  phone?: string
  hospital_id?: string
  des_level?: string
  date_of_birth?: string
  avatar_url?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  const updates: Record<string, unknown> = {}
  if (data.first_name !== undefined) updates.first_name = data.first_name
  if (data.last_name !== undefined) updates.last_name = data.last_name
  if (data.phone !== undefined) updates.phone = data.phone || null
  if (data.hospital_id !== undefined) updates.hospital_id = data.hospital_id || null
  if (data.des_level !== undefined) updates.des_level = data.des_level || null
  if (data.date_of_birth !== undefined) updates.date_of_birth = data.date_of_birth || null
  if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url || null

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

// ========== SUPPRESSION UTILISATEUR ==========

/**
 * Supprime un utilisateur de auth.users — cascade sur profiles et les tables
 * liées avec ON DELETE CASCADE (entries, gardes, subscriptions, seat_assignments,
 * supervisor_assignments, notes, patient_followups, followup_events).
 *
 * Protections bloquantes :
 *  - Le développeur est indélébile
 *  - Le superadmin n'est supprimable QUE par un développeur
 *  - Impossible de se supprimer soi-même
 *  - Refus atomique si références historiques existantes. Les FKs suivantes
 *    sont ON DELETE RESTRICT (migration 00000000000007), Postgres échoue
 *    avec SQLSTATE 23503 — pas de TOCTOU entre check et delete :
 *      • entries.supervisor_id, entries.validated_by
 *      • audit_log.user_id
 *      • feedback.user_id
 *      • gardes.senior_id, gardes.created_by
 *      • cro_templates.created_by, prescription_templates.created_by
 *      • des_registry.added_by, des_objectives.(created_by|updated_by)
 *    Ces refus protègent l'intégrité du dossier médical. Pour réattribuer
 *    ces références avant suppression, une procédure d'anonymisation
 *    dédiée est à implémenter (hors scope MVP).
 *
 * Phase B — Scoping home_hospital_id :
 *  - developer/superadmin/admin → peuvent supprimer n'importe quel DES
 *  - institution_admin → peut supprimer uniquement les DES dont
 *    home_hospital_id = son hospital_id
 */
export async function deleteUser(userId: string) {
  const { supabase, user: caller, role: callerRole } = await requireAdminScope()

  // 1. Protection auto-suppression
  if (userId === caller.id) {
    return { error: 'admin.error.cannotDeleteSelf' }
  }

  // 2. Récupérer le profil cible (pour logs + checks)
  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id, role, first_name, last_name, email, matricule, home_hospital_id')
    .eq('id', userId)
    .single()

  if (targetError || !target) {
    return { error: 'admin.error.userNotFound' }
  }

  // 2bis. Phase C — scoping home_hospital pour institution_admin
  if (!['admin', 'superadmin', 'developer'].includes(callerRole)) {
    const allowed = await canManageDES(userId)
    if (!allowed) {
      return { error: 'admin.error.cannotDeleteOutsideHomeHospital' }
    }
  }

  // 3. Protection rôles élevés
  if (target.role === 'developer') {
    return { error: 'admin.error.cannotDeleteDeveloper' }
  }
  if (target.role === 'superadmin' && callerRole !== 'developer') {
    return { error: 'admin.error.superadminOnlyByDev' }
  }

  // 4. Snapshot pour audit AVANT la suppression (impossible de retrouver après)
  const snapshot = { ...target }

  // 5. Suppression effective via service_role.
  //    Les FKs entries.supervisor_id / entries.validated_by / audit_log.user_id /
  //    feedback.user_id / gardes.senior_id / templates.created_by sont toutes
  //    ON DELETE RESTRICT (migration 00000000000007). Postgres rejette le
  //    DELETE atomiquement avec code 23503 si une référence existe, ce qui
  //    ferme la fenêtre TOCTOU qu'un check préalable laissait ouverte.
  //    Les FKs CASCADE restantes (entries.user_id, gardes.user_id,
  //    subscriptions, seat_assignments, notes, patient_followups,
  //    followup_events, supervisor_assignments.student_id) se propagent
  //    correctement — c'est le logbook du DES supprimé.
  const serviceClient = await createServiceClient()
  const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId)

  if (deleteError) {
    const code = (deleteError as { code?: string }).code
    const msg = deleteError.message || ''
    if (code === '23503' || msg.includes('foreign key') || msg.includes('violates')) {
      log.warn(
        { targetId: userId, targetEmail: target.email, err: msg },
        'Suppression utilisateur bloquée par références historiques (FK RESTRICT)'
      )
      return { error: 'admin.error.deleteBlocked' }
    }
    log.error(
      { targetId: userId, targetEmail: target.email, error: msg },
      'Échec suppression utilisateur (service_role)'
    )
    return { error: 'admin.error.deleteFailed' }
  }

  // 7. Audit log de l'action (inséré via service_role car le profil cible
  //    n'existe plus donc les FKs/RLS classiques ne s'appliquent pas)
  await serviceClient.from('audit_log').insert({
    user_id: caller.id,
    action: 'delete_user',
    table_name: 'profiles',
    record_id: userId,
    old_data: snapshot,
    new_data: null,
  })

  log.info(
    {
      callerId: caller.id,
      targetId: userId,
      targetEmail: target.email,
      targetRole: target.role,
    },
    'Utilisateur supprimé avec succès'
  )

  return { success: true }
}

// ========== EMAIL DE BIENVENUE ==========

/**
 * Envoie l'email de bienvenue directement via l'API Brevo.
 * Appelé depuis server actions (register, createSupervisor) — ne fait PAS de
 * round-trip HTTP vers /api/send-welcome (sur Vercel l'appel interne est
 * souvent coupé avant completion quand utilisé via after()).
 *
 * @param opts.tempPassword Si présent, utilise le template superviseur
 *                          (credentials block + warning changement MDP)
 */
export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  opts: { tempPassword?: string; role?: string; title?: string } = {},
) {
  try {
    const brevoApiKey = process.env.BREVO_API_KEY
    if (!brevoApiKey) {
      log.warn({ email, firstName }, 'Brevo non configuré — email ignoré')
      return
    }

    const isSupervisorInvite = typeof opts.tempPassword === 'string' && opts.tempPassword.length > 0
    const displayName = opts.title ? `${opts.title} ${firstName}` : firstName
    const subject = isSupervisorInvite
      ? `Votre compte InternLog est prêt — ${displayName}`
      : `Bienvenue sur InternLog, ${firstName} !`
    // URL d'invitation : force la déconnexion de toute session admin déjà
    // ouverte dans le navigateur du destinataire + pré-remplit son email.
    const inviteLoginUrl = `https://internlog.app/login?invite=1&email=${encodeURIComponent(email)}`

    const styles = `
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

    const supervisorBody = `
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
        <code>${opts.tempPassword}</code>
      </div>
      <div class="warning">
        <p>
          🔒 <strong>Important</strong> — Changez votre mot de passe dès votre première connexion
          depuis l'onglet <em>Paramètres → Sécurité</em>. Ce mot de passe temporaire ne doit pas
          être réutilisé et ne vous sera plus communiqué.
        </p>
      </div>
      <p>
        <a href="${inviteLoginUrl}" class="cta">Se connecter</a>
        <a href="${inviteLoginUrl}" class="cta-secondary">Changer le mot de passe</a>
      </p>
      <p style="font-size:12px;color:#94a3b8;margin-top:16px;line-height:1.6">
        Si les boutons ne s'affichent pas, copiez-collez ce lien dans votre navigateur :<br>
        🔗 <a href="${inviteLoginUrl}" style="color:#0f172a">${inviteLoginUrl}</a>
      </p>
      <p style="font-size:12px;color:#94a3b8;margin-top:16px">
        Si vous n'êtes pas à l'origine de cette demande ou ne connaissez pas InternLog, ignorez
        simplement cet email — aucune action ne sera engagée sur votre adresse.
      </p>`

    const studentBody = `
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
          <li>Accédez au référentiel médical</li>
        </ul>
      </div>
      <p>Connectez-vous dès maintenant pour commencer :</p>
      <a href="https://internlog.app/login" class="cta">Se connecter</a>`

    const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${styles}</style></head><body>
  <div class="container">
    <div class="header">
      <h1>InternLog</h1>
      <p>Logbook Médical DES${opts.role === 'supervisor' ? ' — Espace superviseur' : ''}</p>
    </div>
    <div class="body">${isSupervisorInvite ? supervisorBody : studentBody}</div>
    <div class="footer"><p>InternLog — Logbook Médical DES</p></div>
  </div>
</body></html>`

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
      const errTxt = await brevoRes.text().catch(() => '?')
      log.error({ email, err: errTxt, status: brevoRes.status }, 'Brevo send échoué')
      return
    }

    const result = await brevoRes.json().catch(() => ({}))
    log.info({ email, messageId: result.messageId, invite: isSupervisorInvite }, 'Email envoyé via Brevo')
  } catch (err) {
    log.warn({ email, err }, 'Email de bienvenue non disponible')
  }
}
