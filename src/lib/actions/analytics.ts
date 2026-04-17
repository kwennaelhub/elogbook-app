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

export async function getAnalyticsStats(): Promise<AnalyticsStats | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // ── Toutes les entrées (date + validation) ──
  const { data: allEntries } = await supabase
    .from('entries')
    .select('intervention_date, is_validated, operator_role')
    .eq('user_id', user.id)
    .order('intervention_date', { ascending: true })

  // ── Toutes les gardes ──
  const { data: allGardes } = await supabase
    .from('gardes')
    .select('date, duration_hours, type, hospital:hospitals(name)')
    .eq('user_id', user.id)
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
