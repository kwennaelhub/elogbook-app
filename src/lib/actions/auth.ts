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

  // Le matricule DES est désormais facultatif (phase bêta ouverte aux internes
  // hors registre national). S'il est fourni, on vérifie qu'il existe dans
  // des_registry et que l'email correspond. Sinon on crée un compte student
  // classique — la liaison au registre pourra être faite plus tard par un admin.
  if (parsed.data.matricule) {
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

    const desEntry = registry[0]
    if (desEntry.email && desEntry.email !== parsed.data.email) {
      return {
        error: 'auth.error.emailMismatch',
      }
    }
  }

  // Créer le compte avec les métadonnées (matricule optionnel)
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        ...(parsed.data.matricule ? { matricule: parsed.data.matricule } : {}),
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

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<AuthState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { error: 'error.unauthorized' }

  if (!newPassword || newPassword.length < 8) {
    return { error: 'auth.error.passwordTooShort' }
  }
  if (newPassword === currentPassword) {
    return { error: 'auth.error.samePassword' }
  }

  // Ré-authentifier via signInWithPassword pour confirmer que le currentPassword
  // est correct AVANT d'accepter le changement. updateUser seul ne vérifie pas
  // l'ancien mot de passe — c'est un vecteur d'attaque si la session est volée.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (signInError) {
    return { error: 'auth.error.currentPasswordInvalid' }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) {
    log.error({ err: updateError, userId: user.id }, 'Échec changement mot de passe')
    return { error: updateError.message }
  }

  log.info({ userId: user.id }, 'Mot de passe changé avec succès')
  return { success: true }
}

// deleteAccount() a été retiré au profit de POST /api/account/delete qui
// impose une ré-authentification par mot de passe, applique un sursis de
// 30 jours et déclenche la purge via le cron GitHub Action gdpr-purge.
// Voir src/app/api/account/delete/route.ts et docs/rgpd/self-service.md.
