'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { FollowupOutcome, AgeRange, PatientSex } from '@/types/database'

export async function getFollowups() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('patient_followups')
    .select(`
      *,
      entry:entries(
        id,
        procedure:procedures(name),
        specialty:specialties(name),
        hospital:hospitals(name)
      )
    `)
    .eq('user_id', user.id)
    .order('intervention_date', { ascending: false })

  if (error) return []
  return data ?? []
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
  const outcomes: Record<string, number> = { pending: 0, success: 0, complication: 0, failure: 0, deceased: 0 }
  let totalDays = 0
  let daysCount = 0

  for (const f of data) {
    outcomes[f.outcome] = (outcomes[f.outcome] || 0) + 1
    if (f.follow_up_days != null) {
      totalDays += f.follow_up_days
      daysCount++
    }
  }

  const successRate = total > 0 ? Math.round(((outcomes.success || 0) / total) * 100) : 0
  const complicationRate = total > 0 ? Math.round(((outcomes.complication || 0) / total) * 100) : 0
  const avgStay = daysCount > 0 ? Math.round(totalDays / daysCount) : 0

  return { total, outcomes, successRate, complicationRate, avgStay }
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
  if (!user) return { error: 'Non authentifié' }

  // Générer un ID anonyme
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('patient_followups')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const seq = String((count ?? 0) + 1).padStart(3, '0')
  const anonymousId = `PAT-${year}-${seq}`

  const { error } = await supabase.from('patient_followups').insert({
    user_id: user.id,
    entry_id: data.entry_id || null,
    anonymous_id: anonymousId,
    intervention_date: data.intervention_date,
    outcome: 'pending',
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
  complication_type?: string | null
  complication_date?: string | null
  notes?: string | null
}): Promise<FollowupState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.discharge_date !== undefined) updates.discharge_date = data.discharge_date || null
  if (data.outcome !== undefined) updates.outcome = data.outcome
  if (data.complication_type !== undefined) updates.complication_type = data.complication_type || null
  if (data.complication_date !== undefined) updates.complication_date = data.complication_date || null
  if (data.notes !== undefined) updates.notes = data.notes || null

  const { error } = await supabase
    .from('patient_followups')
    .update(updates)
    .eq('id', followupId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/followups')
  return { success: true }
}

export async function deleteFollowup(followupId: string): Promise<FollowupState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('patient_followups')
    .delete()
    .eq('id', followupId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/followups')
  return { success: true }
}
