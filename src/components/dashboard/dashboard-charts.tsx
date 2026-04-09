'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { OPERATOR_ROLE_LABELS } from '@/types/database'
import { Building2, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'

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

const ROLE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6']
const SPEC_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#84cc16', '#e11d48', '#0ea5e9']
const HOSPITAL_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

export function DashboardCharts({ monthlyData, roleCounts, specCounts, hospitalStats, topProcedures }: DashboardChartsProps) {
  const [expandedHospital, setExpandedHospital] = useState<string | null>(null)

  const roleData = Object.entries(roleCounts).map(([key, value]) => ({
    name: OPERATOR_ROLE_LABELS[key as keyof typeof OPERATOR_ROLE_LABELS] || key,
    value,
  }))

  const specData = Object.entries(specCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name: name.length > 15 ? name.slice(0, 15) + '…' : name, value }))

  const hospitalBarData = hospitalStats.slice(0, 7).map(h => ({
    name: h.name.length > 12 ? h.name.slice(0, 12) + '…' : h.name,
    fullName: h.name,
    Opérateur: h.asOperator,
    Assistant: h.asAssistant,
    Observateur: h.asObserver,
  }))

  return (
    <div className="space-y-4">
      {/* Évolution mensuelle */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Évolution mensuelle</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Interventions" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Répartition par rôle & spécialité */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {roleData.length > 0 && (
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Par rôle opératoire</h3>
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
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Par spécialité</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={specData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Interventions par hôpital</h3>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(150, hospitalBarData.length * 40)}>
            <BarChart data={hospitalBarData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={100} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Opérateur" stackId="a" fill="#22c55e" />
              <Bar dataKey="Assistant" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Observateur" stackId="a" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Détails par hôpital — recommandations */}
      {hospitalStats.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Où aller pour quoi ?</h3>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Basé sur vos données : cliquez sur un hôpital pour voir les détails.
          </p>
          <div className="space-y-2">
            {hospitalStats.map((h, idx) => {
              const isExpanded = expandedHospital === h.name
              const topSpecs = Object.entries(h.specialties).sort((a, b) => b[1] - a[1]).slice(0, 5)
              const topProcs = Object.entries(h.procedures).sort((a, b) => b[1] - a[1]).slice(0, 5)
              const operatorPct = h.total > 0 ? Math.round((h.asOperator / h.total) * 100) : 0

              return (
                <div key={h.name} className="rounded-lg border border-slate-100">
                  <button
                    onClick={() => setExpandedHospital(isExpanded ? null : h.name)}
                    className="flex w-full items-center justify-between p-3 text-left hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: HOSPITAL_COLORS[idx % HOSPITAL_COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-slate-800">{h.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-700">{h.total}</span>
                        <span className="ml-1 text-[10px] text-slate-400">int.</span>
                      </div>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        operatorPct >= 50 ? 'bg-green-100 text-green-700' :
                        operatorPct >= 25 ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {operatorPct}% opér.
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 p-3">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                        <div className="rounded-lg bg-green-50 p-2">
                          <p className="font-bold text-green-700">{h.asOperator}</p>
                          <p className="text-[10px] text-green-600">Opérateur</p>
                        </div>
                        <div className="rounded-lg bg-amber-50 p-2">
                          <p className="font-bold text-amber-700">{h.asAssistant}</p>
                          <p className="text-[10px] text-amber-600">Assistant</p>
                        </div>
                        <div className="rounded-lg bg-purple-50 p-2">
                          <p className="font-bold text-purple-700">{h.asObserver}</p>
                          <p className="text-[10px] text-purple-600">Observateur</p>
                        </div>
                      </div>

                      {topSpecs.length > 0 && (
                        <div className="mb-2">
                          <p className="mb-1 text-[10px] font-semibold text-slate-500 uppercase">Top spécialités</p>
                          <div className="flex flex-wrap gap-1">
                            {topSpecs.map(([name, count]) => (
                              <span key={name} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">
                                {name} ({count})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {topProcs.length > 0 && (
                        <div>
                          <p className="mb-1 text-[10px] font-semibold text-slate-500 uppercase">Top interventions</p>
                          <div className="flex flex-wrap gap-1">
                            {topProcs.map(([name, count]) => (
                              <span key={name} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
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
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Top interventions réalisées</h3>
          <div className="space-y-1.5">
            {topProcedures.map((p, i) => {
              const maxCount = topProcedures[0].count
              const pct = maxCount > 0 ? (p.count / maxCount) * 100 : 0
              return (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="w-4 text-right text-[10px] font-bold text-slate-400">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700">{p.name}</span>
                      <span className="font-medium text-slate-800">{p.count}</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-400"
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
        <div className="rounded-xl bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-500">Commencez à enregistrer vos interventions pour voir vos statistiques ici.</p>
          <a href="/logbook" className="mt-2 inline-block text-sm font-medium text-emerald-600 hover:underline">
            Ajouter une intervention
          </a>
        </div>
      )}
    </div>
  )
}
