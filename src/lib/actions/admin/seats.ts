'use server'

import { requireAdminScope, requireHospitalAdmin } from './helpers'

// ========== SIÈGES INSTITUTIONNELS ==========

export async function getInstitutionalSeats() {
  const { supabase, scope, hospitalId } = await requireAdminScope()

  let query = supabase
    .from('institutional_seats')
    .select(`
      *,
      subscription:subscriptions(id, plan, status, user_id, institution_id),
      hospital:hospitals(id, name)
    `)
    .order('created_at', { ascending: false })

  if (scope === 'hospital' && hospitalId) {
    query = query.eq('hospital_id', hospitalId)
  }

  const { data: seats } = await query
  return seats ?? []
}

async function requireSeatAccess(seatId: string) {
  // Deux étapes : on lit le hospital_id du siège (sous RLS admin-only),
  // puis on repasse par requireHospitalAdmin pour que la règle de scope
  // soit appliquée uniformément avec les autres actions Phase B.
  const { supabase: probe } = await requireAdminScope()
  const { data: seat } = await probe
    .from('institutional_seats')
    .select('hospital_id')
    .eq('id', seatId)
    .single()

  if (!seat || !seat.hospital_id) {
    throw new Error('admin.error.seatNotFound')
  }
  return requireHospitalAdmin(seat.hospital_id)
}

export async function getSeatAssignments(seatId: string) {
  const { supabase } = await requireSeatAccess(seatId)

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
  const { supabase, user } = await requireSeatAccess(seatId)

  const { data: seat } = await supabase
    .from('institutional_seats')
    .select('max_seats, used_seats, hospital_id')
    .eq('id', seatId)
    .single()

  if (!seat) return { error: 'admin.error.seatNotFound' }
  if (seat.used_seats >= seat.max_seats) return { error: `Capacité maximale atteinte (${seat.max_seats} postes)` }

  // Empêche un institution_admin d'assigner un user d'un autre hôpital à son siège.
  const { data: target } = await supabase
    .from('profiles')
    .select('home_hospital_id')
    .eq('id', userId)
    .single()

  if (target?.home_hospital_id && target.home_hospital_id !== seat.hospital_id) {
    return { error: 'admin.error.userBelongsToOtherHospital' }
  }

  const { data: existing } = await supabase
    .from('seat_assignments')
    .select('id')
    .eq('institutional_seat_id', seatId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)

  if (existing && existing.length > 0) return { error: 'admin.error.alreadyAssigned' }

  const { error: insertError } = await supabase
    .from('seat_assignments')
    .insert({
      institutional_seat_id: seatId,
      user_id: userId,
      assigned_by: user.id,
    })

  if (insertError) return { error: insertError.message }

  const { error: updateError } = await supabase
    .from('institutional_seats')
    .update({ used_seats: seat.used_seats + 1 })
    .eq('id', seatId)

  if (updateError) return { error: updateError.message }

  return { success: true }
}

export async function removeSeatAssignment(assignmentId: string, seatId: string) {
  const { supabase } = await requireSeatAccess(seatId)

  const { error: deactivateError } = await supabase
    .from('seat_assignments')
    .update({ is_active: false })
    .eq('id', assignmentId)

  if (deactivateError) return { error: deactivateError.message }

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
  const { supabase, scope, hospitalId } = await requireAdminScope()

  let q = supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, title, des_level, home_hospital_id')
    .eq('is_active', true)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('last_name')
    .limit(10)

  if (scope === 'hospital' && hospitalId) {
    q = q.eq('home_hospital_id', hospitalId)
  }

  const { data } = await q
  return data ?? []
}
