import { getDashboardStats } from '@/lib/actions/data'
import { getAnalyticsStats, getInstitutionStats, getPeerComparison } from '@/lib/actions/analytics'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { getServerT } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const [stats, analyticsStats, peerComparison, t, supabase] = await Promise.all([
    getDashboardStats(),
    getAnalyticsStats(),
    getPeerComparison(),
    getServerT(),
    createClient(),
  ])

  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, title, des_level, avatar_url, role, hospital_id, hospitals(name, logo_url)')
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

  // Charger les stats établissement seulement pour les admins (évite une requête inutile pour les users)
  const isAdmin = profile?.role && ['admin', 'superadmin', 'developer'].includes(profile.role)
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
