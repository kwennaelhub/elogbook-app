'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { register, type AuthState } from '@/lib/actions/auth'

export default function RegisterPage() {
  const [state, action, isPending] = useActionState<AuthState, FormData>(register, {})

  if (state.success) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-slate-900">Compte créé !</h2>
          <p className="mb-6 text-sm text-slate-600">
            Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form action={action} className="rounded-2xl bg-white p-8 shadow-xl">
      <h2 className="mb-2 text-xl font-semibold text-slate-900">Inscription</h2>
      <p className="mb-6 text-sm text-slate-500">
        Réservé aux étudiants DES inscrits au registre national.
      </p>

      {state.error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="matricule" className="mb-1 block text-sm font-medium text-slate-700">
          Matricule DES <span className="text-red-500">*</span>
        </label>
        <input
          id="matricule"
          name="matricule"
          type="text"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          placeholder="Votre matricule DES"
        />
        <p className="mt-1 text-xs text-slate-400">
          Fourni par votre coordinateur de programme
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="last_name" className="mb-1 block text-sm font-medium text-slate-700">
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="first_name" className="mb-1 block text-sm font-medium text-slate-700">
            Prénom <span className="text-red-500">*</span>
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          placeholder="prenom.nom@example.com"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Mot de passe <span className="text-red-500">*</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="confirm_password" className="mb-1 block text-sm font-medium text-slate-700">
          Confirmer le mot de passe <span className="text-red-500">*</span>
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
      >
        {isPending ? 'Vérification...' : 'Créer mon compte'}
      </button>

      <p className="mt-4 text-center text-sm text-slate-500">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
          Se connecter
        </Link>
      </p>
    </form>
  )
}
