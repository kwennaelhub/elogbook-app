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
    .select('id, first_name, last_name, title')
    .eq('role', 'supervisor')
    .eq('is_active', true)
    .order('last_name')

  if (hospitalId) {
    query = query.eq('hospital_id', hospitalId)
  }

  const { data } = await query
  return data ?? []
}

export async function getSupervisorsWithDetails() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*, hospital:hospitals(id, name)')
    .eq('role', 'supervisor')
    .order('last_name')
  return data ?? []
}

export async function updateSupervisor(supervisorId: string, updates: {
  title?: string
  first_name?: string
  last_name?: string
  phone?: string
  hospital_id?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  // Vérifier rôle admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'superadmin', 'developer'].includes(profile.role)) {
    return { error: 'error.forbidden' }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', supervisorId)
    .eq('role', 'supervisor')

  if (error) return { error: error.message }
  return { success: true }
}

export async function createSupervisor(data: {
  email: string
  first_name: string
  last_name: string
  title: string
  hospital_id: string
  phone?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  // Phase B — vérifier rôle admin OU institution_admin scopé à son hôpital
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, hospital_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'error.forbidden' }

  const isGlobalAdmin = ['admin', 'superadmin', 'developer'].includes(profile.role)
  const isScopedAdmin =
    profile.role === 'institution_admin' && profile.hospital_id === data.hospital_id

  if (!isGlobalAdmin && !isScopedAdmin) {
    return { error: 'error.forbidden' }
  }

  // Créer le compte auth via l'API admin (mot de passe temporaire)
  const { randomBytes } = await import('crypto')
  const tempPassword = `ELog${randomBytes(16).toString('base64url')}!`

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({
        email: data.email,
        password: tempPassword,
        options: {
          data: {
            first_name: data.first_name,
            last_name: data.last_name,
          },
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json()
    const rawMsg = err.msg || err.message || ''
    if (rawMsg.toLowerCase().includes('already registered')) {
      return { error: 'auth.error.emailExists' }
    }
    return { error: rawMsg || 'auth.error.creationFailed' }
  }

  const authData = await response.json()
  const userId = authData.id

  // Mettre à jour le profil (créé par le trigger) avec le rôle et le titre
  const { error } = await supabase
    .from('profiles')
    .update({
      role: 'supervisor',
      title: data.title,
      hospital_id: data.hospital_id,
      phone: data.phone || null,
    })
    .eq('id', userId)

  if (error) return { error: error.message }

  return { success: true, tempPassword }
}

// ========== REGISTRE DES ==========

export async function addDesRegistryEntry(data: {
  matricule: string
  first_name: string
  last_name: string
  email?: string
  des_level: string
  promotion_year: number
  university?: string
  specialty?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  // Vérifier rôle admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'superadmin', 'developer'].includes(profile.role)) {
    return { error: 'error.forbidden' }
  }

  const { error } = await supabase.from('des_registry').insert({
    matricule: data.matricule,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email || null,
    des_level: data.des_level,
    promotion_year: data.promotion_year,
    university: data.university || 'Université d\'Abomey-Calavi',
    specialty: data.specialty || null,
    added_by: user.id,
  })

  if (error) {
    if (error.code === '23505') return { error: 'auth.error.matriculeExists' }
    return { error: error.message }
  }
  return { success: true }
}

export async function importDesRegistryBatch(entries: {
  matricule: string
  first_name: string
  last_name: string
  email?: string
  des_level: string
  promotion_year: number
  university?: string
  specialty?: string
}[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized', imported: 0, errors: [] as string[] }

  // Vérifier rôle admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'superadmin', 'developer'].includes(profile.role)) {
    return { error: 'error.forbidden', imported: 0, errors: [] as string[] }
  }

  let imported = 0
  const errors: string[] = []

  for (const entry of entries) {
    const { error } = await supabase.from('des_registry').insert({
      matricule: entry.matricule,
      first_name: entry.first_name,
      last_name: entry.last_name,
      email: entry.email || null,
      des_level: entry.des_level,
      promotion_year: entry.promotion_year,
      university: entry.university || 'Université d\'Abomey-Calavi',
      specialty: entry.specialty || null,
      added_by: user.id,
    })

    if (error) {
      errors.push(`${entry.matricule}: ${error.code === '23505' ? 'Doublon' : error.message}`)
    } else {
      imported++
    }
  }

  return { success: true, imported, errors }
}

// ========== DASHBOARD ==========

// Objectifs DES par année (nombre minimum d'interventions attendu)
// Ces objectifs sont basés sur les standards du DES de chirurgie au Bénin
const DES_YEARLY_OBJECTIVES: Record<string, {
  total: number  // Total interventions attendues
  operator: number  // En tant qu'opérateur (supervisé + autonome)
  assistant: number  // En tant qu'assistant
  observer: number  // En tant qu'observateur (minimum)
}> = {
  DES1: { total: 30, operator: 5, assistant: 15, observer: 10 },
  DES2: { total: 50, operator: 15, assistant: 25, observer: 10 },
  DES3: { total: 70, operator: 30, assistant: 30, observer: 10 },
  DES4: { total: 80, operator: 45, assistant: 25, observer: 10 },
  DES5: { total: 100, operator: 60, assistant: 30, observer: 10 },
}

// Objectifs cumulés sur toute la formation
const DES_TOTAL_OBJECTIVES = {
  total: 330,
  operator: 155,
  assistant: 125,
  observer: 50,
}

export async function getDashboardStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Récupérer le profil pour connaître le niveau DES
  const { data: profile } = await supabase
    .from('profiles')
    .select('des_level, hospital_id, created_at')
    .eq('id', user.id)
    .single()

  const desLevel = profile?.des_level || 'DES1'

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

  // Récupérer TOUTES les entrées pour les analyses détaillées
  const { data: allEntries } = await supabase
    .from('entries')
    .select(`
      operator_role,
      hospital_id,
      intervention_date,
      specialty_id,
      procedure_id,
      hospital:hospitals!entries_hospital_id_fkey(name),
      specialty:specialties!entries_specialty_id_fkey(name),
      procedure:procedures!entries_procedure_id_fkey(name)
    `)
    .eq('user_id', user.id)

  // Répartition par rôle
  const roleCounts: Record<string, number> = {}
  allEntries?.forEach((e) => {
    roleCounts[e.operator_role] = (roleCounts[e.operator_role] || 0) + 1
  })

  // Répartition par spécialité
  const specCounts: Record<string, number> = {}
  allEntries?.forEach((e) => {
    const spec = e.specialty as unknown as { name: string } | null
    const name = spec?.name || 'Autre'
    specCounts[name] = (specCounts[name] || 0) + 1
  })

  // Stats par hôpital avec détails
  const hospitalStats: Record<string, {
    name: string
    total: number
    asOperator: number
    asAssistant: number
    asObserver: number
    specialties: Record<string, number>
    procedures: Record<string, number>
  }> = {}

  allEntries?.forEach((e) => {
    const h = e.hospital as unknown as { name: string } | null
    const hName = h?.name || 'Autre'
    const hId = e.hospital_id || 'other'
    if (!hospitalStats[hId]) {
      hospitalStats[hId] = { name: hName, total: 0, asOperator: 0, asAssistant: 0, asObserver: 0, specialties: {}, procedures: {} }
    }
    hospitalStats[hId].total++
    if (e.operator_role === 'supervised_operator' || e.operator_role === 'autonomous_operator') {
      hospitalStats[hId].asOperator++
    } else if (e.operator_role === 'assistant') {
      hospitalStats[hId].asAssistant++
    } else {
      hospitalStats[hId].asObserver++
    }
    // Spécialités par hôpital
    const spec = e.specialty as unknown as { name: string } | null
    if (spec?.name) {
      hospitalStats[hId].specialties[spec.name] = (hospitalStats[hId].specialties[spec.name] || 0) + 1
    }
    // Procédures par hôpital
    const proc = e.procedure as unknown as { name: string } | null
    if (proc?.name) {
      hospitalStats[hId].procedures[proc.name] = (hospitalStats[hId].procedures[proc.name] || 0) + 1
    }
  })

  // Objectifs DES — calcul du % d'atteinte
  const yearObjectives = DES_YEARLY_OBJECTIVES[desLevel] || DES_YEARLY_OBJECTIVES.DES1
  const operatorCount = (roleCounts['supervised_operator'] || 0) + (roleCounts['autonomous_operator'] || 0)
  const assistantCount = roleCounts['assistant'] || 0
  const observerCount = roleCounts['observer'] || 0
  const total = totalEntries ?? 0

  const yearProgress = {
    total: { current: total, target: yearObjectives.total, pct: Math.min(100, Math.round((total / yearObjectives.total) * 100)) },
    operator: { current: operatorCount, target: yearObjectives.operator, pct: Math.min(100, Math.round((operatorCount / yearObjectives.operator) * 100)) },
    assistant: { current: assistantCount, target: yearObjectives.assistant, pct: Math.min(100, Math.round((assistantCount / yearObjectives.assistant) * 100)) },
    observer: { current: observerCount, target: yearObjectives.observer, pct: Math.min(100, Math.round((observerCount / yearObjectives.observer) * 100)) },
  }

  const totalProgress = {
    total: { current: total, target: DES_TOTAL_OBJECTIVES.total, pct: Math.min(100, Math.round((total / DES_TOTAL_OBJECTIVES.total) * 100)) },
    operator: { current: operatorCount, target: DES_TOTAL_OBJECTIVES.operator, pct: Math.min(100, Math.round((operatorCount / DES_TOTAL_OBJECTIVES.operator) * 100)) },
    assistant: { current: assistantCount, target: DES_TOTAL_OBJECTIVES.assistant, pct: Math.min(100, Math.round((assistantCount / DES_TOTAL_OBJECTIVES.assistant) * 100)) },
    observer: { current: observerCount, target: DES_TOTAL_OBJECTIVES.observer, pct: Math.min(100, Math.round((observerCount / DES_TOTAL_OBJECTIVES.observer) * 100)) },
  }

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

  // Top procédures
  const procCounts: Record<string, number> = {}
  allEntries?.forEach((e) => {
    const proc = e.procedure as unknown as { name: string } | null
    if (proc?.name) {
      procCounts[proc.name] = (procCounts[proc.name] || 0) + 1
    }
  })
  const topProcedures = Object.entries(procCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  return {
    desLevel,
    totalEntries: totalEntries ?? 0,
    validatedEntries: validatedEntries ?? 0,
    monthlyEntries: monthlyEntries ?? 0,
    roleCounts,
    specCounts,
    monthlyData,
    yearProgress,
    totalProgress,
    hospitalStats: Object.values(hospitalStats).sort((a, b) => b.total - a.total),
    topProcedures,
  }
}

// ========== EXPORT STATS UTILISATEUR ==========

export async function getUserStatsForExport(userId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Vérifier que c'est un admin ou l'utilisateur lui-même
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const targetId = userId && ['admin', 'superadmin'].includes(adminProfile?.role || '') ? userId : user.id

  // Profil cible
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('*, hospital:hospitals(name)')
    .eq('id', targetId)
    .single()

  if (!targetProfile) return null

  // Toutes les entrées
  const { data: entries } = await supabase
    .from('entries')
    .select(`
      *,
      hospital:hospitals!entries_hospital_id_fkey(name),
      specialty:specialties!entries_specialty_id_fkey(name),
      procedure:procedures!entries_procedure_id_fkey(name),
      supervisor:profiles!entries_supervisor_id_fkey(first_name, last_name, title)
    `)
    .eq('user_id', targetId)
    .order('intervention_date', { ascending: false })

  // Toutes les gardes
  const { data: gardes } = await supabase
    .from('gardes')
    .select('*, hospital:hospitals(name)')
    .eq('user_id', targetId)
    .order('date', { ascending: false })

  return {
    profile: targetProfile,
    entries: entries ?? [],
    gardes: gardes ?? [],
  }
}
