'use server'

import { createClient } from '@/lib/supabase/server'

// ========== VÉRIFICATION ADMIN ==========

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    throw new Error('Accès refusé')
  }
  return { supabase, user }
}

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
  category: string // 'quantitative' | 'qualitative'
  label: string
  target_count: number
  description?: string
  specialty_name?: string
  procedure_name?: string
}) {
  const { supabase, user } = await requireAdmin()

  // Vérifier s'il existe déjà
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

// ========== RÉFÉRENTIEL (Templates) ==========

export async function addCroTemplate(data: { title: string; specialty_id?: string; content: Record<string, string> }) {
  const { supabase, user } = await requireAdmin()
  const { error } = await supabase.from('cro_templates').insert({
    title: data.title,
    specialty_id: data.specialty_id || null,
    content: data.content,
    created_by: user.id,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function addPrescriptionTemplate(data: { title: string; specialty_id?: string; content: Record<string, string> }) {
  const { supabase, user } = await requireAdmin()
  const { error } = await supabase.from('prescription_templates').insert({
    title: data.title,
    specialty_id: data.specialty_id || null,
    content: data.content,
    created_by: user.id,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function addPreopTemplate(data: { title: string; specialty_id?: string; items: Record<string, string> }) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('preop_templates').insert({
    title: data.title,
    specialty_id: data.specialty_id || null,
    items: data.items,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function addInstrument(data: {
  name: string; category: string; description?: string; image_url?: string; sort_order?: number
}) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('instruments').insert({
    name: data.name,
    category: data.category,
    description: data.description || null,
    image_url: data.image_url || null,
    sort_order: data.sort_order ?? 0,
  })
  if (error) return { error: error.message }
  return { success: true }
}

// ========== TECHNIQUES OPÉRATOIRES ==========

export async function addTechnique(data: {
  title: string
  specialty_id?: string
  procedure_id?: string
  steps: string[]
  tips?: string
  contraindications?: string
  references?: string
}) {
  const { supabase, user } = await requireAdmin()
  const { error } = await supabase.from('surgical_techniques').insert({
    title: data.title,
    specialty_id: data.specialty_id || null,
    procedure_id: data.procedure_id || null,
    steps: data.steps,
    tips: data.tips || null,
    contraindications: data.contraindications || null,
    references: data.references || null,
    created_by: user.id,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function getTechniques(specialtyId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('surgical_techniques')
    .select('*, specialty:specialties(name), procedure:procedures(name)')
    .eq('is_active', true)
    .order('title')

  if (specialtyId) {
    query = query.eq('specialty_id', specialtyId)
  }

  const { data } = await query
  return data ?? []
}
