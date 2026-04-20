import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminPanel } from '@/components/admin/admin-panel'
import { getInstitutionalSeats } from '@/lib/actions/admin'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, hospital_id')
    .eq('id', user.id)
    .single()

  // Phase B — institution_admin a désormais accès à l'admin (scopé à son hôpital)
  if (
    !profile ||
    !['admin', 'superadmin', 'developer', 'institution_admin'].includes(profile.role)
  ) {
    redirect('/logbook')
  }

  const { createServiceClient } = await import('@/lib/supabase/server')
  const serviceClient = await createServiceClient()

  const [
    { data: registryEntries, count: registryCount },
    { data: users, count: usersCount },
    { data: supervisors, count: supervisorsCount },
    { data: hospitals },
    { data: specialties },
    { data: procedures },
    { data: desObjectives },
    institutionalSeats,
    { data: adhesionRequests, count: adhesionCount },
  ] = await Promise.all([
    supabase.from('des_registry').select('*', { count: 'exact' }).order('last_name').limit(500),
    supabase.from('profiles').select('*, hospital:hospitals!profiles_hospital_id_fkey(name)', { count: 'exact' }).order('last_name').limit(500),
    supabase.from('profiles').select('*, hospital:hospitals!profiles_hospital_id_fkey(name)', { count: 'exact' }).eq('role', 'supervisor').order('last_name').limit(500),
    supabase.from('hospitals').select('*').order('name'),
    supabase.from('specialties').select('*').eq('is_active', true).eq('level', 0).order('name'),
    supabase.from('procedures').select('*, specialty:specialties(name)').eq('is_active', true).order('sort_order'),
    supabase.from('des_objectives').select('*').order('des_level, category'),
    getInstitutionalSeats(),
    serviceClient.from('adhesion_requests').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <h2 className="mb-4 text-lg font-semibold text-foreground">Administration</h2>
      <AdminPanel
        registryEntries={registryEntries ?? []}
        registryCount={registryCount ?? 0}
        users={users ?? []}
        usersCount={usersCount ?? 0}
        supervisors={supervisors ?? []}
        supervisorsCount={supervisorsCount ?? 0}
        hospitals={hospitals ?? []}
        specialties={specialties ?? []}
        procedures={procedures ?? []}
        desObjectives={desObjectives ?? []}
        institutionalSeats={institutionalSeats}
        adhesionRequests={adhesionRequests ?? []}
        adhesionCount={adhesionCount ?? 0}
        currentUserRole={profile.role}
        currentUserHospitalId={profile.hospital_id}
      />
    </div>
  )
}
