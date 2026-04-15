'use server'

import { requireAdmin } from './helpers'

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

  const { data: seat } = await supabase
    .from('institutional_seats')
    .select('max_seats, used_seats')
    .eq('id', seatId)
    .single()

  if (!seat) return { error: 'admin.error.seatNotFound' }
  if (seat.used_seats >= seat.max_seats) return { error: `Capacité maximale atteinte (${seat.max_seats} postes)` }

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
  const { supabase } = await requireAdmin()

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
