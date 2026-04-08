'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { gardeSchema } from '@/lib/validations'

export type GardeState = {
  error?: string
  success?: boolean
}

export async function createGarde(_prev: GardeState, formData: FormData): Promise<GardeState> {
  const raw = Object.fromEntries(formData)
  const parsed = gardeSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('gardes').insert({
    user_id: user.id,
    date: parsed.data.date,
    type: parsed.data.type,
    source: 'user',
    service: parsed.data.service || null,
    senior_name: parsed.data.senior_name || null,
    senior_id: parsed.data.senior_id || null,
    hospital_id: parsed.data.hospital_id || null,
    notes: parsed.data.notes || null,
    created_by: user.id,
  })

  if (error) {
    return { error: 'Erreur lors de l\'enregistrement : ' + error.message }
  }

  revalidatePath('/calendar')
  return { success: true }
}

export async function getGardes(month: number, year: number) {
  const supabase = await createClient()

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('gardes')
    .select(`
      *,
      hospital:hospitals(id, name),
      senior:profiles!gardes_senior_id_fkey(id, first_name, last_name, title),
      user:profiles!gardes_user_id_fkey(id, first_name, last_name, phone, title, des_level)
    `)
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: true })

  if (error) return []
  return data ?? []
}

export async function deleteGarde(gardeId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('gardes')
    .delete()
    .eq('id', gardeId)

  if (error) return { error: error.message }

  revalidatePath('/calendar')
  return { success: true }
}
