import { createClient } from '@/lib/supabase/server'
import { TemplatesTabs } from '@/components/templates/templates-tabs'
import { getServerT } from '@/lib/i18n/server'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'developer'

  // Queries — admins voient tout, non-admins uniquement status=approved
  let qCro = supabase.from('cro_templates').select('*').eq('is_active', true)
  let qPresc = supabase.from('prescription_templates').select('*').eq('is_active', true)
  let qPreop = supabase.from('preop_templates').select('*').eq('is_active', true)
  let qInst = supabase.from('instruments').select('*').eq('is_active', true)
  let qTech = supabase.from('surgical_techniques').select('*, specialty:specialties(name), procedure:procedures(name)').eq('is_active', true)

  if (!isAdmin) {
    qCro = qCro.eq('status', 'approved')
    qPresc = qPresc.eq('status', 'approved')
    qPreop = qPreop.eq('status', 'approved')
    qInst = qInst.eq('status', 'approved')
    qTech = qTech.eq('status', 'approved')
  }

  const [
    { data: croTemplates },
    { data: prescriptionTemplates },
    { data: preopTemplates },
    { data: instruments },
    { data: techniques },
    { data: specialties },
  ] = await Promise.all([
    qCro.order('title'),
    qPresc.order('title'),
    qPreop.order('title'),
    qInst.order('sort_order'),
    qTech.order('title'),
    supabase.from('specialties').select('id, name').eq('is_active', true).eq('level', 0).order('name'),
  ])

  const t = await getServerT()

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h2 className="mb-4 text-lg font-semibold text-foreground">{t('templates.pageTitle')}</h2>
      <TemplatesTabs
        croTemplates={croTemplates ?? []}
        prescriptionTemplates={prescriptionTemplates ?? []}
        preopTemplates={preopTemplates ?? []}
        instruments={instruments ?? []}
        techniques={techniques ?? []}
        specialties={specialties ?? []}
        isAdmin={isAdmin}
      />
    </div>
  )
}
