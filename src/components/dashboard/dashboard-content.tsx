'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { DashboardCharts } from './dashboard-charts'
import { CircularProgress } from './circular-progress'
import {
  Activity, CheckCircle2, CalendarDays, TrendingUp,
  Stethoscope, Clock, ChevronLeft, ChevronRight
} from 'lucide-react'

interface DashboardProfile {
  first_name: string | null
  last_name: string | null
  title: string | null
  des_level: string | null
  avatar_url: string | null
  role: string | null
  hospital: { name: string } | null
}

interface DashboardStats {
  desLevel: string
  totalEntries: number
  validatedEntries: number
  monthlyEntries: number
  roleCounts: Record<string, number>
  specCounts: Record<string, number>
  monthlyData: { month: string; count: number }[]
  yearProgress: {
    total: { current: number; target: number; pct: number }
    operator: { current: number; target: number; pct: number }
    assistant: { current: number; target: number; pct: number }
    observer: { current: number; target: number; pct: number }
  }
  totalProgress: {
    total: { current: number; target: number; pct: number }
    operator: { current: number; target: number; pct: number }
    assistant: { current: number; target: number; pct: number }
    observer: { current: number; target: number; pct: number }
  }
  hospitalStats: Array<{
    name: string
    total: number
    asOperator: number
    asAssistant: number
    asObserver: number
    specialties: Record<string, number>
    procedures: Record<string, number>
  }>
  topProcedures: { name: string; count: number }[]
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function formatDate(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function DashboardContent({ stats, profile }: { stats: DashboardStats; profile: DashboardProfile | null }) {
  const { t } = useI18n()
  const globalPct = stats.yearProgress.total.pct

  const displayName = profile?.title
    ? `${profile.title} ${profile.last_name}`
    : profile?.first_name
      ? `${profile.first_name}`
      : 'Docteur'

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 lg:px-6">
      {/* ═══ Bannière de bienvenue — style Medcare ═══ */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-primary/90 via-primary to-primary/80 p-6 text-white shadow-lg shadow-primary/20 lg:p-8">
        {/* Motif décoratif */}
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 bottom-0 h-24 w-24 rounded-full bg-white/5" />
        <div className="absolute right-20 top-4 h-16 w-16 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-white/70">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="capitalize">{formatDate()}</span>
          </div>
          <h1 className="text-xl font-bold lg:text-2xl">
            {getGreeting()}, {displayName} !
          </h1>
          <p className="mt-1 text-sm text-white/80">
            Bienvenue sur votre tableau de bord InternLog
          </p>

          {/* Badge DES */}
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <Stethoscope className="h-3.5 w-3.5" />
            {t(`des.${stats.desLevel}`) || stats.desLevel}
            {profile?.hospital && (
              <span className="text-white/60">• {(profile.hospital as { name: string }).name}</span>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Layout principal — desktop 2 colonnes ═══ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Colonne principale (2/3) */}
        <div className="space-y-5 lg:col-span-2">

          {/* ─── Stats cards row ─── */}
          <div className="grid grid-cols-3 gap-3 lg:gap-4">
            <StatCard
              icon={Activity}
              value={stats.totalEntries}
              label={t('dashboard.total')}
              color="text-primary"
              bgColor="bg-primary/10"
              trend={stats.monthlyEntries > 0 ? `+${stats.monthlyEntries} ce mois` : undefined}
            />
            <StatCard
              icon={CheckCircle2}
              value={stats.validatedEntries}
              label={t('dashboard.validated')}
              color="text-emerald-400"
              bgColor="bg-emerald-400/10"
              trend={stats.totalEntries > 0 ? `${Math.round((stats.validatedEntries / stats.totalEntries) * 100)}%` : undefined}
            />
            <StatCard
              icon={Clock}
              value={stats.monthlyEntries}
              label={t('dashboard.thisMonth')}
              color="text-violet-400"
              bgColor="bg-violet-400/10"
            />
          </div>

          {/* ─── Progression annuelle + barres ─── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Cercle progression — style Medcare */}
            <div className="card-base flex flex-col items-center justify-center p-5">
              <h3 className="mb-4 self-start text-sm font-semibold text-foreground">
                {t('dashboard.objectives')} {t(`des.${stats.desLevel}`) || stats.desLevel}
              </h3>
              <CircularProgress
                percentage={globalPct}
                size={140}
                strokeWidth={10}
                color={globalPct >= 75 ? '#34d399' : globalPct >= 40 ? '#fbbf24' : '#ef4444'}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                {stats.yearProgress.total.current}/{stats.yearProgress.total.target} interventions
              </p>
            </div>

            {/* Barres de progression par rôle */}
            <div className="card-base p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Répartition par rôle
              </h3>
              <div className="space-y-4">
                {[
                  { label: t('dashboard.operatorSupervised'), ...stats.yearProgress.operator, color: 'bg-primary', textColor: 'text-primary' },
                  { label: t('dashboard.assistantLabel'), ...stats.yearProgress.assistant, color: 'bg-amber-400', textColor: 'text-amber-400' },
                  { label: t('dashboard.observerLabel'), ...stats.yearProgress.observer, color: 'bg-violet-400', textColor: 'text-violet-400' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={`font-bold ${item.textColor}`}>{item.pct}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {item.current}/{item.target}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Progression formation complète ─── */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{t('dashboard.fullTraining')}</h3>
              </div>
              <span className="text-lg font-bold text-primary">{stats.totalProgress.total.pct}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${stats.totalProgress.total.pct}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="rounded-xl bg-card/80 p-2.5 ring-1 ring-border/30">
                <p className="text-sm font-bold text-primary">{stats.totalProgress.operator.current}/{stats.totalProgress.operator.target}</p>
                <p className="text-muted-foreground">{t('dashboard.operatorLabel')}</p>
              </div>
              <div className="rounded-xl bg-card/80 p-2.5 ring-1 ring-border/30">
                <p className="text-sm font-bold text-amber-400">{stats.totalProgress.assistant.current}/{stats.totalProgress.assistant.target}</p>
                <p className="text-muted-foreground">{t('dashboard.assistantLabel')}</p>
              </div>
              <div className="rounded-xl bg-card/80 p-2.5 ring-1 ring-border/30">
                <p className="text-sm font-bold text-violet-400">{stats.totalProgress.observer.current}/{stats.totalProgress.observer.target}</p>
                <p className="text-muted-foreground">{t('dashboard.observerLabel')}</p>
              </div>
            </div>
          </div>

          {/* ─── Charts (évolution, rôles, spécialités, hôpitaux, top procédures) ─── */}
          <DashboardCharts
            monthlyData={stats.monthlyData}
            roleCounts={stats.roleCounts}
            specCounts={stats.specCounts}
            hospitalStats={stats.hospitalStats}
            topProcedures={stats.topProcedures}
          />
        </div>

        {/* ═══ Colonne droite — Widgets (desktop) ═══ */}
        <div className="hidden space-y-5 lg:block">
          {/* Mini calendrier widget */}
          <MiniCalendarWidget />

          {/* Activité récente */}
          <div className="card-base p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity className="h-4 w-4 text-primary" />
              Activité récente
            </h3>
            <div className="space-y-3">
              {stats.monthlyData.slice(-3).reverse().map((m, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                  <span className="text-xs text-muted-foreground capitalize">{m.month}</span>
                  <span className="text-sm font-bold text-foreground">{m.count} <span className="text-xs font-normal text-muted-foreground">int.</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 procédures rapide */}
          {stats.topProcedures.length > 0 && (
            <div className="card-base p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Top procédures
              </h3>
              <div className="space-y-2">
                {stats.topProcedures.slice(0, 5).map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-xs text-foreground">{p.name}</span>
                    <span className="text-xs font-semibold text-muted-foreground">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══ Composants internes ═══ */

function StatCard({
  icon: Icon,
  value,
  label,
  color,
  bgColor,
  trend,
}: {
  icon: React.ElementType
  value: number
  label: string
  color: string
  bgColor: string
  trend?: string
}) {
  return (
    <div className="card-base group relative overflow-hidden p-4 transition-all hover:shadow-md">
      {/* Icône de fond décorative */}
      <div className={`absolute -right-2 -top-2 h-16 w-16 rounded-full ${bgColor} opacity-50 transition-transform group-hover:scale-110`} />

      <div className="relative z-10">
        <div className={`mb-2 inline-flex rounded-xl p-2 ${bgColor}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        {trend && (
          <p className="mt-1 text-[10px] font-medium text-emerald-400">{trend}</p>
        )}
      </div>
    </div>
  )
}

function MiniCalendarWidget() {
  const now = new Date()
  const [displayedDate, setDisplayedDate] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1)
  )

  const year = displayedDate.getFullYear()
  const monthIndex = displayedDate.getMonth()
  const month = displayedDate.toLocaleDateString('fr-FR', { month: 'long' })

  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() === monthIndex
  const today = now.getDate()

  const firstDay = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

  const offset = firstDay === 0 ? 6 : firstDay - 1 // Lundi = premier jour
  const days = Array.from({ length: 42 }, (_, i) => {
    const day = i - offset + 1
    if (day < 1 || day > daysInMonth) return null
    return day
  })

  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  const goToPreviousMonth = () =>
    setDisplayedDate(new Date(year, monthIndex - 1, 1))
  const goToNextMonth = () =>
    setDisplayedDate(new Date(year, monthIndex + 1, 1))
  const goToToday = () =>
    setDisplayedDate(new Date(now.getFullYear(), now.getMonth(), 1))

  return (
    <div className="card-base p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground capitalize">
          <CalendarDays className="h-4 w-4 text-primary" />
          {month} {year}
        </h3>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={goToPreviousMonth}
            aria-label="Mois précédent"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={goToToday}
              aria-label="Revenir au mois en cours"
              className="rounded-lg px-2 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              Aujourd&apos;hui
            </button>
          )}
          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Mois suivant"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
        {weekDays.map((d, i) => (
          <span key={i} className="py-1 font-semibold text-muted-foreground">{d}</span>
        ))}
        {days.map((day, i) => (
          <span
            key={i}
            className={`rounded-lg py-1.5 text-xs transition-colors ${
              day === null
                ? ''
                : isCurrentMonth && day === today
                  ? 'bg-primary font-bold text-primary-foreground shadow-sm shadow-primary/30'
                  : 'text-foreground hover:bg-secondary'
            }`}
          >
            {day ?? ''}
          </span>
        ))}
      </div>
    </div>
  )
}
