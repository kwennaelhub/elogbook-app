'use client'

import { useState, useTransition } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell,
} from 'recharts'
import {
  Users, Activity, Shield, TrendingUp, Building2,
  Trophy, Search, ExternalLink, ChevronDown,
} from 'lucide-react'
import type { InstitutionStats, PeerComparison } from '@/lib/actions/analytics'
import { getAnalyticsStats } from '@/lib/actions/analytics'
import type { AnalyticsStats } from '@/lib/actions/analytics'

const COLORS = ['#4f6fff', '#b667ac', '#34d399', '#f08863', '#fbbf24', '#818cf8', '#fb7185']

// ═══ VUE ÉTABLISSEMENT (admin only) ═══

export function InstitutionDashboard({ stats }: { stats: InstitutionStats }) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserStats, setSelectedUserStats] = useState<AnalyticsStats | null>(null)
  const [isPending, startTransition] = useTransition()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredUsers = stats.userList.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.desLevel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.hospital.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId)
    startTransition(async () => {
      const userStats = await getAnalyticsStats(userId)
      setSelectedUserStats(userStats)
    })
  }

  return (
    <div className="space-y-5">
      {/* Titre section */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border/60" />
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          Vue établissement
        </h2>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* KPI globaux */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard icon={Users} value={stats.totalUsers} label="Étudiants DES" color="text-primary" bg="bg-primary/10" />
        <KpiCard icon={Activity} value={stats.totalEntries} label="Interventions" color="text-emerald-400" bg="bg-emerald-400/10" />
        <KpiCard icon={Shield} value={stats.totalGardes} label="Gardes" color="text-rose-400" bg="bg-rose-400/10" />
        <KpiCard icon={TrendingUp} value={stats.avgEntriesPerUser} label="Moy. / étudiant" color="text-violet-400" bg="bg-violet-400/10" />
        <KpiCard icon={Trophy} value={`${stats.validationRate}%`} label="Taux validation" color="text-amber-400" bg="bg-amber-400/10" />
      </div>

      {/* Par niveau DES + Activité mensuelle */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Par niveau DES */}
        <div className="card-base p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Par niveau DES</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.byDesLevel}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.05 260)" />
              <XAxis dataKey="level" tick={{ fontSize: 11 }} />
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
              <Bar dataKey="users" name="Étudiants" fill="#4f6fff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avgEntries" name="Moy. interventions" fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activité mensuelle globale */}
        <div className="card-base p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Activité globale — 6 mois</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.monthlyGlobal}>
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
              <Bar dataKey="entries" name="Interventions" fill="#4f6fff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gardes" name="Gardes" fill="#fb7185" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Répartition par hôpital */}
      {stats.byHospital.length > 0 && (
        <div className="card-base p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            Répartition par hôpital
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.byHospital.slice(0, 7)}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="entries"
                  nameKey="name"
                >
                  {stats.byHospital.slice(0, 7).map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {stats.byHospital.slice(0, 7).map((h, i) => (
                <div key={h.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 truncate text-xs text-foreground">{h.name}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{h.entries} int.</span>
                  <span className="text-[10px] text-muted-foreground">({h.users} DES)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top performers */}
      {stats.topPerformers.length > 0 && (
        <div className="card-base p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="h-4 w-4 text-amber-400" />
            Classement — Top 10
          </h3>
          <div className="space-y-1.5">
            {stats.topPerformers.map((p, i) => {
              const maxEntries = stats.topPerformers[0].entries
              const pct = maxEntries > 0 ? (p.entries / maxEntries) * 100 : 0
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectUser(p.id)}
                  className={`flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-secondary/50 ${
                    selectedUserId === p.id ? 'bg-primary/10 ring-1 ring-primary/30' : ''
                  }`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold ${
                    i === 0 ? 'bg-amber-400/20 text-amber-400' :
                    i === 1 ? 'bg-gray-300/20 text-gray-300' :
                    i === 2 ? 'bg-orange-400/20 text-orange-400' :
                    'bg-secondary text-muted-foreground'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate text-foreground font-medium">{p.name}</span>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">{p.desLevel}</span>
                        <span className="font-semibold text-foreground">{p.entries}</span>
                      </div>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary/50" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Sélecteur utilisateur ─── */}
      <div className="card-base p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Search className="h-4 w-4 text-primary" />
          Voir le dashboard d&apos;un étudiant
        </h3>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, niveau DES, hôpital..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {filteredUsers.map(u => (
            <button
              key={u.id}
              onClick={() => handleSelectUser(u.id)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-secondary/50 ${
                selectedUserId === u.id ? 'bg-primary/10 ring-1 ring-primary/30' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{u.name}</span>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">{u.desLevel}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{u.hospital}</span>
                <span className="font-semibold text-foreground">{u.entries} int.</span>
              </div>
            </button>
          ))}
        </div>

        {/* Stats de l'utilisateur sélectionné */}
        {isPending && (
          <div className="mt-4 flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="ml-2 text-xs text-muted-foreground">Chargement...</span>
          </div>
        )}
        {selectedUserStats && !isPending && (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ChevronDown className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">
                Stats de {stats.userList.find(u => u.id === selectedUserId)?.name || 'Utilisateur'}
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Série en cours" value={selectedUserStats.currentStreak} icon="🔥" />
              <MiniStat label="Record série" value={selectedUserStats.longestStreak} icon="🏆" />
              <MiniStat label="Moy. / semaine" value={selectedUserStats.avgPerWeek} icon="📊" />
              <MiniStat label="Gardes" value={selectedUserStats.gardes.total} icon="🛡️" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Jour le plus actif" value={selectedUserStats.mostActiveDay} icon="📅" />
              <MiniStat label="Heures de garde" value={`${selectedUserStats.totalGardeHours}h`} icon="⏱️" />
              <MiniStat label="Moy. / mois" value={selectedUserStats.avgPerMonth} icon="📈" />
              <MiniStat
                label="Validation"
                value={`${selectedUserStats.validationTrend[5]?.rate ?? 0}%`}
                icon="✅"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══ COMPARATIF ANONYMISÉ (pour tous les users) ═══

export function PeerComparisonCard({ comparison }: { comparison: PeerComparison }) {
  const isAboveAvg = comparison.userEntries >= comparison.peerAvg

  return (
    <div className="card-base overflow-hidden">
      {/* Bandeau top */}
      <div className={`px-4 py-2 text-center text-xs font-semibold ${
        comparison.percentile >= 75 ? 'bg-emerald-400/10 text-emerald-400' :
        comparison.percentile >= 50 ? 'bg-primary/10 text-primary' :
        comparison.percentile >= 25 ? 'bg-amber-400/10 text-amber-400' :
        'bg-rose-400/10 text-rose-400'
      }`}>
        {comparison.percentile >= 75 ? '🏆' : comparison.percentile >= 50 ? '📈' : comparison.percentile >= 25 ? '💪' : '🎯'}
        {' '}Top {100 - comparison.percentile + 1}% de votre promotion ({comparison.desLevel})
      </div>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className={`text-xl font-bold ${isAboveAvg ? 'text-emerald-400' : 'text-amber-400'}`}>
              {comparison.userEntries}
            </p>
            <p className="text-[10px] text-muted-foreground">Vos interventions</p>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{comparison.peerAvg}</p>
            <p className="text-[10px] text-muted-foreground">Moyenne promotion</p>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{comparison.peerMedian}</p>
            <p className="text-[10px] text-muted-foreground">Médiane</p>
          </div>
        </div>

        {/* Barre de position */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{comparison.totalPeers}e</span>
            <span className="font-semibold text-primary">#{comparison.rank}</span>
            <span>1er</span>
          </div>
          <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-400 via-50% to-emerald-400"
              style={{ width: '100%' }}
            />
            {/* Marqueur position */}
            <div
              className="absolute top-0 h-full w-0.5 bg-white shadow-sm"
              style={{ left: `${comparison.percentile}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══ Composants utilitaires ═══

function KpiCard({ icon: Icon, value, label, color, bg }: {
  icon: React.ElementType; value: number | string; label: string; color: string; bg: string
}) {
  return (
    <div className="card-base p-3 text-center">
      <div className={`mx-auto mb-1.5 inline-flex rounded-xl p-2 ${bg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

function MiniStat({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="rounded-lg bg-card/80 p-2.5 text-center ring-1 ring-border/30">
      <p className="text-sm font-bold text-foreground">{icon} {value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
