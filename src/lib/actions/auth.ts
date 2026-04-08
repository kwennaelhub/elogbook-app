'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, registerSchema } from '@/lib/validations'

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
    return { error: 'Email ou mot de passe incorrect' }
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
      error: 'Matricule non trouvé dans le registre DES. Contactez votre coordinateur de programme.',
    }
  }

  // Vérifier la cohérence email si le registre en a un
  const desEntry = registry[0]
  if (desEntry.email && desEntry.email !== parsed.data.email) {
    return {
      error: 'L\'email ne correspond pas à celui enregistré pour ce matricule.',
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
      return { error: 'Un compte existe déjà avec cet email' }
    }
    console.error('Supabase signUp error:', error.message)
    return { error: 'Erreur lors de la création du compte : ' + error.message }
  }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function deleteAccount(): Promise<AuthState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

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
