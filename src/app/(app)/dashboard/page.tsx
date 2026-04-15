import { getDashboardStats } from '@/lib/actions/data'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { getServerT } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const [stats, t, supabase] = await Promise.all([
    getDashboardStats(),
    getServerT(),
    createClient(),
  ])

  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, title, des_level, avatar_url, role, hospital_id, hospitals(name)')
      .eq('id', user.id)
      .single()

    if (data) {
      const hospitalData = data.hospitals as unknown as { name: string } | { name: string }[] | null
      profile = {
        first_name: data.first_name,
        last_name: data.last_name,
        title: data.title,
        des_level: data.des_level,
        avatar_url: data.avatar_url,
        role: data.role,
        hospital: Array.isArray(hospitalData) ? hospitalData[0] ?? null : hospitalData,
      }
    }
  }

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
      profile={profile}
    />
  )
}
