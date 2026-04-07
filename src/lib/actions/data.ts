'use server'

import { createClient } from '@/lib/supabase/server'

export async function getHospitals() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('hospitals')
    .select('*')
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

export async function getSpecialties() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('specialties')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  return data ?? []
}

export async function getProcedures(specialtyId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('procedures')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (specialtyId) {
    query = query.eq('specialty_id', specialtyId)
  }

  const { data } = await query
  return data ?? []
}

export async function getSupervisors(hospitalId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('role', 'supervisor')
    .eq('is_active', true)
    .order('last_name')

  if (hospitalId) {
    query = query.eq('hospital_id', hospitalId)
  }

  const { data } = await query
  return data ?? []
}

export async function getDashboardStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Total des interventions
  const { count: totalEntries } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Interventions validées
  const { count: validatedEntries } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_validated', true)

  // Interventions ce mois
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  const { count: monthlyEntries } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('intervention_date', startOfMonth.toISOString().split('T')[0])

  // Répartition par rôle
  const { data: roleData } = await supabase
    .from('entries')
    .select('operator_role')
    .eq('user_id', user.id)

  const roleCounts: Record<string, number> = {}
  roleData?.forEach((e) => {
    roleCounts[e.operator_role] = (roleCounts[e.operator_role] || 0) + 1
  })

  // Répartition par spécialité
  const { data: specData } = await supabase
    .from('entries')
    .select('specialty:specialties!entries_specialty_id_fkey(name)')
    .eq('user_id', user.id)

  const specCounts: Record<string, number> = {}
  specData?.forEach((e) => {
    const spec = e.specialty as unknown as { name: string } | null
    const name = spec?.name || 'Autre'
    specCounts[name] = (specCounts[name] || 0) + 1
  })

  // Évolution mensuelle (6 derniers mois)
  const monthlyData: { month: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const end = d.getMonth() === 11
      ? `${d.getFullYear() + 1}-01-01`
      : `${d.getFullYear()}-${String(d.getMonth() + 2).padStart(2, '0')}-01`

    const { count } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('intervention_date', start)
      .lt('intervention_date', end)

    monthlyData.push({
      month: d.toLocaleDateString('fr-FR', { month: 'short' }),
      count: count ?? 0,
    })
  }

  return {
    totalEntries: totalEntries ?? 0,
    validatedEntries: validatedEntries ?? 0,
    monthlyEntries: monthlyEntries ?? 0,
    roleCounts,
    specCounts,
    monthlyData,
  }
}
