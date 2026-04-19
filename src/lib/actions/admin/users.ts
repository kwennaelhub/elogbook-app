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
 *  - Refus si l'utilisateur a des références non-cascade (activité historique) :
 *      • entries.supervisor_id ou entries.validated_by pointant sur lui
 *      • audit_log.user_id (historique d'actions admin)
 *      • feedback.user_id
 *      • templates (cro, prescription, surgical, des_objectives, des_registry)
 *      • gardes.created_by ou gardes.senior_id
 *    Ces refus protègent l'intégrité du dossier médical — si un superviseur a
 *    validé des actes, le supprimer ferait perdre la traçabilité des validations.
 *    Dans ces cas, l'admin doit passer par une procédure d'anonymisation
 *    (non implémentée ici — à ajouter si besoin).
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

  // 4. Vérifier les références non-cascade qui bloqueraient le DELETE
  //    (on utilise le client cookie — superadmin a les SELECT policies nécessaires)
  const blockingChecks = await Promise.all([
    supabase.from('entries').select('id', { count: 'exact', head: true }).eq('supervisor_id', userId),
    supabase.from('entries').select('id', { count: 'exact', head: true }).eq('validated_by', userId),
    supabase.from('audit_log').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  const [supervisedEntries, validatedEntries, auditEntries, feedbackEntries] = blockingChecks
  const blockers: string[] = []
  if ((supervisedEntries.count ?? 0) > 0) blockers.push(`${supervisedEntries.count} actes supervisés`)
  if ((validatedEntries.count ?? 0) > 0) blockers.push(`${validatedEntries.count} actes validés`)
  if ((auditEntries.count ?? 0) > 0) blockers.push(`${auditEntries.count} entrées d'audit`)
  if ((feedbackEntries.count ?? 0) > 0) blockers.push(`${feedbackEntries.count} feedbacks`)

  if (blockers.length > 0) {
    log.warn(
      { targetId: userId, targetEmail: target.email, blockers },
      'Suppression utilisateur bloquée par références historiques'
    )
    return {
      error: `admin.error.deleteBlocked::${blockers.join(', ')}`,
    }
  }

  // 5. Snapshot pour audit AVANT la suppression (impossible de retrouver après)
  const snapshot = { ...target }

  // 6. Suppression effective via service_role
  //    auth.admin.deleteUser() supprime auth.users → cascade sur profiles
  //    → cascade sur entries(user_id), gardes, subscriptions, etc.
  const serviceClient = await createServiceClient()
  const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId)

  if (deleteError) {
    log.error(
      { targetId: userId, targetEmail: target.email, error: deleteError.message },
      'Échec suppression utilisateur (service_role)'
    )
    return { error: deleteError.message }
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

export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  opts: { tempPassword?: string; role?: string; title?: string } = {},
) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const internalKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) || ''
    const response = await fetch(`${baseUrl}/api/send-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        firstName,
        internalKey,
        tempPassword: opts.tempPassword,
        role: opts.role,
        title: opts.title,
      }),
    })
    if (!response.ok) {
      log.warn({ email }, 'Email de bienvenue non envoyé (réponse non-ok)')
    }
  } catch {
    log.warn({ email }, 'Email de bienvenue non disponible')
  }
}
