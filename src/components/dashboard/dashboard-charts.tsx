'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { OPERATOR_ROLE_LABELS } from '@/types/database'

interface DashboardChartsProps {
  monthlyData: { month: string; count: number }[]
  roleCounts: Record<string, number>
  specCounts: Record<string, number>
}

const ROLE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6']
const SPEC_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#84cc16', '#e11d48', '#0ea5e9']

export function DashboardCharts({ monthlyData, roleCounts, specCounts }: DashboardChartsProps) {
  const roleData = Object.entries(roleCounts).map(([key, value]) => ({
    name: OPERATOR_ROLE_LABELS[key as keyof typeof OPERATOR_ROLE_LABELS] || key,
    value,
  }))

  const specData = Object.entries(specCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name: name.length > 15 ? name.slice(0, 15) + '…' : name, value }))

  return (
    <div className="space-y-6">
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
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Par rôle</h3>
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
    </div>
  )
}
