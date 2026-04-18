'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireHospitalAdmin, requireAdmin, requireServiceChief } from './helpers'
import type {
  HospitalService,
  HospitalServiceWithDetails,
  HospitalServiceInsert,
  HospitalServiceUpdate,
} from '@/types/database'

// ============================================================================
// LECTURE
// ============================================================================

/**
 * Liste tous les services d'un hôpital, avec comptage DES et superviseurs.
 * Scope : tout utilisateur authentifié rattaché à l'hôpital + admins.
 * (la RLS SELECT s'en charge — on lit simplement)
 */
export async function getHospitalServices(hospitalId: string): Promise<{
  data?: HospitalServiceWithDetails[]
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('hospital_services')
    .select(`
      *,
      chief:chief_id ( id, first_name, last_name, title, email ),
      hospital:hospital_id ( id, name, city )
    `)
    .eq('hospital_id', hospitalId)
    .order('name', { ascending: true })

  if (error) return { error: error.message }

  // Enrichissement : comptage DES et superviseurs (séparé pour éviter les jointures lourdes RLS)
  const services = (data ?? []) as HospitalServiceWithDetails[]
  for (const service of services) {
    const [desRes, supRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('service_id', service.id)
        .eq('role', 'student'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('service_id', service.id)
        .eq('role', 'supervisor'),
    ])
    service.des_count = desRes.count ?? 0
    service.supervisor_count = supRes.count ?? 0
  }

  return { data: services }
}

/**
 * Récupère un service spécifique avec ses détails enrichis.
 */
export async function getHospitalService(serviceId: string): Promise<{
  data?: HospitalServiceWithDetails
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('hospital_services')
    .select(`
      *,
      chief:chief_id ( id, first_name, last_name, title, email ),
      hospital:hospital_id ( id, name, city )
    `)
    .eq('id', serviceId)
    .single()

  if (error) return { error: error.message }
  return { data: data as HospitalServiceWithDetails }
}

// ============================================================================
// ÉCRITURE
// ============================================================================

/**
 * Crée un nouveau service. Vérifie que le forfait hospital_settings.max_services
 * n'est pas dépassé avant d'insérer (contrainte métier forfait institutionnel).
 */
export async function createHospitalService(
  input: HospitalServiceInsert,
): Promise<{ data?: HospitalService; error?: string }> {
  const { supabase } = await requireHospitalAdmin(input.hospital_id)

  // Vérifier le forfait
  const [{ count: currentCount }, { data: settings }] = await Promise.all([
    supabase
      .from('hospital_services')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', input.hospital_id)
      .eq('is_active', true),
    supabase
      .from('hospital_settings')
      .select('max_services, plan_tier')
      .eq('hospital_id', input.hospital_id)
      .single(),
  ])

  const limit = settings?.max_services ?? 3
  if ((currentCount ?? 0) >= limit) {
    return {
      error: `error.plan_limit_reached:${settings?.plan_tier ?? 'starter'}:${limit}`,
    }
  }

  const { data, error } = await supabase
    .from('hospital_services')
    .insert({
      hospital_id: input.hospital_id,
      name: input.name.trim(),
      chief_id: input.chief_id ?? null,
      is_active: input.is_active ?? true,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { data: data as HospitalService }
}

/**
 * Met à jour un service (nom, actif, chef).
 */
export async function updateHospitalService(
  serviceId: string,
  patch: HospitalServiceUpdate,
): Promise<{ data?: HospitalService; error?: string }> {
  const supabase = await createClient()

  // Récupérer l'hôpital pour scoper la permission
  const { data: existing } = await supabase
    .from('hospital_services')
    .select('hospital_id')
    .eq('id', serviceId)
    .single()

  if (!existing) return { error: 'error.service_not_found' }

  await requireHospitalAdmin(existing.hospital_id)

  const patchClean: HospitalServiceUpdate = {}
  if (patch.name !== undefined) patchClean.name = patch.name.trim()
  if (patch.chief_id !== undefined) patchClean.chief_id = patch.chief_id
  if (patch.is_active !== undefined) patchClean.is_active = patch.is_active

  const { data, error } = await supabase
    .from('hospital_services')
    .update(patchClean)
    .eq('id', serviceId)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { data: data as HospitalService }
}

/**
 * Suppression LOGIQUE (is_active = false). Seuls les admins globaux peuvent
 * supprimer physiquement (via SQL direct ou requireAdmin).
 *
 * Raison : les entries/stages passés référencent le service — il faut préserver
 * l'historique. Désactiver = masquer dans l'UI sans casser les FK.
 */
export async function deactivateHospitalService(
  serviceId: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('hospital_services')
    .select('hospital_id')
    .eq('id', serviceId)
    .single()

  if (!existing) return { error: 'error.service_not_found' }

  await requireHospitalAdmin(existing.hospital_id)

  const { error } = await supabase
    .from('hospital_services')
    .update({ is_active: false })
    .eq('id', serviceId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

/**
 * Suppression physique — admin global uniquement.
 * À utiliser seulement si aucune entry/stage ne référence le service.
 */
export async function deleteHospitalService(
  serviceId: string,
): Promise<{ success?: boolean; error?: string }> {
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from('hospital_services')
    .delete()
    .eq('id', serviceId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

// ============================================================================
// ASSIGNATION CHEF DE SERVICE
// ============================================================================

/**
 * Assigne un chef à un service et promeut le profil en rôle service_chief
 * s'il est actuellement supervisor/student.
 *
 * - Si userId est null → retire le chef actuel (chief_id = null)
 * - Le nouveau chef doit appartenir à l'hôpital du service (même hospital_id)
 */
export async function assignServiceChief(
  serviceId: string,
  userId: string | null,
): Promise<{ success?: boolean; error?: string }> {
  const { supabase } = await requireServiceChief(serviceId)

  // Charger le service
  const { data: service } = await supabase
    .from('hospital_services')
    .select('id, hospital_id, chief_id')
    .eq('id', serviceId)
    .single()

  if (!service) return { error: 'error.service_not_found' }

  // Cas : retrait du chef
  if (userId === null) {
    // Rétrograder l'ancien chef vers supervisor s'il n'a pas d'autre service
    if (service.chief_id) {
      const { count: otherServices } = await supabase
        .from('hospital_services')
        .select('id', { count: 'exact', head: true })
        .eq('chief_id', service.chief_id)
        .neq('id', serviceId)

      if ((otherServices ?? 0) === 0) {
        await supabase
          .from('profiles')
          .update({ role: 'supervisor' })
          .eq('id', service.chief_id)
          .eq('role', 'service_chief')
      }
    }

    const { error } = await supabase
      .from('hospital_services')
      .update({ chief_id: null })
      .eq('id', serviceId)

    if (error) return { error: error.message }
    revalidatePath('/admin')
    return { success: true }
  }

  // Cas : assignation
  // 1. Vérifier que le nouveau chef appartient à l'hôpital
  const { data: newChief } = await supabase
    .from('profiles')
    .select('id, hospital_id, role')
    .eq('id', userId)
    .single()

  if (!newChief) return { error: 'error.user_not_found' }
  if (newChief.hospital_id !== service.hospital_id) {
    return { error: 'error.user_not_in_hospital' }
  }

  // 2. Mettre à jour le service
  const { error: svcError } = await supabase
    .from('hospital_services')
    .update({ chief_id: userId })
    .eq('id', serviceId)
  if (svcError) return { error: svcError.message }

  // 3. Promouvoir le profil en service_chief (sauf s'il est déjà plus haut)
  if (['student', 'supervisor'].includes(newChief.role)) {
    await supabase
      .from('profiles')
      .update({ role: 'service_chief' })
      .eq('id', userId)
  }

  // 4. Rétrograder l'ancien chef s'il n'a plus aucun service
  if (service.chief_id && service.chief_id !== userId) {
    const { count: otherServices } = await supabase
      .from('hospital_services')
      .select('id', { count: 'exact', head: true })
      .eq('chief_id', service.chief_id)
      .neq('id', serviceId)

    if ((otherServices ?? 0) === 0) {
      await supabase
        .from('profiles')
        .update({ role: 'supervisor' })
        .eq('id', service.chief_id)
        .eq('role', 'service_chief')
    }
  }

  revalidatePath('/admin')
  return { success: true }
}

/**
 * Liste les candidats possibles pour le rôle de chef de service :
 * superviseurs et chefs de service existants rattachés à l'hôpital.
 */
export async function getServiceChiefCandidates(hospitalId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, title, email, role')
    .eq('hospital_id', hospitalId)
    .in('role', ['supervisor', 'service_chief'])
    .eq('is_active', true)
    .order('last_name', { ascending: true })

  if (error) return { error: error.message }
  return { data: data ?? [] }
}
