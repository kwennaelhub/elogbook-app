'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from './helpers'
import { adminLogger as log } from '@/lib/logger'

// ========== GESTION DES RÔLES ==========

export async function updateUserRole(userId: string, newRole: string) {
  const { supabase, role: callerRole } = await requireAdmin()

  const validRoles = ['student', 'supervisor', 'admin', 'superadmin', 'developer']
  if (!validRoles.includes(newRole)) {
    return { error: 'admin.error.invalidRole' }
  }

  if (['developer', 'superadmin'].includes(newRole) && callerRole !== 'developer') {
    return { error: 'admin.error.developerOnly' }
  }

  const { data: target } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (target?.role === 'developer') {
    return { error: 'admin.error.devRoleIrrevocable' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) return { error: error.message }
  return { success: true }
}

// ========== PROFIL UTILISATEUR ==========

export async function updateProfile(data: {
  first_name?: string
  last_name?: string
  phone?: string
  hospital_id?: string
  des_level?: string
  date_of_birth?: string
  avatar_url?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  const updates: Record<string, unknown> = {}
  if (data.first_name !== undefined) updates.first_name = data.first_name
  if (data.last_name !== undefined) updates.last_name = data.last_name
  if (data.phone !== undefined) updates.phone = data.phone || null
  if (data.hospital_id !== undefined) updates.hospital_id = data.hospital_id || null
  if (data.des_level !== undefined) updates.des_level = data.des_level || null
  if (data.date_of_birth !== undefined) updates.date_of_birth = data.date_of_birth || null
  if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url || null

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

// ========== EMAIL DE BIENVENUE ==========

export async function sendWelcomeEmail(email: string, firstName: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const internalKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-16) || ''
    const response = await fetch(`${baseUrl}/api/send-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, firstName, internalKey }),
    })
    if (!response.ok) {
      log.warn({ email }, 'Email de bienvenue non envoyé (réponse non-ok)')
    }
  } catch {
    log.warn({ email }, 'Email de bienvenue non disponible')
  }
}
