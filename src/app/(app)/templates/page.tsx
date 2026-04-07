import { createClient } from '@/lib/supabase/server'
import { TemplatesTabs } from '@/components/templates/templates-tabs'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const [
    { data: croTemplates },
    { data: prescriptionTemplates },
    { data: preopTemplates },
    { data: instruments },
  ] = await Promise.all([
    supabase.from('cro_templates').select('*').eq('is_active', true).order('title'),
    supabase.from('prescription_templates').select('*').eq('is_active', true).order('title'),
    supabase.from('preop_templates').select('*').eq('is_active', true).order('title'),
    supabase.from('instruments').select('*').eq('is_active', true).order('category, sort_order'),
  ])

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <TemplatesTabs
        croTemplates={croTemplates ?? []}
        prescriptionTemplates={prescriptionTemplates ?? []}
        preopTemplates={preopTemplates ?? []}
        instruments={instruments ?? []}
      />
    </div>
  )
}
