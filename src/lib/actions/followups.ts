'use server'

import { createHash } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { FollowupOutcome, FollowupEventType, AgeRange, PatientSex } from '@/types/database'

export async function getFollowups() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Requête simple sans JOIN (évite les erreurs RLS/FK silencieuses)
  const { data: followups, error } = await supabase
    .from('patient_followups')
    .select('*')
    .eq('user_id', user.id)
    .order('intervention_date', { ascending: false })

  if (error || !followups) return []

  // Enrichir avec les détails de l'intervention liée
  const entryIds = followups.map(f => f.entry_id).filter(Boolean) as string[]

  interface EntryInfo { id: string; procedure?: { name: string } | null; specialty?: { name: string } | null; hospital?: { name: string } | null }
  const entriesMap: Record<string, EntryInfo> = {}

  if (entryIds.length > 0) {
    const { data: entries } = await supabase
      .from('entries')
      .select('id, procedure:procedures!entries_procedure_id_fkey(name), specialty:specialties!entries_specialty_id_fkey(name), hospital:hospitals(name)')
      .in('id', entryIds)

    if (entries) {
      for (const e of entries) {
        // Supabase retourne un objet ou un array selon la cardinalité FK
        const proc = Array.isArray(e.procedure) ? e.procedure[0] : e.procedure
        const spec = Array.isArray(e.specialty) ? e.specialty[0] : e.specialty
        const hosp = Array.isArray(e.hospital) ? e.hospital[0] : e.hospital
        entriesMap[e.id] = { id: e.id, procedure: proc || null, specialty: spec || null, hospital: hosp || null }
      }
    }
  }

  return followups.map(f => ({
    ...f,
    entry: f.entry_id ? entriesMap[f.entry_id] || null : null,
  }))
}

export async function getFollowupStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('patient_followups')
    .select('outcome, follow_up_days, age_range, sex, asa_score')
    .eq('user_id', user.id)

  if (!data || data.length === 0) return null

  const total = data.length
  const outcomes: Record<string, number> = { en_cours: 0, exeat: 0, decede: 0 }
  let totalDays = 0
  let daysCount = 0

  for (const f of data) {
    outcomes[f.outcome] = (outcomes[f.outcome] || 0) + 1
    if (f.follow_up_days != null) {
      totalDays += f.follow_up_days
      daysCount++
    }
  }

  const exeatRate = total > 0 ? Math.round(((outcomes.exeat || 0) / total) * 100) : 0
  const decedeRate = total > 0 ? Math.round(((outcomes.decede || 0) / total) * 100) : 0
  const avgStay = daysCount > 0 ? Math.round(totalDays / daysCount) : 0

  // Compter les complications depuis les événements timeline
  const { count: complicationCount } = await supabase
    .from('followup_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_type', 'complication')

  return { total, outcomes, exeatRate, decedeRate, avgStay, complications: complicationCount ?? 0 }
}

export type FollowupState = { error?: string; success?: boolean }

export async function createFollowup(data: {
  entry_id?: string
  intervention_date: string
  age_range?: AgeRange
  sex?: PatientSex
  asa_score?: number
  notes?: string
}): Promise<FollowupState> {
  if (!data.intervention_date) return { error: 'La date d\'intervention est obligatoire' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  // Générer un ID déterministe basé sur les données
  const anonymousId = `PAT-${data.intervention_date.replace(/-/g, '').slice(2)}-${String(Date.now()).slice(-6)}`

  const { error } = await supabase.from('patient_followups').insert({
    user_id: user.id,
    entry_id: data.entry_id || null,
    anonymous_id: anonymousId,
    intervention_date: data.intervention_date,
    outcome: 'en_cours',
    age_range: data.age_range || null,
    sex: data.sex || null,
    asa_score: data.asa_score || null,
    notes: data.notes || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/followups')
  return { success: true }
}

export async function updateFollowup(followupId: string, data: {
  discharge_date?: string | null
  outcome?: FollowupOutcome
  cause_of_death?: string | null
  notes?: string | null
  age_range?: AgeRange | null
  sex?: PatientSex | null
  asa_score?: number | null
}): Promise<FollowupState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.discharge_date !== undefined) updates.discharge_date = data.discharge_date || null
  if (data.outcome !== undefined) updates.outcome = data.outcome
  if (data.cause_of_death !== undefined) updates.cause_of_death = data.cause_of_death || null
  if (data.notes !== undefined) updates.notes = data.notes || null
  if (data.age_range !== undefined) updates.age_range = data.age_range || null
  if (data.sex !== undefined) updates.sex = data.sex || null
  if (data.asa_score !== undefined) updates.asa_score = data.asa_score ?? null

  // Si décès, on nettoie la cause si l'outcome change
  if (data.outcome && data.outcome !== 'decede') {
    updates.cause_of_death = null
  }

  const { error } = await supabase
    .from('patient_followups')
    .update(updates)
    .eq('id', followupId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/followups')
  return { success: true }
}

// ========== FOLLOWUP EVENTS (timeline additive) ==========

export async function getFollowupEvents(followupId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('followup_events')
    .select('*')
    .eq('followup_id', followupId)
    .order('event_date', { ascending: true })
  return data ?? []
}

export async function addFollowupEvent(followupId: string, data: {
  event_type: FollowupEventType
  event_date: string
  description: string
}): Promise<FollowupState> {
  if (!data.description.trim()) return { error: 'La description est obligatoire' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  const { error } = await supabase.from('followup_events').insert({
    followup_id: followupId,
    user_id: user.id,
    event_type: data.event_type,
    event_date: data.event_date,
    description: data.description.trim(),
  })

  if (error) return { error: error.message }
  revalidatePath('/followups')
  return { success: true }
}

// ========== ID PATIENT DÉTERMINISTE ==========

export async function generateDeterministicPatientId(entryData: {
  intervention_date: string
  hospital_id: string
  procedure_id?: string | null
  supervisor_id?: string | null
}): Promise<string> {
  const base = [
    entryData.intervention_date,
    entryData.hospital_id,
    entryData.procedure_id || '',
    entryData.supervisor_id || '',
  ].join('-')
  const hash = createHash('sha256').update(base).digest('hex').slice(0, 6).toUpperCase()
  const dateShort = entryData.intervention_date.replace(/-/g, '').slice(2) // YYMMDD
  return `PAT-${dateShort}-${hash}`
}

export async function deleteFollowup(followupId: string): Promise<FollowupState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  const { error } = await supabase
    .from('patient_followups')
    .delete()
    .eq('id', followupId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/followups')
  return { success: true }
}
