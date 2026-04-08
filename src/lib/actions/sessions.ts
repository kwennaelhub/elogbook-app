'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const SESSION_TOKEN_COOKIE = 'internlog_session_token'

function generateToken(): string {
  return crypto.randomUUID()
}

export async function registerSession(deviceInfo?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const cookieStore = await cookies()
  let token = cookieStore.get(SESSION_TOKEN_COOKIE)?.value

  if (!token) {
    token = generateToken()
    cookieStore.set(SESSION_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      path: '/',
    })
  }

  // Upsert la session (si le token existe déjà, update last_active)
  await supabase
    .from('active_sessions')
    .upsert({
      user_id: user.id,
      session_token: token,
      device_info: deviceInfo || null,
      last_active: new Date().toISOString(),
    }, { onConflict: 'session_token' })
}

export async function getActiveSessions(): Promise<{ count: number; currentToken: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { count: 0, currentToken: null }

  const cookieStore = await cookies()
  const currentToken = cookieStore.get(SESSION_TOKEN_COOKIE)?.value || null

  // Compter les sessions actives (dernière activité < 24h)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('active_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('last_active', cutoff)

  return { count: count ?? 0, currentToken }
}

export async function logoutOtherSessions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const cookieStore = await cookies()
  const currentToken = cookieStore.get(SESSION_TOKEN_COOKIE)?.value

  if (!currentToken) return { error: 'Session introuvable' }

  // Supprimer toutes les sessions sauf la courante
  const { error } = await supabase
    .from('active_sessions')
    .delete()
    .eq('user_id', user.id)
    .neq('session_token', currentToken)

  if (error) return { error: error.message }
  return { success: true }
}

export async function removeSession() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_TOKEN_COOKIE)?.value

  if (token) {
    await supabase
      .from('active_sessions')
      .delete()
      .eq('session_token', token)

    cookieStore.delete(SESSION_TOKEN_COOKIE)
  }
}
