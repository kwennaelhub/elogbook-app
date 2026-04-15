'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, registerSchema } from '@/lib/validations'
import { authLogger as log } from '@/lib/logger'

export type AuthState = {
  error?: string
  success?: boolean
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(formData)
  const parsed = loginSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: 'auth.error.credentials' }
  }

  const redirectTo = formData.get('redirect') as string
  redirect(redirectTo || '/logbook')
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(formData)
  const parsed = registerSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { createServiceClient } = await import('@/lib/supabase/server')
  const serviceClient = await createServiceClient()

  // Vérifier le matricule dans le registre DES (via service role pour bypass RLS)
  const { data: registry, error: regError } = await serviceClient
    .from('des_registry')
    .select('*')
    .eq('matricule', parsed.data.matricule)
    .eq('is_active', true)
    .limit(1)

  if (regError || !registry || registry.length === 0) {
    return {
      error: 'auth.error.matriculeNotFound',
    }
  }

  // Vérifier la cohérence email si le registre en a un
  const desEntry = registry[0]
  if (desEntry.email && desEntry.email !== parsed.data.email) {
    return {
      error: 'auth.error.emailMismatch',
    }
  }

  // Créer le compte avec les métadonnées
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        matricule: parsed.data.matricule,
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'auth.error.emailExists' }
    }
    log.error({ err: error, email: parsed.data.email }, 'Échec inscription Supabase')
    return { error: 'auth.error.creationFailed' }
  }

  // Envoyer l'email de bienvenue (non-bloquant)
  try {
    const { sendWelcomeEmail } = await import('@/lib/actions/admin')
    await sendWelcomeEmail(parsed.data.email, parsed.data.first_name)
  } catch {
    // Ne pas bloquer l'inscription si l'email échoue
    log.warn({ email: parsed.data.email }, 'Email de bienvenue échoué silencieusement')
  }

  return { success: true }
}

export async function logout() {
  const { removeSession } = await import('@/lib/actions/sessions')
  await removeSession()
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function deleteAccount(): Promise<AuthState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'error.unauthorized' }

  // Supprimer le profil (cascade supprimera les entrées liées via RLS)
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_active: false, email: `deleted_${user.id}@deleted.local` })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  // Déconnecter
  await supabase.auth.signOut()
  redirect('/login')
}
