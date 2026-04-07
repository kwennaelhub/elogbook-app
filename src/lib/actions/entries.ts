'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { entrySchema } from '@/lib/validations'
import { ENTRY_MODE_THRESHOLD_HOURS } from '@/types/database'

export type EntryState = {
  error?: string
  success?: boolean
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

  // Convertir les champs numériques
  const data = {
    ...raw,
    geo_latitude: raw.geo_latitude ? Number(raw.geo_latitude) : undefined,
    geo_longitude: raw.geo_longitude ? Number(raw.geo_longitude) : undefined,
    geo_accuracy: raw.geo_accuracy ? Number(raw.geo_accuracy) : undefined,
    attestation_checked: raw.attestation_checked === 'true',
  }

  const parsed = entrySchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const entryMode = determineEntryMode(parsed.data.intervention_date)

  // Vérifier l'attestation pour le mode rétrospectif
  if (entryMode === 'retrospective' && !parsed.data.attestation_checked) {
    return { error: 'L\'attestation sur l\'honneur est obligatoire pour une saisie rétrospective' }
  }

  const now = new Date().toISOString()

  const { error } = await supabase.from('entries').insert({
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
  })

  if (error) {
    return { error: 'Erreur lors de l\'enregistrement : ' + error.message }
  }

  revalidatePath('/logbook')
  revalidatePath('/dashboard')
  return { success: true }
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
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('entries')
    .update({
      is_validated: true,
      validated_at: new Date().toISOString(),
      validated_by: user.id,
    })
    .eq('id', entryId)

  if (error) return { error: error.message }

  revalidatePath('/logbook')
  return { success: true }
}

export async function deleteEntry(entryId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', entryId)

  if (error) return { error: error.message }

  revalidatePath('/logbook')
  revalidatePath('/dashboard')
  return { success: true }
}
