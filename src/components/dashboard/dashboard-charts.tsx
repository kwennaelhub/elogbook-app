'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Building2, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

interface HospitalStat {
  name: string
  total: number
  asOperator: number
  asAssistant: number
  asObserver: number
  specialties: Record<string, number>
  procedures: Record<string, number>
}

interface DashboardChartsProps {
  monthlyData: { month: string; count: number }[]
  roleCounts: Record<string, number>
  specCounts: Record<string, number>
  hospitalStats: HospitalStat[]
  topProcedures: { name: string; count: number }[]
}

// Medcare Navy palette: blue royal, violet, emerald, coral, amber
const ROLE_COLORS = ['#4f6fff', '#b667ac', '#34d399', '#f08863']
const SPEC_COLORS = ['#4f6fff', '#b667ac', '#34d399', '#f08863', '#fbbf24', '#818cf8', '#fb7185', '#38bdf8', '#a78bfa', '#4ade80', '#f472b6', '#22d3ee', '#e879f9']
const HOSPITAL_COLORS = ['#4f6fff', '#b667ac', '#34d399', '#f08863', '#fbbf24', '#818cf8', '#fb7185']

export function DashboardCharts({ monthlyData, roleCounts, specCounts, hospitalStats, topProcedures }: DashboardChartsProps) {
  const { t, locale } = useI18n()
  const [expandedHospital, setExpandedHospital] = useState<string | null>(null)

  const ROLE_LABEL_KEYS: Record<string, string> = {
    observer: 'dashboard.observer',
    assistant: 'dashboard.assistant',
    supervised_operator: 'dashboard.operator',
    autonomous_operator: 'dashboard.operator',
  }

  const roleData = Object.entries(roleCounts).map(([key, value]) => ({
    name: ROLE_LABEL_KEYS[key] ? t(ROLE_LABEL_KEYS[key]) : key,
    value,
  }))

  const localizedMonthlyData = useMemo(() => {
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      months.push(d.toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { month: 'short' }))
    }
    return monthlyData.map((item, idx) => ({
      ...item,
      month: months[idx] ?? item.month,
    }))
  }, [monthlyData, locale])

  const specData = Object.entries(specCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name: name.length > 15 ? name.slice(0, 15) + '…' : name, value }))

  const operatorLabel = t('dashboard.operatorLabel')
  const assistantLabel = t('dashboard.assistantLabel')
  const observerLabel = t('dashboard.observerLabel')

  const hospitalBarData = hospitalStats.slice(0, 7).map(h => ({
    name: h.name.length > 12 ? h.name.slice(0, 12) + '…' : h.name,
    fullName: h.name,
    [operatorLabel]: h.asOperator,
    [assistantLabel]: h.asAssistant,
    [observerLabel]: h.asObserver,
  }))

  return (
    <div className="space-y-4">
      {/* Évolution mensuelle */}
      <div className="card-base">
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t('dashboard.monthlyEvolution')}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={localizedMonthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.05 260)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#4f6fff" radius={[4, 4, 0, 0]} name="Interventions" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Répartition par rôle & spécialité */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {roleData.length > 0 && (
          <div className="card-base">
            <h3 className="mb-3 text-sm font-semibold text-foreground">{t('dashboard.byRole')}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {roleData.map((_, index) => (
                    <Cell key={index} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {specData.length > 0 && (
          <div className="card-base">
            <h3 className="mb-3 text-sm font-semibold text-foreground">{t('dashboard.bySpecialty')}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={specData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.05 260)" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={100} />
                <Tooltip />
                <Bar dataKey="value" name="Interventions">
                  {specData.map((_, index) => (
                    <Cell key={index} fill={SPEC_COLORS[index % SPEC_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Stats par hôpital — graphique empilé */}
      {hospitalStats.length > 0 && (
        <div className="card-base">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t('dashboard.byHospital')}</h3>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(150, hospitalBarData.length * 40)}>
            <BarChart data={hospitalBarData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.05 260)" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={100} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey={operatorLabel} stackId="a" fill="#4f6fff" />
              <Bar dataKey={assistantLabel} stackId="a" fill="#fbbf24" />
              <Bar dataKey={observerLabel} stackId="a" fill="#a78bfa" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Détails par hôpital — recommandations */}
      {hospitalStats.length > 0 && (
        <div className="card-base">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t('dashboard.whereToGo')}</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Basé sur vos données : cliquez sur un hôpital pour voir les détails.
          </p>
          <div className="space-y-2">
            {hospitalStats.map((h, idx) => {
              const isExpanded = expandedHospital === h.name
              const topSpecs = Object.entries(h.specialties).sort((a, b) => b[1] - a[1]).slice(0, 5)
              const topProcs = Object.entries(h.procedures).sort((a, b) => b[1] - a[1]).slice(0, 5)
              const operatorPct = h.total > 0 ? Math.round((h.asOperator / h.total) * 100) : 0

              return (
                <div key={h.name} className="rounded-lg border border-border/60 transition-colors hover:border-primary/30">
                  <button
                    onClick={() => setExpandedHospital(isExpanded ? null : h.name)}
                    className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: HOSPITAL_COLORS[idx % HOSPITAL_COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-foreground">{h.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-bold text-foreground">{h.total}</span>
                        <span className="ml-1 text-[10px] text-muted-foreground">int.</span>
                      </div>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        operatorPct >= 50 ? 'bg-accent/10 text-accent' :
                        operatorPct >= 25 ? 'bg-amber-500/15 text-amber-400' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {operatorPct}% opér.
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/60 p-3">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                        <div className="rounded-lg bg-accent/10 p-2">
                          <p className="font-bold text-accent">{h.asOperator}</p>
                          <p className="text-[10px] text-accent/80">{operatorLabel}</p>
                        </div>
                        <div className="rounded-lg bg-amber-500/10 p-2">
                          <p className="font-bold text-amber-400">{h.asAssistant}</p>
                          <p className="text-[10px] text-amber-300/80">{assistantLabel}</p>
                        </div>
                        <div className="rounded-lg bg-violet-500/10 p-2">
                          <p className="font-bold text-violet-400">{h.asObserver}</p>
                          <p className="text-[10px] text-violet-300/80">{observerLabel}</p>
                        </div>
                      </div>

                      {topSpecs.length > 0 && (
                        <div className="mb-2">
                          <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase">Top spécialités</p>
                          <div className="flex flex-wrap gap-1">
                            {topSpecs.map(([name, count]) => (
                              <span key={name} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                                {name} ({count})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {topProcs.length > 0 && (
                        <div>
                          <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase">Top interventions</p>
                          <div className="flex flex-wrap gap-1">
                            {topProcs.map(([name, count]) => (
                              <span key={name} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                                {name} ({count})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top procédures */}
      {topProcedures.length > 0 && (
        <div className="card-base">
          <h3 className="mb-3 text-sm font-semibold text-foreground">{t('dashboard.topProcedures')}</h3>
          <div className="space-y-1.5">
            {topProcedures.map((p, i) => {
              const maxCount = topProcedures[0].count
              const pct = maxCount > 0 ? (p.count / maxCount) * 100 : 0
              return (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="w-4 text-right text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground">{p.name}</span>
                      <span className="font-semibold text-foreground">{p.count}</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Message si aucune donnée */}
      {Object.keys(roleCounts).length === 0 && hospitalStats.length === 0 && (
        <div className="rounded-xl border border-border/60 bg-secondary/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">{t('dashboard.noData')}</p>
          <a href="/logbook" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
            {t('dashboard.addEntry')}
          </a>
        </div>
      )}
    </div>
  )
}
