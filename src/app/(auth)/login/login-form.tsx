'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login, type AuthState } from '@/lib/actions/auth'

export function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || ''
  const [state, action, isPending] = useActionState<AuthState, FormData>(login, {})

  return (
    <form action={action} className="rounded-2xl bg-white p-8 shadow-xl">
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Connexion</h2>

      {state.error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <input type="hidden" name="redirect" value={redirectTo} />

      <div className="mb-4">
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Adresse email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          placeholder="prenom.nom@example.com"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? 'Connexion...' : 'Se connecter'}
      </button>

      <p className="mt-4 text-center text-sm text-slate-500">
        Pas encore de compte ?{' '}
        <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700">
          S&apos;inscrire
        </Link>
      </p>
    </form>
  )
}
