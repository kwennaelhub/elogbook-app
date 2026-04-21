'use client'

import Link from 'next/link'
import {
  Stethoscope,
  ClipboardCheck,
  GraduationCap,
  Building2,
  UserPlus,
  Layers,
  Activity,
  ArrowRight,
  Hospital,
  Users,
  BookOpen,
  HeartPulse,
  TrendingUp,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import type {
  SupervisorDashboard,
  ServiceChiefDashboard,
  InstitutionAdminDashboard,
} from '@/lib/actions/role-dashboard'

// ═══════════════════════════════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string
  value: string | number
  icon: typeof Stethoscope
  color: string
  href?: string
}) {
  const { t } = useI18n()
  const body = (
    <div className="card-base group relative overflow-hidden p-4 transition-all hover:shadow-md">
      <div className={`absolute -right-2 -top-2 h-14 w-14 rounded-full ${color} opacity-50 transition-transform group-hover:scale-110`} />
      <div className="relative z-10">
        <div className={`mb-2 inline-flex rounded-xl ${color} p-2`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {href && (
          <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary group-hover:gap-2 transition-all">
            {t('dashboard.roleView')} <ArrowRight className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  )
  if (href) return <Link href={href}>{body}</Link>
  return body
}

function Header({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string
  subtitle?: string
  icon: typeof Stethoscope
}) {
  return (
    <div className="mb-5 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/20 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SUPERVISOR
// ═══════════════════════════════════════════════════════════════════

function SectionTitle({ label }: { label: string }) {
  return (
    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </h3>
  )
}

export function SupervisorDashboardView({ data }: { data: SupervisorDashboard }) {
  const { t } = useI18n()
  return (
    <div className="space-y-5">
      <Header
        icon={Stethoscope}
        title={t('dashboard.supervisor.title')}
        subtitle={data.hospitalName ? `${t('dashboard.at')} ${data.hospitalName}` : undefined}
      />

      {/* Section 1 — Supervision des DES */}
      <div>
        <SectionTitle label={t('dashboard.supervisor.sectionSupervision')} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={ClipboardCheck}
            color="bg-amber-400/10 text-amber-400"
            label={t('dashboard.supervisor.pendingValidations')}
            value={data.pendingValidations}
            href="/supervision"
          />
          <StatCard
            icon={Activity}
            color="bg-emerald-400/10 text-emerald-400"
            label={t('dashboard.supervisor.desValidatedMonth')}
            value={data.desValidatedThisMonth}
          />
          <StatCard
            icon={GraduationCap}
            color="bg-sky-400/10 text-sky-400"
            label={t('dashboard.supervisor.desSupervised')}
            value={data.supervisedDesCount}
          />
          <StatCard
            icon={Hospital}
            color="bg-violet-400/10 text-violet-400"
            label={t('dashboard.supervisor.hospitalDesMonth')}
            value={data.hospitalDesEntriesThisMonth}
          />
        </div>
      </div>

      {/* Section 2 — Mon activité personnelle */}
      <div>
        <SectionTitle label={t('dashboard.supervisor.sectionMyActivity')} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            icon={BookOpen}
            color="bg-teal-400/10 text-teal-400"
            label={t('dashboard.supervisor.myEntriesMonth')}
            value={data.myEntriesThisMonth}
            href="/logbook"
          />
          <StatCard
            icon={TrendingUp}
            color="bg-indigo-400/10 text-indigo-400"
            label={t('dashboard.supervisor.myEntriesTotal')}
            value={data.myEntriesTotal}
          />
          <StatCard
            icon={HeartPulse}
            color="bg-rose-400/10 text-rose-400"
            label={t('dashboard.supervisor.myFollowups')}
            value={data.myActiveFollowups}
            href="/followups"
          />
        </div>
      </div>

      {/* Liste des DES les plus actifs */}
      <div className="card-base p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {t('dashboard.supervisor.mostActiveDes')}
        </h3>
        {data.recentDes.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('dashboard.supervisor.noDesYet')}</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {data.recentDes.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium text-foreground">{d.name}</span>
                  {d.desLevel && (
                    <span className="ml-2 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                      {d.desLevel}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {d.entryCount} {t('dashboard.supervisor.interventions')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SERVICE CHIEF
// ═══════════════════════════════════════════════════════════════════

export function ServiceChiefDashboardView({ data }: { data: ServiceChiefDashboard }) {
  const { t } = useI18n()
  return (
    <div className="space-y-5">
      <Header
        icon={Layers}
        title={t('dashboard.serviceChief.title')}
        subtitle={
          data.serviceName
            ? `${data.serviceName}${data.hospitalName ? ` · ${data.hospitalName}` : ''}`
            : undefined
        }
      />

      {/* Section 1 — Mon service */}
      <div>
        <SectionTitle label={t('dashboard.serviceChief.sectionService')} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={GraduationCap}
            color="bg-sky-400/10 text-sky-400"
            label={t('dashboard.serviceChief.desInService')}
            value={data.serviceDesCount}
          />
          <StatCard
            icon={Stethoscope}
            color="bg-emerald-400/10 text-emerald-400"
            label={t('dashboard.serviceChief.supervisors')}
            value={data.serviceSupervisorsCount}
          />
          <StatCard
            icon={ClipboardCheck}
            color="bg-amber-400/10 text-amber-400"
            label={t('dashboard.serviceChief.pending')}
            value={data.servicePendingValidations}
            href="/supervision"
          />
          <StatCard
            icon={Activity}
            color="bg-violet-400/10 text-violet-400"
            label={t('dashboard.serviceChief.desEntriesMonth')}
            value={data.serviceDesEntriesThisMonth}
          />
        </div>
      </div>

      {/* Section 2 — Mon activité personnelle */}
      <div>
        <SectionTitle label={t('dashboard.serviceChief.sectionMyActivity')} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            icon={BookOpen}
            color="bg-teal-400/10 text-teal-400"
            label={t('dashboard.supervisor.myEntriesMonth')}
            value={data.myEntriesThisMonth}
            href="/logbook"
          />
          <StatCard
            icon={TrendingUp}
            color="bg-indigo-400/10 text-indigo-400"
            label={t('dashboard.supervisor.myEntriesTotal')}
            value={data.myEntriesTotal}
          />
          <StatCard
            icon={HeartPulse}
            color="bg-rose-400/10 text-rose-400"
            label={t('dashboard.supervisor.myFollowups')}
            value={data.myActiveFollowups}
            href="/followups"
          />
        </div>
      </div>

      <div className="card-base p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {t('dashboard.serviceChief.desByLevel')}
        </h3>
        {data.desByLevel.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('dashboard.serviceChief.noDesYet')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {data.desByLevel.map((row) => (
              <div key={row.level} className="rounded-lg bg-card/50 p-3 ring-1 ring-border/40">
                <p className="text-xl font-bold text-foreground">{row.count}</p>
                <p className="text-xs text-muted-foreground">{row.level}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// INSTITUTION ADMIN
// ═══════════════════════════════════════════════════════════════════

export function InstitutionAdminDashboardView({ data }: { data: InstitutionAdminDashboard }) {
  const { t } = useI18n()
  return (
    <div className="space-y-5">
      <Header
        icon={Building2}
        title={t('dashboard.institutionAdmin.title')}
        subtitle={data.hospitalName || undefined}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={GraduationCap}
          color="bg-sky-400/10 text-sky-400"
          label={t('dashboard.institutionAdmin.des')}
          value={data.totalDes}
        />
        <StatCard
          icon={Stethoscope}
          color="bg-emerald-400/10 text-emerald-400"
          label={t('dashboard.institutionAdmin.supervisors')}
          value={data.totalSupervisors}
        />
        <StatCard
          icon={Layers}
          color="bg-violet-400/10 text-violet-400"
          label={t('dashboard.institutionAdmin.services')}
          value={data.totalServices}
          href="/admin"
        />
        <StatCard
          icon={Activity}
          color="bg-amber-400/10 text-amber-400"
          label={t('dashboard.institutionAdmin.entriesMonth')}
          value={data.entriesThisMonth}
        />
        <StatCard
          icon={ClipboardCheck}
          color="bg-rose-400/10 text-rose-400"
          label={t('dashboard.institutionAdmin.pending')}
          value={data.pendingValidations}
        />
        <StatCard
          icon={UserPlus}
          color="bg-orange-400/10 text-orange-400"
          label={t('dashboard.institutionAdmin.adhesions')}
          value={data.adhesionsPending}
          href="/admin"
        />
        {data.seats && (
          <StatCard
            icon={Users}
            color="bg-teal-400/10 text-teal-400"
            label={t('dashboard.institutionAdmin.seats')}
            value={`${data.seats.used}/${data.seats.max}`}
            href="/admin"
          />
        )}
      </div>

      <div className="card-base p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {t('dashboard.institutionAdmin.byService')}
        </h3>
        {data.services.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t('dashboard.institutionAdmin.noService')}
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {data.services.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-foreground">{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  {s.desCount} {t('dashboard.supervisor.interventions')} ·{' '}
                  {s.supervisorCount} {t('dashboard.institutionAdmin.supervisors').toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
