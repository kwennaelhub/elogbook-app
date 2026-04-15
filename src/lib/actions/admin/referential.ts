'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from './helpers'

// ========== TEMPLATES (CRO, Prescriptions, Préop) ==========

export async function addCroTemplate(data: { title: string; specialty_id?: string; content: Record<string, string> }) {
  const { supabase, user } = await requireAdmin()
  const { error } = await supabase.from('cro_templates').insert({
    title: data.title,
    specialty_id: data.specialty_id || null,
    content: data.content,
    created_by: user.id,
    status: 'pending',
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
    status: 'pending',
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
    status: 'pending',
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
    status: 'pending',
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
  refs?: string
}) {
  const { supabase, user } = await requireAdmin()
  const { error } = await supabase.from('surgical_techniques').insert({
    title: data.title,
    specialty_id: data.specialty_id || null,
    procedure_id: data.procedure_id || null,
    steps: data.steps,
    tips: data.tips || null,
    contraindications: data.contraindications || null,
    refs: data.refs || null,
    created_by: user.id,
    status: 'pending',
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

// ========== VALIDATION RÉFÉRENTIEL ==========

export async function approveReferentialItem(table: string, itemId: string): Promise<{ error?: string; success?: boolean }> {
  const validTables = ['surgical_techniques', 'cro_templates', 'prescription_templates', 'preop_templates', 'instruments']
  if (!validTables.includes(table)) return { error: 'Table invalide' }

  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from(table)
    .update({ status: 'approved' })
    .eq('id', itemId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function rejectReferentialItem(table: string, itemId: string): Promise<{ error?: string; success?: boolean }> {
  const validTables = ['surgical_techniques', 'cro_templates', 'prescription_templates', 'preop_templates', 'instruments']
  if (!validTables.includes(table)) return { error: 'Table invalide' }

  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from(table)
    .update({ status: 'rejected' })
    .eq('id', itemId)

  if (error) return { error: error.message }
  return { success: true }
}
