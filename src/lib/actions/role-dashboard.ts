'use server'

import { createClient } from '@/lib/supabase/server'

// ═══ Dashboards role-aware — MVP Phase C ═══
//
// Retourne des données agrégées selon le rôle du caller :
//   - supervisor     : pending validations, DES supervisés, activité de son hôpital
//   - service_chief  : KPIs du service, DES en stage, superviseurs du service
//   - institution_admin : vue globale hôpital (DES / supervisors / services /
//                         adhésions / seats)
//
// Les students gardent leur dashboard personnel existant (getDashboardStats +
// getAnalyticsStats + getPeerComparison).

export interface SupervisorDashboard {
  hospitalName: string | null
  // ── Section 1 : supervision des DES ──
  pendingValidations: number
  desValidatedThisMonth: number          // validations DES (exclut self-logs)
  supervisedDesCount: number
  recentDes: { id: string; name: string; desLevel: string | null; entryCount: number }[]
  // ── Section 2 : mon activité perso ──
  myEntriesThisMonth: number
  myEntriesTotal: number
  myActiveFollowups: number
  // ── Section 3 : contexte hôpital (DES) ──
  hospitalDesEntriesThisMonth: number
}

export interface ServiceChiefDashboard {
  serviceName: string | null
  hospitalName: string | null
  // ── Section 1 : mon service ──
  serviceDesCount: number
  serviceSupervisorsCount: number
  servicePendingValidations: number
  serviceDesEntriesThisMonth: number     // entries des DES du service (exclut supervisor self-logs)
  desByLevel: { level: string; count: number }[]
  // ── Section 2 : mon activité perso ──
  myEntriesThisMonth: number
  myEntriesTotal: number
  myActiveFollowups: number
}

export interface InstitutionAdminDashboard {
  hospitalName: string | null
  totalDes: number
  totalSupervisors: number
  totalServices: number
  entriesThisMonth: number
  pendingValidations: number
  adhesionsPending: number
  seats: { used: number; max: number } | null
  services: { id: string; name: string; desCount: number; supervisorCount: number }[]
}

function firstDayOfCurrentMonthISO(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

// ───────────────────────────────────────────────────────────────────
// SUPERVISOR
// ───────────────────────────────────────────────────────────────────

export async function getSupervisorDashboard(): Promise<SupervisorDashboard | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, hospital_id, hospitals:hospitals!profiles_hospital_id_fkey(name)')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'supervisor') return null

  const since = firstDayOfCurrentMonthISO()
  const hospitalId = profile.hospital_id
  const hospitalData = profile.hospitals as unknown as { name: string } | { name: string }[] | null
  const hospital = Array.isArray(hospitalData) ? hospitalData[0] ?? null : hospitalData

  // Pour distinguer "DES entries" vs "mes auto-logs" : on filtre par user_id
  // (exclut self) pour les KPI de supervision + par user_id=me pour perso.
  const [
    { count: pending },
    { count: desValidated },
    { count: myEntriesMonth },
    { count: myEntriesAll },
    { count: myFollowups },
    { count: hospitalDesEntries },
    { data: supervisedEntries },
  ] = await Promise.all([
    supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('supervisor_id', user.id)
      .is('is_validated', false)
      .is('validated_at', null),
    // Validations que j'ai faites SUR DES D'AUTRES (pas mes self-logs)
    supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('validated_by', user.id)
      .neq('user_id', user.id)
      .gte('validated_at', since),
    // Mes propres interventions ce mois
    supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('intervention_date', since.slice(0, 10)),
    // Mes propres interventions — total
    supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    // Mes patients en suivi actif
    supabase
      .from('patient_followups')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('outcome', 'en_cours'),
    // Activité DES à mon hôpital (contexte — exclut mes self-logs
    // puisque ma role !== student)
    hospitalId
      ? supabase
          .from('entries')
          .select('id, student:profiles!entries_user_id_fkey(role)', { count: 'exact', head: true })
          .eq('hospital_id', hospitalId)
          .eq('student.role', 'student')
          .gte('intervention_date', since.slice(0, 10))
      : Promise.resolve({ count: 0 as number | null }),
    supabase
      .from('entries')
      .select('user_id, student:profiles!entries_user_id_fkey(id, first_name, last_name, des_level)')
      .eq('supervisor_id', user.id)
      .limit(200),
  ])

  // Dedup DES supervisés + compte leurs entries. PostgREST renvoie parfois
  // l'embedding comme tableau même pour un to-one — on normalise.
  const desMap = new Map<string, { id: string; name: string; desLevel: string | null; entryCount: number }>()
  for (const row of supervisedEntries ?? []) {
    const raw = (row as unknown as {
      student?:
        | { id: string; first_name: string | null; last_name: string | null; des_level: string | null }
        | { id: string; first_name: string | null; last_name: string | null; des_level: string | null }[]
        | null
    }).student
    const studentData = Array.isArray(raw) ? raw[0] ?? null : raw
    if (!studentData || !studentData.id) continue
    const key = studentData.id
    const existing = desMap.get(key)
    if (existing) {
      existing.entryCount += 1
    } else {
      desMap.set(key, {
        id: studentData.id,
        name: `${studentData.last_name ?? ''} ${studentData.first_name ?? ''}`.trim() || '—',
        desLevel: studentData.des_level,
        entryCount: 1,
      })
    }
  }
  const recentDes = Array.from(desMap.values())
    .sort((a, b) => b.entryCount - a.entryCount)
    .slice(0, 8)

  return {
    hospitalName: hospital?.name ?? null,
    pendingValidations: pending ?? 0,
    desValidatedThisMonth: desValidated ?? 0,
    supervisedDesCount: desMap.size,
    recentDes,
    myEntriesThisMonth: myEntriesMonth ?? 0,
    myEntriesTotal: myEntriesAll ?? 0,
    myActiveFollowups: myFollowups ?? 0,
    hospitalDesEntriesThisMonth: hospitalDesEntries ?? 0,
  }
}

// ───────────────────────────────────────────────────────────────────
// SERVICE CHIEF
// ───────────────────────────────────────────────────────────────────

export async function getServiceChiefDashboard(): Promise<ServiceChiefDashboard | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, hospital_id, service_id, hospitals:hospitals!profiles_hospital_id_fkey(name)')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'service_chief' || !profile.service_id) return null

  const since = firstDayOfCurrentMonthISO()
  const hospitalData = profile.hospitals as unknown as { name: string } | { name: string }[] | null
  const hospital = Array.isArray(hospitalData) ? hospitalData[0] ?? null : hospitalData

  const { data: service } = await supabase
    .from('hospital_services')
    .select('id, name')
    .eq('id', profile.service_id)
    .single()

  // MVP : on compte les profils DES qui ont des entries dans ce service
  // (pour distinguer DES activity vs supervisor self-logs).
  const [
    { count: pending },
    { count: desEntries },
    { data: desInService },
    { count: supervisors },
    { count: myEntriesMonth },
    { count: myEntriesAll },
    { count: myFollowups },
  ] = await Promise.all([
    supabase
      .from('entries')
      .select('id, student:profiles!entries_user_id_fkey(role)', { count: 'exact', head: true })
      .eq('service_id', profile.service_id)
      .eq('student.role', 'student')
      .is('is_validated', false)
      .is('validated_at', null),
    // Actes DES du service ce mois (exclut self-logs des supervisors/chef)
    supabase
      .from('entries')
      .select('id, student:profiles!entries_user_id_fkey(role)', { count: 'exact', head: true })
      .eq('service_id', profile.service_id)
      .eq('student.role', 'student')
      .gte('intervention_date', since.slice(0, 10)),
    supabase
      .from('entries')
      .select('user_id, student:profiles!entries_user_id_fkey(des_level, role)')
      .eq('service_id', profile.service_id)
      .limit(500),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', profile.service_id)
      .eq('role', 'supervisor'),
    // Mes propres interventions ce mois
    supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('intervention_date', since.slice(0, 10)),
    // Mes propres interventions — total
    supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    // Mes patients en suivi actif
    supabase
      .from('patient_followups')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('outcome', 'en_cours'),
  ])

  // Distinct DES (role=student uniquement) + repartition par niveau
  const desSet = new Set<string>()
  const levelMap = new Map<string, number>()
  for (const row of desInService ?? []) {
    const r = row as unknown as {
      user_id: string
      student?: { des_level: string | null; role: string } | { des_level: string | null; role: string }[] | null
    }
    if (!r.user_id) continue
    const studentObj = Array.isArray(r.student) ? r.student[0] ?? null : r.student
    if (studentObj?.role !== 'student') continue
    if (!desSet.has(r.user_id)) {
      desSet.add(r.user_id)
      const lvl = studentObj?.des_level || 'N/A'
      levelMap.set(lvl, (levelMap.get(lvl) ?? 0) + 1)
    }
  }

  return {
    serviceName: service?.name ?? null,
    hospitalName: hospital?.name ?? null,
    serviceDesCount: desSet.size,
    serviceSupervisorsCount: supervisors ?? 0,
    servicePendingValidations: pending ?? 0,
    serviceDesEntriesThisMonth: desEntries ?? 0,
    desByLevel: Array.from(levelMap.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => a.level.localeCompare(b.level)),
    myEntriesThisMonth: myEntriesMonth ?? 0,
    myEntriesTotal: myEntriesAll ?? 0,
    myActiveFollowups: myFollowups ?? 0,
  }
}

// ───────────────────────────────────────────────────────────────────
// INSTITUTION ADMIN
// ───────────────────────────────────────────────────────────────────

export async function getInstitutionAdminDashboard(): Promise<InstitutionAdminDashboard | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, hospital_id, hospitals:hospitals!profiles_hospital_id_fkey(name)')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'institution_admin' || !profile.hospital_id) return null

  const hospitalId = profile.hospital_id
  const since = firstDayOfCurrentMonthISO()
  const hospitalData = profile.hospitals as unknown as { name: string } | { name: string }[] | null
  const hospital = Array.isArray(hospitalData) ? hospitalData[0] ?? null : hospitalData

  const [
    { count: desCount },
    { count: supervisorCount },
    { count: entriesMonth },
    { count: pending },
    { count: adhesions },
    { data: services },
    { data: seats },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('home_hospital_id', hospitalId)
      .eq('role', 'student'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .in('role', ['supervisor', 'service_chief']),
    supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .gte('intervention_date', since.slice(0, 10)),
    supabase
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .is('is_validated', false)
      .is('validated_at', null),
    supabase
      .from('adhesion_requests')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('status', 'pending'),
    supabase
      .from('hospital_services')
      .select('id, name')
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('institutional_seats')
      .select('used_seats, max_seats')
      .eq('hospital_id', hospitalId),
  ])

  // Counts per service
  const servicesWithCounts: InstitutionAdminDashboard['services'] = []
  for (const svc of services ?? []) {
    const [{ count: desInSvc }, { count: supsInSvc }] = await Promise.all([
      supabase
        .from('entries')
        .select('user_id', { count: 'exact', head: true })
        .eq('service_id', svc.id),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('service_id', svc.id)
        .eq('role', 'supervisor'),
    ])
    servicesWithCounts.push({
      id: svc.id,
      name: svc.name,
      desCount: desInSvc ?? 0,
      supervisorCount: supsInSvc ?? 0,
    })
  }

  // Seats totals (sum all hospital seat rows)
  const seatsTotal = (seats ?? []).reduce(
    (acc, s) => ({ used: acc.used + (s.used_seats ?? 0), max: acc.max + (s.max_seats ?? 0) }),
    { used: 0, max: 0 },
  )

  return {
    hospitalName: hospital?.name ?? null,
    totalDes: desCount ?? 0,
    totalSupervisors: supervisorCount ?? 0,
    totalServices: servicesWithCounts.length,
    entriesThisMonth: entriesMonth ?? 0,
    pendingValidations: pending ?? 0,
    adhesionsPending: adhesions ?? 0,
    seats: seatsTotal.max > 0 ? seatsTotal : null,
    services: servicesWithCounts,
  }
}
