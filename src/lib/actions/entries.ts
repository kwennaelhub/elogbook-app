'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { entrySchema } from '@/lib/validations'
import { ENTRY_MODE_THRESHOLD_HOURS } from '@/types/database'
import { generateDeterministicPatientId } from '@/lib/actions/followups'

export type EntryState = {
  error?: string
  success?: boolean
  submittedAt?: number
}

function determineEntryMode(interventionDate: string): 'prospective' | 'retrospective' {
  const intervention = new Date(interventionDate)
  const now = new Date()
  const diffMs = now.getTime() - intervention.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours > ENTRY_MODE_THRESHOLD_HOURS ? 'retrospective' : 'prospective'
}

export async function createEntry(_prev: EntryState, formData: FormData): Promise<EntryState> {
  const raw = Object.fromEntries(formData)

  // Convertir les champs numériques et booléens
  const data = {
    ...raw,
    geo_latitude: raw.geo_latitude ? Number(raw.geo_latitude) : undefined,
    geo_longitude: raw.geo_longitude ? Number(raw.geo_longitude) : undefined,
    geo_accuracy: raw.geo_accuracy ? Number(raw.geo_accuracy) : undefined,
    attestation_checked: raw.attestation_checked === 'true',
    enable_followup: raw.enable_followup === 'true',
  }

  const parsed = entrySchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  const entryMode = determineEntryMode(parsed.data.intervention_date)

  // Vérifier l'attestation pour le mode rétrospectif
  if (entryMode === 'retrospective' && !parsed.data.attestation_checked) {
    return { error: 'logbook.error.attestationRequired' }
  }

  const now = new Date().toISOString()

  const { data: newEntry, error } = await supabase.from('entries').insert({
    user_id: user.id,
    intervention_date: parsed.data.intervention_date,
    submitted_at: now,
    entry_mode: entryMode,
    context: parsed.data.context,
    patient_type: parsed.data.patient_type,
    operator_role: parsed.data.operator_role,
    hospital_id: parsed.data.hospital_id,
    other_hospital: parsed.data.other_hospital || null,
    specialty_id: parsed.data.specialty_id || null,
    segment_id: parsed.data.segment_id || null,
    procedure_id: parsed.data.procedure_id || null,
    other_specialty: parsed.data.other_specialty || null,
    other_procedure: parsed.data.other_procedure || null,
    notes: parsed.data.notes || null,
    supervisor_id: parsed.data.supervisor_id || null,
    geo_latitude: parsed.data.geo_latitude || null,
    geo_longitude: parsed.data.geo_longitude || null,
    geo_accuracy: parsed.data.geo_accuracy || null,
    geo_captured_at: parsed.data.geo_latitude ? now : null,
    attestation_checked: parsed.data.attestation_checked,
    attestation_text: entryMode === 'retrospective'
      ? `J'atteste sur l'honneur avoir été présent(e) sur site le ${parsed.data.intervention_date} en tant que ${parsed.data.operator_role}.`
      : null,
    attestation_at: entryMode === 'retrospective' ? now : null,
  }).select('id').single()

  if (error) {
    return { error: 'Erreur lors de l\'enregistrement : ' + error.message }
  }

  // Auto-création du suivi post-opératoire si demandé (Premium)
  if (newEntry && parsed.data.enable_followup && parsed.data.patient_type === 'real') {
    try {
      const anonymousId = await generateDeterministicPatientId({
        intervention_date: parsed.data.intervention_date,
        hospital_id: parsed.data.hospital_id,
        procedure_id: parsed.data.procedure_id || null,
        supervisor_id: parsed.data.supervisor_id || null,
      })

      await supabase.from('patient_followups').insert({
        user_id: user.id,
        entry_id: newEntry.id,
        anonymous_id: anonymousId,
        intervention_date: parsed.data.intervention_date,
        outcome: 'en_cours',
      })
    } catch {
      // Le suivi échoue silencieusement — l'intervention est déjà sauvée
    }
  }

  revalidatePath('/logbook')
  revalidatePath('/dashboard')
  revalidatePath('/followups')
  return { success: true, submittedAt: Date.now() }
}

export async function getEntries(page = 1, limit = 20) {
  const supabase = await createClient()
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('entries')
    .select(`
      *,
      hospital:hospitals(id, name),
      specialty:specialties!entries_specialty_id_fkey(id, name),
      segment:specialties!entries_segment_id_fkey(id, name),
      procedure:procedures(id, name),
      supervisor:profiles!entries_supervisor_id_fkey(id, first_name, last_name)
    `, { count: 'exact' })
    .order('intervention_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return { data: [], count: 0 }
  return { data: data ?? [], count: count ?? 0 }
}

export async function validateEntry(entryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  // Vérifier que l'utilisateur est superviseur, admin ou developer
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['supervisor', 'admin', 'superadmin', 'developer'].includes(profile.role)) {
    return { error: 'Vous n\'avez pas le droit de valider des actes' }
  }

  // .select() force le retour des lignes updatées, ce qui permet de détecter
  // un blocage silencieux par une RLS policy (ex: superviseur tente de valider
  // une entry dont il n'est pas le superviseur désigné).
  // Sans cette protection, un UPDATE bloqué par RLS renvoie `error: null` mais
  // `data: []` — l'action retournerait `success: true` sans rien modifier.
  const { data: updated, error } = await supabase
    .from('entries')
    .update({
      is_validated: true,
      validated_at: new Date().toISOString(),
      validated_by: user.id,
    })
    .eq('id', entryId)
    .select('id')

  if (error) return { error: error.message }
  if (!updated || updated.length === 0) {
    return { error: 'supervision.error.notAllowed' }
  }

  revalidatePath('/logbook')
  revalidatePath('/supervision')
  return { success: true }
}

export async function rejectEntry(entryId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  // Vérifier que l'utilisateur est superviseur, admin ou developer
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['supervisor', 'admin', 'superadmin', 'developer'].includes(profile.role)) {
    return { error: 'Vous n\'avez pas le droit de rejeter des actes' }
  }

  // Même logique que validateEntry — on force .select() pour détecter un blocage
  // silencieux par RLS et remonter une erreur explicite au lieu d'un faux success.
  const { data: updated, error } = await supabase
    .from('entries')
    .update({
      is_validated: false,
      validated_at: new Date().toISOString(),
      validated_by: user.id,
      notes: reason ? `[REJETÉ] ${reason.trim().slice(0, 500)}` : null,
    })
    .eq('id', entryId)
    .select('id')

  if (error) return { error: error.message }
  if (!updated || updated.length === 0) {
    return { error: 'supervision.error.notAllowed' }
  }

  revalidatePath('/logbook')
  revalidatePath('/supervision')
  return { success: true }
}

export async function getEntriesForSupervisor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { pending: [], validated: [], rejected: [] }

  // Vérifier le rôle
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, hospital_id, service_id')
    .eq('id', user.id)
    .single()

  const allowedRoles = ['supervisor', 'service_chief', 'institution_admin', 'admin', 'superadmin', 'developer']
  if (!profile || !allowedRoles.includes(profile.role)) {
    return { pending: [], validated: [], rejected: [] }
  }

  // Requête de base : entrées avec scoping selon le rôle.
  let query = supabase
    .from('entries')
    .select(`
      *,
      hospital:hospitals(id, name),
      specialty:specialties!entries_specialty_id_fkey(id, name),
      segment:specialties!entries_segment_id_fkey(id, name),
      procedure:procedures(id, name),
      supervisor:profiles!entries_supervisor_id_fkey(id, first_name, last_name, title),
      student:profiles!entries_user_id_fkey(id, first_name, last_name, des_level, matricule)
    `)
    .order('intervention_date', { ascending: false })

  if (profile.role === 'supervisor') {
    // Superviseur : voit uniquement les entrées où il est assigné
    query = query.eq('supervisor_id', user.id)
  } else if (profile.role === 'service_chief') {
    // Chef de service : voit toutes les entrées de son service
    if (!profile.service_id) {
      return { pending: [], validated: [], rejected: [] }
    }
    query = query.eq('service_id', profile.service_id)
  } else if (profile.role === 'admin' || profile.role === 'institution_admin') {
    // Admin global (legacy) et institution_admin : toutes les entrées de leur hôpital
    if (!profile.hospital_id) {
      return { pending: [], validated: [], rejected: [] }
    }
    query = query.eq('hospital_id', profile.hospital_id)
  }
  // superadmin/developer : voit tout (pas de filtre)

  const { data } = await query

  const entries = data ?? []

  return {
    pending: entries.filter(e => !e.is_validated && !e.validated_at),
    validated: entries.filter(e => e.is_validated),
    rejected: entries.filter(e => !e.is_validated && e.validated_at),
  }
}

export async function deleteEntry(entryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', user.id)

  if (error) return { error: 'logbook.error.deletionFailed' }

  revalidatePath('/logbook')
  revalidatePath('/dashboard')
  return { success: true }
}
