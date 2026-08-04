/**
 * RGPD — Export self-service des données utilisateur (Art. 20).
 *
 * Collecte l'intégralité des données personnelles d'un utilisateur
 * réparties dans les tables métier InternLog et retourne un objet JSON
 * portable et lisible.
 *
 * Utilisé par POST /api/user/export.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type UserExportBundle = {
  meta: {
    exported_at: string
    user_id: string
    export_version: '1.0'
    format: 'json'
    gdpr_article: '20 (portabilité)'
    notice: string
  }
  profile: Record<string, unknown> | null
  entries: Record<string, unknown>[]
  gardes: Record<string, unknown>[]
  notes: Record<string, unknown>[]
  patient_followups: Record<string, unknown>[]
  followup_events: Record<string, unknown>[]
  feedback: Record<string, unknown>[]
  subscriptions: Record<string, unknown>[]
  cro_templates: Record<string, unknown>[]
  prescription_templates: Record<string, unknown>[]
  preop_templates: Record<string, unknown>[]
  seat_assignments: Record<string, unknown>[]
  supervisor_assignments: Record<string, unknown>[]
  des_registry: Record<string, unknown>[]
  audit_log_own_actions: Record<string, unknown>[]
}

const NOTICE = [
  'Ce fichier contient toutes vos données personnelles conservées par InternLog',
  'à la date de l\'export, conformément à l\'article 20 du RGPD (droit à la',
  'portabilité). Les données référencées par d\'autres utilisateurs (ex. vos',
  'interventions validées par un superviseur) restent visibles pour eux même',
  'si vous supprimez votre compte, sauf demande explicite au support.',
].join(' ')

/**
 * Collecte toutes les données personnelles d'un utilisateur à partir d'un
 * client Supabase authentifié en tant que ce user (les RLS s'appliquent
 * donc l'utilisateur ne peut pas exfiltrer autre chose que ses propres
 * données — c'est délibéré et vérifiable).
 */
export async function collectUserData(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserExportBundle> {
  const [
    profile,
    entries,
    gardes,
    notes,
    patientFollowups,
    followupEvents,
    feedback,
    subscriptions,
    croTemplates,
    prescriptionTemplates,
    preopTemplates,
    seatAssignments,
    supervisorAssignments,
    desRegistry,
    auditLog,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('entries').select('*').eq('user_id', userId),
    supabase.from('gardes').select('*').eq('user_id', userId),
    supabase.from('notes').select('*').eq('user_id', userId),
    supabase.from('patient_followups').select('*').eq('user_id', userId),
    supabase.from('followup_events').select('*').eq('created_by', userId),
    supabase.from('feedback').select('*').eq('user_id', userId),
    supabase.from('subscriptions').select('*').eq('user_id', userId),
    supabase.from('cro_templates').select('*').eq('created_by', userId),
    supabase.from('prescription_templates').select('*').eq('created_by', userId),
    supabase.from('preop_templates').select('*').eq('created_by', userId),
    supabase.from('seat_assignments').select('*').eq('user_id', userId),
    supabase.from('supervisor_assignments').select('*').or(`student_id.eq.${userId},supervisor_id.eq.${userId}`),
    supabase.from('des_registry').select('*').eq('registry_id', userId),
    supabase.from('audit_log').select('*').eq('user_id', userId),
  ])

  return {
    meta: {
      exported_at: new Date().toISOString(),
      user_id: userId,
      export_version: '1.0',
      format: 'json',
      gdpr_article: '20 (portabilité)',
      notice: NOTICE,
    },
    profile: profile.data ?? null,
    entries: entries.data ?? [],
    gardes: gardes.data ?? [],
    notes: notes.data ?? [],
    patient_followups: patientFollowups.data ?? [],
    followup_events: followupEvents.data ?? [],
    feedback: feedback.data ?? [],
    subscriptions: subscriptions.data ?? [],
    cro_templates: croTemplates.data ?? [],
    prescription_templates: prescriptionTemplates.data ?? [],
    preop_templates: preopTemplates.data ?? [],
    seat_assignments: seatAssignments.data ?? [],
    supervisor_assignments: supervisorAssignments.data ?? [],
    des_registry: desRegistry.data ?? [],
    audit_log_own_actions: auditLog.data ?? [],
  }
}

/**
 * Compte le nombre total de lignes exportées, utilisé pour l'email
 * de confirmation ("votre export contient N enregistrements").
 */
export function countExportRows(bundle: UserExportBundle): number {
  return (
    (bundle.profile ? 1 : 0) +
    bundle.entries.length +
    bundle.gardes.length +
    bundle.notes.length +
    bundle.patient_followups.length +
    bundle.followup_events.length +
    bundle.feedback.length +
    bundle.subscriptions.length +
    bundle.cro_templates.length +
    bundle.prescription_templates.length +
    bundle.preop_templates.length +
    bundle.seat_assignments.length +
    bundle.supervisor_assignments.length +
    bundle.des_registry.length +
    bundle.audit_log_own_actions.length
  )
}
