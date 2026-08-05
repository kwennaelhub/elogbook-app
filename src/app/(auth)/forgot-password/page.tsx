'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset, type AuthState } from '@/lib/actions/auth'

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    {},
  )

  if (state.success) {
    return (
      <div className="rounded-2xl bg-card p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Email envoyé</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Si un compte existe avec cette adresse, un email contenant un lien pour
            réinitialiser votre mot de passe vient d&apos;être envoyé. Vérifiez votre
            boîte de réception (et les spams).
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form action={action} className="rounded-2xl bg-card p-8 shadow-xl">
      <h2 className="mb-2 text-xl font-semibold text-foreground">Mot de passe oublié</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Saisissez l&apos;adresse email associée à votre compte. Vous recevrez un lien
        pour définir un nouveau mot de passe.
      </p>

      {state.error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="email" className="label">
          Adresse email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input-field"
          placeholder="prenom.nom@example.com"
          autoFocus
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
      </button>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:text-primary/90">
          ← Retour à la connexion
        </Link>
      </p>
    </form>
  )
}
