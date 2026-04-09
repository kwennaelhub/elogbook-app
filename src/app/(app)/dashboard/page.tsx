import { getDashboardStats } from '@/lib/actions/data'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import type { DesLevel } from '@/types/database'
import { getServerT } from '@/lib/i18n/server'

export default async function DashboardPage() {
  const [stats, t] = await Promise.all([getDashboardStats(), getServerT()])

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-slate-500">{t('common.error')}</p>
      </div>
    )
  }

  const globalPct = stats.yearProgress.total.pct
  const progressColor = globalPct >= 75 ? 'text-green-600' : globalPct >= 40 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{t('dashboard.title')}</h2>
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          {t(`des.${stats.desLevel}`) || stats.desLevel}
        </span>
      </div>

      {/* Cartes résumé */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-2xl font-bold text-blue-600">{stats.totalEntries}</p>
          <p className="text-[11px] text-slate-500">{t('dashboard.total')}</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-2xl font-bold text-green-600">{stats.validatedEntries}</p>
          <p className="text-[11px] text-slate-500">{t('dashboard.validated')}</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-2xl font-bold text-purple-600">{stats.monthlyEntries}</p>
          <p className="text-[11px] text-slate-500">{t('dashboard.thisMonth')}</p>
        </div>
      </div>

      {/* Progression objectifs année en cours */}
      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            {t('dashboard.objectives')} {t(`des.${stats.desLevel}`) || stats.desLevel}
          </h3>
          <span className={`text-lg font-bold ${progressColor}`}>{globalPct}%</span>
        </div>

        <div className="space-y-2.5">
          {[
            { label: t('dashboard.interventionsTotal'), ...stats.yearProgress.total, color: 'bg-blue-500' },
            { label: t('dashboard.operatorSupervised'), ...stats.yearProgress.operator, color: 'bg-green-500' },
            { label: t('dashboard.assistantLabel'), ...stats.yearProgress.assistant, color: 'bg-amber-500' },
            { label: t('dashboard.observerLabel'), ...stats.yearProgress.observer, color: 'bg-purple-500' },
          ].map(item => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-slate-600">{item.label}</span>
                <span className="font-medium text-slate-800">{item.current}/{item.target}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${item.color}`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progression formation complète */}
      <div className="mb-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm ring-1 ring-blue-100">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-blue-900">{t('dashboard.fullTraining')}</h3>
          <span className="text-lg font-bold text-blue-700">{stats.totalProgress.total.pct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
            style={{ width: `${stats.totalProgress.total.pct}%` }}
          />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
          <div>
            <p className="font-bold text-green-700">{stats.totalProgress.operator.current}/{stats.totalProgress.operator.target}</p>
            <p className="text-slate-500">{t('dashboard.operatorLabel')}</p>
          </div>
          <div>
            <p className="font-bold text-amber-700">{stats.totalProgress.assistant.current}/{stats.totalProgress.assistant.target}</p>
            <p className="text-slate-500">{t('dashboard.assistantLabel')}</p>
          </div>
          <div>
            <p className="font-bold text-purple-700">{stats.totalProgress.observer.current}/{stats.totalProgress.observer.target}</p>
            <p className="text-slate-500">{t('dashboard.observerLabel')}</p>
          </div>
        </div>
      </div>

      <DashboardCharts
        monthlyData={stats.monthlyData}
        roleCounts={stats.roleCounts}
        specCounts={stats.specCounts}
        hospitalStats={stats.hospitalStats}
        topProcedures={stats.topProcedures}
      />
    </div>
  )
}
