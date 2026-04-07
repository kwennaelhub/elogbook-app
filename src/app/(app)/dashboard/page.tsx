import { getDashboardStats } from '@/lib/actions/data'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-slate-500">Impossible de charger les statistiques</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Tableau de bord</h2>

      {/* Cartes résumé */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-2xl font-bold text-blue-600">{stats.totalEntries}</p>
          <p className="text-[10px] text-slate-500">Total</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-2xl font-bold text-green-600">{stats.validatedEntries}</p>
          <p className="text-[10px] text-slate-500">Validées</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-2xl font-bold text-purple-600">{stats.monthlyEntries}</p>
          <p className="text-[10px] text-slate-500">Ce mois</p>
        </div>
      </div>

      <DashboardCharts
        monthlyData={stats.monthlyData}
        roleCounts={stats.roleCounts}
        specCounts={stats.specCounts}
      />
    </div>
  )
}
