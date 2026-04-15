'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getNotes(category?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) return []
  return data ?? []
}

export type NoteState = {
  error?: string
  success?: boolean
}

export async function createNote(title: string, content: string, category: string | null): Promise<NoteState> {
  if (!title.trim()) return { error: 'Le titre est obligatoire' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  const { error } = await supabase.from('notes').insert({
    user_id: user.id,
    title: title.trim(),
    content,
    category: category || null,
    is_pinned: false,
  })

  if (error) return { error: error.message }

  revalidatePath('/notes')
  return { success: true }
}

export async function updateNote(noteId: string, title: string, content: string, category: string | null): Promise<NoteState> {
  if (!title.trim()) return { error: 'Le titre est obligatoire' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  const { error } = await supabase
    .from('notes')
    .update({
      title: title.trim(),
      content,
      category: category || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/notes')
  return { success: true }
}

export async function deleteNote(noteId: string): Promise<NoteState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/notes')
  return { success: true }
}

export async function togglePinNote(noteId: string, isPinned: boolean): Promise<NoteState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  const { error } = await supabase
    .from('notes')
    .update({ is_pinned: !isPinned, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/notes')
  return { success: true }
}
