'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from 'recharts'
import {
  Flame, Trophy, CalendarClock, Shield, Clock,
  TrendingUp, BarChart3, Activity,
} from 'lucide-react'
import type { AnalyticsStats } from '@/lib/actions/analytics'

// ═══ HEATMAP ACTIVITÉ (style GitHub) ═══

function ActivityHeatmap({ data }: { data: { date: string; count: number }[] }) {
  const weeks = useMemo(() => {
    const result: { date: string; count: number; dayOfWeek: number }[][] = []
    let currentWeek: { date: string; count: number; dayOfWeek: number }[] = []

    data.forEach((item, idx) => {
      const d = new Date(item.date)
      const dayOfWeek = d.getDay() // 0=dim, 1=lun...
      // Commencer une nouvelle semaine le lundi
      if (dayOfWeek === 1 && currentWeek.length > 0) {
        result.push(currentWeek)
        currentWeek = []
      }
      currentWeek.push({ ...item, dayOfWeek })
      if (idx === data.length - 1) {
        result.push(currentWeek)
      }
    })
    return result
  }, [data])

  const maxCount = Math.max(1, ...data.map(d => d.count))

  function getColor(count: number): string {
    if (count === 0) return 'bg-secondary/60'
    const intensity = count / maxCount
    if (intensity <= 0.25) return 'bg-primary/20'
    if (intensity <= 0.5) return 'bg-primary/40'
    if (intensity <= 0.75) return 'bg-primary/70'
    return 'bg-primary'
  }

  const dayLabels = ['', 'L', '', 'M', '', 'V', '']
  const totalDays = data.filter(d => d.count > 0).length

  return (
    <div className="card-base p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Activity className="h-4 w-4 text-primary" />
          Activité — 365 derniers jours
        </h3>
        <span className="text-xs text-muted-foreground">
          {totalDays} jours actifs
        </span>
      </div>

      <div className="flex gap-[2px] overflow-x-auto pb-1">
        {/* Labels jours */}
        <div className="flex flex-col gap-[2px] pr-1">
          {dayLabels.map((label, i) => (
            <div key={i} className="flex h-[11px] w-3 items-center justify-center text-[8px] text-muted-foreground">
              {label}
            </div>
          ))}
        </div>
        {/* Grille */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[2px]">
            {Array.from({ length: 7 }, (_, di) => {
              const cell = week.find(c => c.dayOfWeek === di)
              if (!cell) return <div key={di} className="h-[11px] w-[11px]" />
              return (
                <div
                  key={di}
                  className={`h-[11px] w-[11px] rounded-[2px] transition-colors ${getColor(cell.count)}`}
                  title={`${cell.date}: ${cell.count} activité${cell.count > 1 ? 's' : ''}`}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Légende */}
      <div className="mt-2 flex items-center justify-end gap-1 text-[9px] text-muted-foreground">
        <span>Moins</span>
        <div className="h-[9px] w-[9px] rounded-[2px] bg-secondary/60" />
        <div className="h-[9px] w-[9px] rounded-[2px] bg-primary/20" />
        <div className="h-[9px] w-[9px] rounded-[2px] bg-primary/40" />
        <div className="h-[9px] w-[9px] rounded-[2px] bg-primary/70" />
        <div className="h-[9px] w-[9px] rounded-[2px] bg-primary" />
        <span>Plus</span>
      </div>
    </div>
  )
}

// ═══ STREAK & STATS RAPIDES ═══

function StatsCards({ stats }: { stats: AnalyticsStats }) {
  // Capture l'instant au mount pour éviter `Date.now()` pendant le render (règle pure).
  const [mountTs] = useState(() => Date.now())
  const daysSinceLastEntry = stats.lastEntryDate
    ? Math.floor((mountTs - new Date(stats.lastEntryDate).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Série en cours */}
      <div className="card-base group relative overflow-hidden p-4 transition-all hover:shadow-md">
        <div className="absolute -right-2 -top-2 h-14 w-14 rounded-full bg-amber-400/10 opacity-50 transition-transform group-hover:scale-110" />
        <div className="relative z-10">
          <div className="mb-2 inline-flex rounded-xl bg-amber-400/10 p-2">
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{stats.currentStreak}</p>
          <p className="text-[11px] font-medium text-muted-foreground">Série en cours</p>
          {daysSinceLastEntry !== null && daysSinceLastEntry > 0 && (
            <p className="mt-0.5 text-[10px] text-muted-foreground/70">
              Dernière il y a {daysSinceLastEntry}j
            </p>
          )}
        </div>
      </div>

      {/* Record */}
      <div className="card-base group relative overflow-hidden p-4 transition-all hover:shadow-md">
        <div className="absolute -right-2 -top-2 h-14 w-14 rounded-full bg-yellow-400/10 opacity-50 transition-transform group-hover:scale-110" />
        <div className="relative z-10">
          <div className="mb-2 inline-flex rounded-xl bg-yellow-400/10 p-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats.longestStreak}</p>
          <p className="text-[11px] font-medium text-muted-foreground">Record série</p>
        </div>
      </div>

      {/* Moyenne / semaine */}
      <div className="card-base group relative overflow-hidden p-4 transition-all hover:shadow-md">
        <div className="absolute -right-2 -top-2 h-14 w-14 rounded-full bg-primary/10 opacity-50 transition-transform group-hover:scale-110" />
        <div className="relative z-10">
          <div className="mb-2 inline-flex rounded-xl bg-primary/10 p-2">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary">{stats.avgPerWeek}</p>
          <p className="text-[11px] font-medium text-muted-foreground">Moy. / semaine</p>
        </div>
      </div>

      {/* Total gardes */}
      <div className="card-base group relative overflow-hidden p-4 transition-all hover:shadow-md">
        <div className="absolute -right-2 -top-2 h-14 w-14 rounded-full bg-rose-400/10 opacity-50 transition-transform group-hover:scale-110" />
        <div className="relative z-10">
          <div className="mb-2 inline-flex rounded-xl bg-rose-400/10 p-2">
            <Shield className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">{stats.gardes.total}</p>
          <p className="text-[11px] font-medium text-muted-foreground">Gardes totales</p>
          {stats.gardes.thisMonth > 0 && (
            <p className="mt-0.5 text-[10px] text-emerald-400">+{stats.gardes.thisMonth} ce mois</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══ DISTRIBUTION PAR JOUR ═══

function DayDistributionChart({ data, mostActiveDay }: { data: { day: string; count: number }[]; mostActiveDay: string }) {
  // Réorganiser : Lun-Dim au lieu de Dim-Sam
  const ordered = [...data.slice(1), data[0]]

  return (
    <div className="card-base p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarClock className="h-4 w-4 text-primary" />
          Jours les plus actifs
        </h3>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
          Pic : {mostActiveDay}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={ordered}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.05 260)" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'oklch(0.15 0.02 260)',
              border: '1px solid oklch(0.3 0.02 260)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Bar
            dataKey="count"
            name="Interventions"
            radius={[4, 4, 0, 0]}
            fill="#4f6fff"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ═══ TAUX DE VALIDATION TREND ═══

function ValidationTrend({ data }: { data: { month: string; validated: number; pending: number; rate: number }[] }) {
  return (
    <div className="card-base p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BarChart3 className="h-4 w-4 text-primary" />
          Taux de validation
        </h3>
        {data.length > 0 && (
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
            data[data.length - 1].rate >= 70 ? 'bg-accent/10 text-accent' :
            data[data.length - 1].rate >= 40 ? 'bg-amber-500/10 text-amber-400' :
            'bg-destructive/10 text-destructive'
          }`}>
            {data[data.length - 1].rate}% ce mois
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.05 260)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'oklch(0.15 0.02 260)',
              border: '1px solid oklch(0.3 0.02 260)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area type="monotone" dataKey="validated" name="Validées" stackId="1" fill="#34d399" stroke="#34d399" fillOpacity={0.3} />
          <Area type="monotone" dataKey="pending" name="En attente" stackId="1" fill="#fbbf24" stroke="#fbbf24" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ═══ GARDES RÉSUMÉ ═══

function GardesSummary({ gardes, totalHours }: { gardes: AnalyticsStats['gardes']; totalHours: number }) {
  if (gardes.total === 0) return null

  return (
    <div className="card-base p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock className="h-4 w-4 text-rose-400" />
          Gardes
        </h3>
        <span className="text-xs text-muted-foreground">{totalHours}h au total</span>
      </div>

      {/* Par hôpital */}
      <div className="space-y-2">
        {gardes.byHospital.slice(0, 5).map((h) => {
          const pct = gardes.total > 0 ? (h.count / gardes.total) * 100 : 0
          return (
            <div key={h.name}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground">{h.name}</span>
                <span className="font-semibold text-foreground">{h.count}</span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-rose-400/60"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══ SECTION PRINCIPALE ═══

export function AnalyticsSection({ stats }: { stats: AnalyticsStats }) {
  return (
    <div className="space-y-5">
      {/* Titre section */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border/60" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Analytique
        </h2>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Stats rapides : streak, record, moyenne, gardes */}
      <StatsCards stats={stats} />

      {/* Heatmap activité */}
      <ActivityHeatmap data={stats.heatmapData} />

      {/* Distribution jours + Validation trend */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DayDistributionChart
          data={stats.dayDistribution}
          mostActiveDay={stats.mostActiveDay}
        />
        <ValidationTrend data={stats.validationTrend} />
      </div>

      {/* Gardes résumé */}
      <GardesSummary gardes={stats.gardes} totalHours={stats.totalGardeHours} />
    </div>
  )
}
