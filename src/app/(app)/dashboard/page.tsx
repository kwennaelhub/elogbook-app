import { getDashboardStats } from '@/lib/actions/data'
import { getAnalyticsStats, getInstitutionStats, getPeerComparison } from '@/lib/actions/analytics'
import {
  getSupervisorDashboard,
  getServiceChiefDashboard,
  getInstitutionAdminDashboard,
} from '@/lib/actions/role-dashboard'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import {
  SupervisorDashboardView,
  ServiceChiefDashboardView,
  InstitutionAdminDashboardView,
} from '@/components/dashboard/role-dashboards'
import { getServerT } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const t = await getServerT()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Profil + rôle pour router vers le bon dashboard.
  let profile: {
    first_name: string | null
    last_name: string | null
    title: string | null
    des_level: string | null
    avatar_url: string | null
    role: string
    hospital: { name: string; logo_url: string | null } | null
  } | null = null

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, title, des_level, avatar_url, role, hospital_id, hospitals:hospitals!profiles_hospital_id_fkey(name, logo_url)')
      .eq('id', user.id)
      .single()

    if (data) {
      const hospitalData = data.hospitals as unknown as { name: string; logo_url: string | null } | { name: string; logo_url: string | null }[] | null
      const hospital = Array.isArray(hospitalData) ? hospitalData[0] ?? null : hospitalData
      profile = {
        first_name: data.first_name,
        last_name: data.last_name,
        title: data.title,
        des_level: data.des_level,
        avatar_url: data.avatar_url,
        role: data.role,
        hospital: hospital ? { name: hospital.name, logo_url: hospital.logo_url } : null,
      }
    }
  }

  const role = profile?.role

  // ────── ROUTAGE PAR RÔLE ──────

  if (role === 'supervisor') {
    const data = await getSupervisorDashboard()
    if (!data) return <div className="p-8 text-sm text-muted-foreground">{t('common.error')}</div>
    return (
      <div className="mx-auto max-w-3xl px-4 py-4">
        <SupervisorDashboardView data={data} />
      </div>
    )
  }

  if (role === 'service_chief') {
    const data = await getServiceChiefDashboard()
    if (!data) return <div className="p-8 text-sm text-muted-foreground">{t('common.error')}</div>
    return (
      <div className="mx-auto max-w-3xl px-4 py-4">
        <ServiceChiefDashboardView data={data} />
      </div>
    )
  }

  if (role === 'institution_admin') {
    const data = await getInstitutionAdminDashboard()
    if (!data) return <div className="p-8 text-sm text-muted-foreground">{t('common.error')}</div>
    return (
      <div className="mx-auto max-w-3xl px-4 py-4">
        <InstitutionAdminDashboardView data={data} />
      </div>
    )
  }

  // ────── DES / admin legacy : dashboard personnel existant ──────

  const [stats, analyticsStats, peerComparison] = await Promise.all([
    getDashboardStats(),
    getAnalyticsStats(),
    getPeerComparison(),
  ])

  const isAdmin = role && ['admin', 'superadmin', 'developer'].includes(role)
  const institutionStats = isAdmin ? await getInstitutionStats() : null

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">{t('common.error')}</p>
      </div>
    )
  }

  return (
    <DashboardContent
      stats={stats}
      analyticsStats={analyticsStats}
      institutionStats={institutionStats}
      peerComparison={peerComparison}
      profile={profile}
    />
  )
}
