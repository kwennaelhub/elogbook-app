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

  if (!profile || !['admin', 'superadmin', 'developer'].includes(profile.role)) {
    throw new Error('Accès refusé')
  }
  return { supabase, user, role: profile.role }
}

async function requireDeveloper() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'developer') {
    throw new Error('Accès réservé au développeur')
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

// ========== GESTION DES RÔLES ==========

export async function updateUserRole(userId: string, newRole: string) {
  const { supabase, role: callerRole } = await requireAdmin()

  // Vérifier que le rôle cible est valide
  const validRoles = ['student', 'supervisor', 'admin', 'superadmin', 'developer']
  if (!validRoles.includes(newRole)) {
    return { error: 'Rôle invalide' }
  }

  // Seul le developer peut créer d'autres developers ou superadmins
  if (['developer', 'superadmin'].includes(newRole) && callerRole !== 'developer') {
    return { error: 'Seul le développeur peut attribuer ce rôle' }
  }

  // Le rôle developer est irrevocable — on ne peut pas le retirer
  const { data: target } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (target?.role === 'developer') {
    return { error: 'Le rôle développeur est irrevocable' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) return { error: error.message }
  return { success: true }
}

// ========== PROFIL UTILISATEUR ==========

export async function updateProfile(data: {
  first_name?: string
  last_name?: string
  phone?: string
  hospital_id?: string
  des_level?: string
  date_of_birth?: string
  avatar_url?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const updates: Record<string, unknown> = {}
  if (data.first_name !== undefined) updates.first_name = data.first_name
  if (data.last_name !== undefined) updates.last_name = data.last_name
  if (data.phone !== undefined) updates.phone = data.phone || null
  if (data.hospital_id !== undefined) updates.hospital_id = data.hospital_id || null
  if (data.des_level !== undefined) updates.des_level = data.des_level || null
  if (data.date_of_birth !== undefined) updates.date_of_birth = data.date_of_birth || null
  if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url || null

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

// ========== GESTION SPÉCIALITÉS & PROCÉDURES (config admin) ==========

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

export async function deleteHospital(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('hospitals')
    .update({ is_active: false })
    .eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteProcedure(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('procedures')
    .update({ is_active: false })
    .eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteSpecialty(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('specialties')
    .update({ is_active: false })
    .eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

// ========== SIÈGES INSTITUTIONNELS ==========

export async function getInstitutionalSeats() {
  const { supabase } = await requireAdmin()

  const { data: seats } = await supabase
    .from('institutional_seats')
    .select(`
      *,
      subscription:subscriptions(id, plan, status, user_id, institution_id),
      hospital:hospitals(id, name)
    `)
    .order('created_at', { ascending: false })

  return seats ?? []
}

export async function getSeatAssignments(seatId: string) {
  const { supabase } = await requireAdmin()

  const { data } = await supabase
    .from('seat_assignments')
    .select(`
      *,
      user:profiles!seat_assignments_user_id_fkey(id, first_name, last_name, email, role, title, des_level),
      assigned_by_user:profiles!seat_assignments_assigned_by_fkey(first_name, last_name)
    `)
    .eq('institutional_seat_id', seatId)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false })

  return data ?? []
}

export async function assignSeat(seatId: string, userId: string) {
  const { supabase, user } = await requireAdmin()

  // Vérifier la capacité
  const { data: seat } = await supabase
    .from('institutional_seats')
    .select('max_seats, used_seats')
    .eq('id', seatId)
    .single()

  if (!seat) return { error: 'Siège institutionnel introuvable' }
  if (seat.used_seats >= seat.max_seats) return { error: `Capacité maximale atteinte (${seat.max_seats} postes)` }

  // Vérifier que l'utilisateur n'est pas déjà assigné
  const { data: existing } = await supabase
    .from('seat_assignments')
    .select('id')
    .eq('institutional_seat_id', seatId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)

  if (existing && existing.length > 0) return { error: 'Cet utilisateur est déjà assigné à ce poste' }

  // Assigner
  const { error: insertError } = await supabase
    .from('seat_assignments')
    .insert({
      institutional_seat_id: seatId,
      user_id: userId,
      assigned_by: user.id,
    })

  if (insertError) return { error: insertError.message }

  // Incrémenter used_seats
  const { error: updateError } = await supabase
    .from('institutional_seats')
    .update({ used_seats: seat.used_seats + 1 })
    .eq('id', seatId)

  if (updateError) return { error: updateError.message }

  return { success: true }
}

export async function removeSeatAssignment(assignmentId: string, seatId: string) {
  const { supabase } = await requireAdmin()

  const { error: deactivateError } = await supabase
    .from('seat_assignments')
    .update({ is_active: false })
    .eq('id', assignmentId)

  if (deactivateError) return { error: deactivateError.message }

  // Décrémenter used_seats
  const { data: seat } = await supabase
    .from('institutional_seats')
    .select('used_seats')
    .eq('id', seatId)
    .single()

  if (seat && seat.used_seats > 0) {
    await supabase
      .from('institutional_seats')
      .update({ used_seats: seat.used_seats - 1 })
      .eq('id', seatId)
  }

  return { success: true }
}

export async function searchUsersForSeat(query: string) {
  const { supabase } = await requireAdmin()

  const { data } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, title, des_level')
    .eq('is_active', true)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('last_name')
    .limit(10)

  return data ?? []
}

// ========== EMAIL DE BIENVENUE ==========

export async function sendWelcomeEmail(email: string, firstName: string) {
  // Envoie l'email de bienvenue via l'API route locale
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/send-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, firstName }),
    })
    if (!response.ok) {
      console.log('Welcome email skipped')
    }
  } catch {
    console.log('Welcome email skipped (not available)')
  }
}
