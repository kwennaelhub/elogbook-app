'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from './helpers'

// ========== HÔPITAUX ==========

export async function addHospital(data: { name: string; city: string }) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('hospitals').insert(data)
  if (error) return { error: error.message }
  return { success: true }
}

export async function updateHospital(id: string, data: { name?: string; city?: string; is_active?: boolean }) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('hospitals').update(data).eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteHospital(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('hospitals').update({ is_active: false }).eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

// ========== SPÉCIALITÉS ==========

export async function addSpecialty(data: { name: string; parent_id?: string; level?: number; sort_order?: number }) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('specialties').insert({
    name: data.name,
    parent_id: data.parent_id || null,
    level: data.level ?? 0,
    sort_order: data.sort_order ?? 0,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function updateSpecialty(id: string, data: { name?: string; sort_order?: number; is_active?: boolean }) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('specialties').update(data).eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteSpecialty(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('specialties').update({ is_active: false }).eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

// ========== PROCÉDURES ==========

export async function addProcedure(data: { name: string; specialty_id: string; sort_order?: number }) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('procedures').insert({
    name: data.name,
    specialty_id: data.specialty_id,
    sort_order: data.sort_order ?? 0,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteProcedure(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('procedures').update({ is_active: false }).eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function getSpecialtiesWithProcedures() {
  const supabase = await createClient()
  const { data: specialties } = await supabase
    .from('specialties')
    .select('*')
    .eq('is_active', true)
    .eq('level', 0)
    .order('name')

  const { data: procedures } = await supabase
    .from('procedures')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  return {
    specialties: specialties ?? [],
    procedures: procedures ?? [],
  }
}

// ========== OBJECTIFS DES ==========

export async function getDesObjectives() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('des_objectives')
    .select('*')
    .order('des_level, category')
  return data ?? []
}

export async function upsertDesObjective(data: {
  des_level: string
  category: string
  label: string
  target_count: number
  description?: string
  specialty_name?: string
  procedure_name?: string
}) {
  const { supabase, user } = await requireAdmin()

  const { data: existing } = await supabase
    .from('des_objectives')
    .select('id')
    .eq('des_level', data.des_level)
    .eq('label', data.label)
    .limit(1)

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('des_objectives')
      .update({
        target_count: data.target_count,
        description: data.description || null,
        category: data.category,
        specialty_name: data.specialty_name || null,
        procedure_name: data.procedure_name || null,
        updated_by: user.id,
      })
      .eq('id', existing[0].id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('des_objectives').insert({
      des_level: data.des_level,
      category: data.category,
      label: data.label,
      target_count: data.target_count,
      description: data.description || null,
      specialty_name: data.specialty_name || null,
      procedure_name: data.procedure_name || null,
      created_by: user.id,
    })
    if (error) return { error: error.message }
  }
  return { success: true }
}

export async function deleteDesObjective(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('des_objectives').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}
