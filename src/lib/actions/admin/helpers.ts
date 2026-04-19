'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'
import { GLOBAL_ADMIN_ROLES } from '@/types/database'

/**
 * Récupère le profil complet de l'utilisateur courant (id, rôle, hôpital, service).
 * Utilisé par tous les helpers de permission pour scoper les accès Phase B.
 */
async function getCurrentProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('error.unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, hospital_id, home_hospital_id, service_id')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('error.forbidden')
  return { supabase, user, profile }
}

/**
 * Admin legacy : role ∈ { admin, superadmin, developer }.
 * Garde la sémantique historique — utilisé partout où le scoping hôpital
 * n'est pas encore implémenté. À remplacer progressivement par requireHospitalAdmin.
 */
export async function requireAdmin() {
  const { supabase, user, profile } = await getCurrentProfile()

  if (!GLOBAL_ADMIN_ROLES.includes(profile.role as UserRole)) {
    throw new Error('error.forbidden')
  }
  return { supabase, user, role: profile.role as UserRole }
}

/**
 * Developer only — accès débug / cross-hôpital / validations institutionnelles.
 */
export async function requireDeveloper() {
  const { supabase, user, profile } = await getCurrentProfile()

  if (profile.role !== 'developer') {
    throw new Error('Accès réservé au développeur')
  }
  return { supabase, user }
}

/**
 * Accès admin sans hôpital cible explicite — pour les listes/searches.
 * Retourne le scope du caller :
 *   - scope='global' → admins globaux, pas de filtre hôpital à appliquer
 *   - scope='hospital' → institution_admin, filtrer les résultats par hospitalId
 *
 * Phase C — utilisé par les actions LIST (getInstitutionalSeats, searchUsers…)
 * qui ne reçoivent pas de hospitalId mais doivent rester scopées.
 */
export async function requireAdminScope() {
  const { supabase, user, profile } = await getCurrentProfile()

  const role = profile.role as UserRole

  if (GLOBAL_ADMIN_ROLES.includes(role)) {
    return { supabase, user, role, scope: 'global' as const, hospitalId: null as string | null }
  }

  if (role === 'institution_admin' && profile.hospital_id) {
    return {
      supabase,
      user,
      role,
      scope: 'hospital' as const,
      hospitalId: profile.hospital_id as string,
    }
  }

  throw new Error('error.forbidden')
}

/**
 * Admin d'un hôpital donné :
 *   - developer / superadmin / admin → toujours autorisé (cross-hôpital)
 *   - institution_admin → seulement si hospitalId = son hospital_id
 *
 * Phase B — remplace progressivement requireAdmin() pour les opérations
 * scopées (services, DES, settings d'un hôpital donné).
 */
export async function requireHospitalAdmin(hospitalId: string) {
  const { supabase, user, profile } = await getCurrentProfile()

  const role = profile.role as UserRole

  // Admins globaux : accès inconditionnel
  if (GLOBAL_ADMIN_ROLES.includes(role)) {
    return { supabase, user, role, scope: 'global' as const }
  }

  // Institution admin : uniquement sur son hôpital
  if (role === 'institution_admin' && profile.hospital_id === hospitalId) {
    return { supabase, user, role, scope: 'hospital' as const }
  }

  throw new Error('error.forbidden_hospital_scope')
}

/**
 * Chef de service d'un service donné :
 *   - developer / superadmin / admin → toujours autorisé
 *   - institution_admin → autorisé sur les services de son hôpital
 *   - service_chief → autorisé uniquement sur SON service (profile.service_id)
 *
 * Phase B — utilisé pour validation d'interventions, gestion des DES du service,
 * assignation de stages.
 */
export async function requireServiceChief(serviceId: string) {
  const { supabase, user, profile } = await getCurrentProfile()

  const role = profile.role as UserRole

  if (GLOBAL_ADMIN_ROLES.includes(role)) {
    return { supabase, user, role, scope: 'global' as const }
  }

  // Charger le service pour vérifier l'hôpital
  const { data: service } = await supabase
    .from('hospital_services')
    .select('id, hospital_id, chief_id')
    .eq('id', serviceId)
    .single()

  if (!service) throw new Error('error.service_not_found')

  if (role === 'institution_admin' && profile.hospital_id === service.hospital_id) {
    return { supabase, user, role, scope: 'hospital' as const }
  }

  if (role === 'service_chief' && service.chief_id === user.id) {
    return { supabase, user, role, scope: 'service' as const }
  }

  throw new Error('error.forbidden_service_scope')
}

/**
 * Vérifie si l'utilisateur courant peut gérer (supprimer/modifier) un DES cible.
 *
 * Règle Phase B (spec §6.1) :
 *   - Seul l'admin du home_hospital du DES peut le supprimer
 *   - developer / superadmin / admin peuvent toujours
 *   - Le DES lui-même peut modifier son propre profil (cas hors de cette fonction)
 */
export async function canManageDES(targetUserId: string): Promise<boolean> {
  try {
    const { supabase, profile } = await getCurrentProfile()
    const role = profile.role as UserRole

    if (GLOBAL_ADMIN_ROLES.includes(role)) return true

    const { data: target } = await supabase
      .from('profiles')
      .select('home_hospital_id')
      .eq('id', targetUserId)
      .single()

    if (!target) return false

    if (role === 'institution_admin') {
      return target.home_hospital_id === profile.hospital_id
    }

    return false
  } catch {
    return false
  }
}

/**
 * Variante throwing de canManageDES — utilisée par les server actions de suppression
 * pour renvoyer une erreur localisable à l'UI.
 */
export async function requireDESManager(targetUserId: string) {
  const allowed = await canManageDES(targetUserId)
  if (!allowed) throw new Error('error.forbidden_des_home_hospital')
}
