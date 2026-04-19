'use server'

import { createClient } from '@/lib/supabase/server'

// ═══ ANALYTICS DASHBOARD — Métriques avancées ═══

export interface AnalyticsStats {
  // Heatmap activité (365 jours)
  heatmapData: { date: string; count: number }[]
  // Streak
  currentStreak: number
  longestStreak: number
  lastEntryDate: string | null
  // Gardes
  gardes: {
    total: number
    thisMonth: number
    byHospital: { name: string; count: number }[]
    byType: Record<string, number>
  }
  // Distribution jours de la semaine
  dayDistribution: { day: string; count: number }[]
  // Taux de validation mensuel (6 mois)
  validationTrend: { month: string; validated: number; pending: number; rate: number }[]
  // Résumé global
  avgPerWeek: number
  avgPerMonth: number
  mostActiveDay: string
  totalGardeHours: number
}

export async function getAnalyticsStats(targetUserId?: string): Promise<AnalyticsStats | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Si targetUserId fourni, vérifier que le caller est admin/superadmin/developer
  let userId = user.id
  if (targetUserId && targetUserId !== user.id) {
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!callerProfile || !['admin', 'superadmin', 'developer'].includes(callerProfile.role)) {
      return null // Pas autorisé
    }
    userId = targetUserId
  }

  // ── Toutes les entrées (date + validation) ──
  const { data: allEntries } = await supabase
    .from('entries')
    .select('intervention_date, is_validated, operator_role')
    .eq('user_id', userId)
    .order('intervention_date', { ascending: true })

  // ── Toutes les gardes ──
  const { data: allGardes } = await supabase
    .from('gardes')
    .select('date, duration_hours, type, hospital:hospitals(name)')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  const entries = allEntries ?? []
  const gardes = allGardes ?? []

  // ═══ 1. HEATMAP — 365 derniers jours ═══
  const heatmapMap: Record<string, number> = {}
  const today = new Date()
  // Initialiser tous les jours à 0
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    heatmapMap[d.toISOString().split('T')[0]] = 0
  }
  // Compter les entrées
  entries.forEach(e => {
    const date = e.intervention_date
    if (date && heatmapMap[date] !== undefined) {
      heatmapMap[date]++
    }
  })
  // Compter les gardes aussi
  gardes.forEach(g => {
    const date = g.date
    if (date && heatmapMap[date] !== undefined) {
      heatmapMap[date]++
    }
  })
  const heatmapData = Object.entries(heatmapMap).map(([date, count]) => ({ date, count }))

  // ═══ 2. STREAK ═══
  const uniqueDates = [...new Set(entries.map(e => e.intervention_date))].sort()
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  const lastEntryDate = uniqueDates.length > 0 ? uniqueDates[uniqueDates.length - 1] : null

  if (uniqueDates.length > 0) {
    tempStreak = 1
    for (let i = uniqueDates.length - 1; i > 0; i--) {
      const curr = new Date(uniqueDates[i])
      const prev = new Date(uniqueDates[i - 1])
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        tempStreak++
      } else {
        break
      }
    }
    currentStreak = tempStreak

    // Longest streak
    tempStreak = 1
    let maxStreak = 1
    for (let i = 1; i < uniqueDates.length; i++) {
      const curr = new Date(uniqueDates[i])
      const prev = new Date(uniqueDates[i - 1])
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        tempStreak++
        maxStreak = Math.max(maxStreak, tempStreak)
      } else {
        tempStreak = 1
      }
    }
    longestStreak = maxStreak
  }

  // ═══ 3. GARDES ═══
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  const startOfMonthStr = startOfMonth.toISOString().split('T')[0]

  const gardesThisMonth = gardes.filter(g => g.date >= startOfMonthStr).length
  const gardesByHospitalMap: Record<string, number> = {}
  const gardesByType: Record<string, number> = {}
  let totalGardeHours = 0

  gardes.forEach(g => {
    const hospital = g.hospital as unknown as { name: string } | null
    const hName = hospital?.name || 'Autre'
    gardesByHospitalMap[hName] = (gardesByHospitalMap[hName] || 0) + 1
    gardesByType[g.type || 'garde'] = (gardesByType[g.type || 'garde'] || 0) + 1
    totalGardeHours += g.duration_hours || 12
  })

  const gardesByHospital = Object.entries(gardesByHospitalMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))

  // ═══ 4. DISTRIBUTION PAR JOUR ═══
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const dayCounts = [0, 0, 0, 0, 0, 0, 0]
  entries.forEach(e => {
    if (e.intervention_date) {
      const day = new Date(e.intervention_date).getDay()
      dayCounts[day]++
    }
  })
  const dayDistribution = dayNames.map((day, i) => ({ day, count: dayCounts[i] }))

  // Jour le plus actif
  const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts))
  const mostActiveDay = dayNames[maxDayIdx]

  // ═══ 5. TAUX DE VALIDATION MENSUEL ═══
  const validationTrend: { month: string; validated: number; pending: number; rate: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonth = d.getMonth() === 11
      ? `${d.getFullYear() + 1}-01-01`
      : `${d.getFullYear()}-${String(d.getMonth() + 2).padStart(2, '0')}-01`

    const monthEntries = entries.filter(e =>
      e.intervention_date >= monthStart && e.intervention_date < nextMonth
    )
    const validated = monthEntries.filter(e => e.is_validated).length
    const pending = monthEntries.length - validated
    const rate = monthEntries.length > 0 ? Math.round((validated / monthEntries.length) * 100) : 0

    validationTrend.push({
      month: d.toLocaleDateString('fr-FR', { month: 'short' }),
      validated,
      pending,
      rate,
    })
  }

  // ═══ 6. MOYENNES ═══
  const totalWeeks = Math.max(1, Math.ceil(
    (today.getTime() - new Date(uniqueDates[0] || today).getTime()) / (1000 * 60 * 60 * 24 * 7)
  ))
  const totalMonths = Math.max(1, Math.ceil(totalWeeks / 4.33))
  const avgPerWeek = Math.round((entries.length / totalWeeks) * 10) / 10
  const avgPerMonth = Math.round((entries.length / totalMonths) * 10) / 10

  return {
    heatmapData,
    currentStreak,
    longestStreak,
    lastEntryDate,
    gardes: {
      total: gardes.length,
      thisMonth: gardesThisMonth,
      byHospital: gardesByHospital,
      byType: gardesByType,
    },
    dayDistribution,
    validationTrend,
    avgPerWeek,
    avgPerMonth,
    mostActiveDay,
    totalGardeHours,
  }
}

// ═══ ADMIN ANALYTICS — Vue établissement ═══

export interface InstitutionStats {
  totalUsers: number
  totalEntries: number
  totalGardes: number
  avgEntriesPerUser: number
  validationRate: number
  // Par niveau DES
  byDesLevel: { level: string; users: number; entries: number; avgEntries: number }[]
  // Top performers (anonymisé pour non-admin)
  topPerformers: { id: string; name: string; desLevel: string; entries: number; validated: number; gardes: number }[]
  // Activité mensuelle globale
  monthlyGlobal: { month: string; entries: number; gardes: number }[]
  // Par hôpital (agrégé)
  byHospital: { name: string; entries: number; users: number }[]
  // Liste utilisateurs pour le sélecteur admin
  userList: { id: string; name: string; desLevel: string; hospital: string; entries: number }[]
}

export interface PeerComparison {
  userEntries: number
  peerAvg: number
  peerMedian: number
  percentile: number
  rank: number
  totalPeers: number
  desLevel: string
}

export async function getInstitutionStats(): Promise<InstitutionStats | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Vérifier rôle admin
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!callerProfile || !['admin', 'superadmin', 'developer'].includes(callerProfile.role)) {
    return null
  }

  // ── Tous les profils actifs (étudiants) ──
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, title, des_level, hospital_id, hospital:hospitals(name)')
    .eq('is_active', true)
    .in('role', ['student', 'admin', 'superadmin', 'developer'])

  // ── Toutes les entrées ──
  const { data: allEntries } = await supabase
    .from('entries')
    .select('user_id, intervention_date, is_validated, operator_role, hospital_id, hospital:hospitals!entries_hospital_id_fkey(name)')

  // ── Toutes les gardes ──
  const { data: allGardes } = await supabase
    .from('gardes')
    .select('user_id, date')

  const users = profiles ?? []
  const entries = allEntries ?? []
  const gardes = allGardes ?? []

  const totalUsers = users.length
  const totalEntries = entries.length
  const totalGardes = gardes.length
  const avgEntriesPerUser = totalUsers > 0 ? Math.round((totalEntries / totalUsers) * 10) / 10 : 0

  const validatedCount = entries.filter(e => e.is_validated).length
  const validationRate = totalEntries > 0 ? Math.round((validatedCount / totalEntries) * 100) : 0

  // ── Par niveau DES ──
  const desLevelMap: Record<string, { users: Set<string>; entries: number }> = {}
  users.forEach(u => {
    const level = u.des_level || 'DES1'
    if (!desLevelMap[level]) desLevelMap[level] = { users: new Set(), entries: 0 }
    desLevelMap[level].users.add(u.id)
  })
  entries.forEach(e => {
    const userProfile = users.find(u => u.id === e.user_id)
    const level = userProfile?.des_level || 'DES1'
    if (desLevelMap[level]) desLevelMap[level].entries++
  })
  const byDesLevel = Object.entries(desLevelMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([level, data]) => ({
      level,
      users: data.users.size,
      entries: data.entries,
      avgEntries: data.users.size > 0 ? Math.round((data.entries / data.users.size) * 10) / 10 : 0,
    }))

  // ── Top performers ──
  const userEntryCounts: Record<string, { entries: number; validated: number; gardes: number }> = {}
  entries.forEach(e => {
    if (!userEntryCounts[e.user_id]) userEntryCounts[e.user_id] = { entries: 0, validated: 0, gardes: 0 }
    userEntryCounts[e.user_id].entries++
    if (e.is_validated) userEntryCounts[e.user_id].validated++
  })
  gardes.forEach(g => {
    if (!userEntryCounts[g.user_id]) userEntryCounts[g.user_id] = { entries: 0, validated: 0, gardes: 0 }
    userEntryCounts[g.user_id].gardes++
  })

  const topPerformers = users
    .map(u => ({
      id: u.id,
      name: `${u.title ? u.title + ' ' : ''}${u.first_name} ${u.last_name}`,
      desLevel: u.des_level || 'DES1',
      entries: userEntryCounts[u.id]?.entries ?? 0,
      validated: userEntryCounts[u.id]?.validated ?? 0,
      gardes: userEntryCounts[u.id]?.gardes ?? 0,
    }))
    .sort((a, b) => b.entries - a.entries)
    .slice(0, 10)

  // ── Activité mensuelle globale (6 mois) ──
  const monthlyGlobal: { month: string; entries: number; gardes: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonth = d.getMonth() === 11
      ? `${d.getFullYear() + 1}-01-01`
      : `${d.getFullYear()}-${String(d.getMonth() + 2).padStart(2, '0')}-01`

    const monthEntries = entries.filter(e => e.intervention_date >= monthStart && e.intervention_date < nextMonth).length
    const monthGardes = gardes.filter(g => g.date >= monthStart && g.date < nextMonth).length

    monthlyGlobal.push({
      month: d.toLocaleDateString('fr-FR', { month: 'short' }),
      entries: monthEntries,
      gardes: monthGardes,
    })
  }

  // ── Par hôpital (agrégé) ──
  const hospitalMap: Record<string, { entries: number; users: Set<string> }> = {}
  entries.forEach(e => {
    const hospital = e.hospital as unknown as { name: string } | null
    const hName = hospital?.name || 'Autre'
    if (!hospitalMap[hName]) hospitalMap[hName] = { entries: 0, users: new Set() }
    hospitalMap[hName].entries++
    hospitalMap[hName].users.add(e.user_id)
  })
  const byHospital = Object.entries(hospitalMap)
    .sort((a, b) => b[1].entries - a[1].entries)
    .map(([name, data]) => ({ name, entries: data.entries, users: data.users.size }))

  // ── Liste utilisateurs pour sélecteur ──
  const userList = users
    .map(u => {
      const hospital = u.hospital as unknown as { name: string } | null
      return {
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        desLevel: u.des_level || 'DES1',
        hospital: hospital?.name || 'Non assigné',
        entries: userEntryCounts[u.id]?.entries ?? 0,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    totalUsers,
    totalEntries,
    totalGardes,
    avgEntriesPerUser,
    validationRate,
    byDesLevel,
    topPerformers,
    monthlyGlobal,
    byHospital,
    userList,
  }
}

// ═══ COMPARATIF ANONYMISÉ — Position vs promotion ═══

export async function getPeerComparison(): Promise<PeerComparison | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Profil de l'utilisateur
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, des_level')
    .eq('id', user.id)
    .single()

  // Le comparatif "Top X% de votre promotion" n'a de sens que pour les DES (role=student).
  // Les superviseurs / chefs de service / institution_admin / admins ne sont pas comparés
  // à une promotion DES — ils n'ont pas de des_level pertinent.
  if (!profile || profile.role !== 'student') return null

  const desLevel = profile.des_level || 'DES1'

  // Compter les entrées de l'utilisateur
  const { count: userEntries } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Trouver tous les peers du même niveau DES
  const { data: peers } = await supabase
    .from('profiles')
    .select('id')
    .eq('des_level', desLevel)
    .eq('is_active', true)

  if (!peers || peers.length <= 1) {
    return {
      userEntries: userEntries ?? 0,
      peerAvg: 0,
      peerMedian: 0,
      percentile: 100,
      rank: 1,
      totalPeers: 1,
      desLevel,
    }
  }

  // Compter les entrées de chaque peer
  const peerCounts: number[] = []
  for (const peer of peers) {
    const { count } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', peer.id)
    peerCounts.push(count ?? 0)
  }

  peerCounts.sort((a, b) => a - b)
  const myCount = userEntries ?? 0
  const peerAvg = Math.round((peerCounts.reduce((s, c) => s + c, 0) / peerCounts.length) * 10) / 10
  const midIdx = Math.floor(peerCounts.length / 2)
  const peerMedian = peerCounts.length % 2 === 0
    ? Math.round(((peerCounts[midIdx - 1] + peerCounts[midIdx]) / 2) * 10) / 10
    : peerCounts[midIdx]

  // Rang et percentile
  const rank = peerCounts.filter(c => c > myCount).length + 1
  const percentile = Math.round(((peerCounts.length - rank + 1) / peerCounts.length) * 100)

  return {
    userEntries: myCount,
    peerAvg,
    peerMedian,
    percentile,
    rank,
    totalPeers: peerCounts.length,
    desLevel,
  }
}
