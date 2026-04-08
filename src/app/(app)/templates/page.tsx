import { createClient } from '@/lib/supabase/server'
import { TemplatesTabs } from '@/components/templates/templates-tabs'

export default async function TemplatesPage() {
  const supabase = await createClient()

  // Vérifier le rôle de l'utilisateur pour les options admin
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

  const [
    { data: croTemplates },
    { data: prescriptionTemplates },
    { data: preopTemplates },
    { data: instruments },
    { data: techniques },
    { data: specialties },
  ] = await Promise.all([
    supabase.from('cro_templates').select('*').eq('is_active', true).order('title'),
    supabase.from('prescription_templates').select('*').eq('is_active', true).order('title'),
    supabase.from('preop_templates').select('*').eq('is_active', true).order('title'),
    supabase.from('instruments').select('*').eq('is_active', true).order('category, sort_order'),
    supabase.from('surgical_techniques').select('*, specialty:specialties(name), procedure:procedures(name)').eq('is_active', true).order('title'),
    supabase.from('specialties').select('id, name').eq('is_active', true).eq('level', 0).order('name'),
  ])

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Référentiel médical</h2>
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
