'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitFeedback(data: {
  rating: number
  category: string
  message: string
  ease_of_use: number | null
  would_recommend: string | null
  user_name: string
  user_role: string
}) {
  const supabase = await createClient()

  // Optionnel : récupérer l'utilisateur si connecté
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('feedback').insert({
    user_id: user?.id || null,
    user_name: data.user_name || 'Anonyme',
    user_role: data.user_role,
    rating: data.rating,
    category: data.category,
    message: data.message,
    ease_of_use: data.ease_of_use,
    would_recommend: data.would_recommend,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function getFeedbacks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Vérifier rôle admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'superadmin', 'developer'].includes(profile.role)) {
    return []
  }

  const { data } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  return data ?? []
}
