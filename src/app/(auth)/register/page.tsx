'use client'

import { useActionState, useState, useCallback } from 'react'
import Link from 'next/link'
import { register, type AuthState } from '@/lib/actions/auth'
import { useI18n } from '@/lib/i18n/context'

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    )
  }
  return (
    <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

export default function RegisterPage() {
  const { t } = useI18n()
  const [state, action, isPending] = useActionState<AuthState, FormData>(register, {})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [matricule, setMatricule] = useState('')
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle')

  const lookupMatricule = useCallback(async (firstName: string, lastName: string) => {
    if (!firstName.trim() || !lastName.trim()) return
    setLookupStatus('loading')
    try {
      const res = await fetch('/api/lookup-matricule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      })
      const { matricule: found } = await res.json()
      if (found) {
        setMatricule(found)
        setLookupStatus('found')
      } else {
        setLookupStatus('not_found')
      }
    } catch {
      setLookupStatus('idle')
    }
  }, [])

  const handleNameBlur = useCallback(() => {
    const firstName = (document.getElementById('first_name') as HTMLInputElement)?.value
    const lastName = (document.getElementById('last_name') as HTMLInputElement)?.value
    if (firstName && lastName) {
      lookupMatricule(firstName, lastName)
    }
  }, [lookupMatricule])

  if (state.success) {
    return (
      <div className="rounded-2xl bg-card p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Compte créé !</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form action={action} className="rounded-2xl bg-card p-8 shadow-xl">
      <h2 className="mb-2 text-xl font-semibold text-foreground">Inscription</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Réservé aux étudiants DES inscrits au registre national.
      </p>

      {state.error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {t(state.error)}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="last_name" className="label">
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            required
            onBlur={handleNameBlur}
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="first_name" className="label">
            Prénom <span className="text-red-500">*</span>
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            required
            onBlur={handleNameBlur}
            className="input-field"
          />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="matricule" className="label">
          Matricule DES <span className="text-red-500">*</span>
        </label>
        <input
          id="matricule"
          name="matricule"
          type="text"
          required
          readOnly={lookupStatus === 'found'}
          value={matricule}
          onChange={(e) => { setMatricule(e.target.value); setLookupStatus('idle') }}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none ${
            lookupStatus === 'found' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-input'
          }`}
          placeholder={t('auth.placeholder.matricule')}
        />
        {lookupStatus === 'loading' && (
          <p className="mt-1 text-xs text-muted-foreground">Recherche en cours...</p>
        )}
        {lookupStatus === 'found' && (
          <p className="mt-1 text-xs text-green-600">Matricule trouvé dans le registre DES</p>
        )}
        {lookupStatus === 'not_found' && (
          <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">Nom non trouvé dans le registre DES.</p>
            <Link
              href={`/adhesion?nom=${encodeURIComponent((document.getElementById('last_name') as HTMLInputElement)?.value || '')}&prenom=${encodeURIComponent((document.getElementById('first_name') as HTMLInputElement)?.value || '')}`}
              className="inline-block rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
            >
              Demander mon adhésion
            </Link>
          </div>
        )}
        {lookupStatus === 'idle' && !matricule && (
          <p className="mt-1 text-xs text-muted-foreground">Remplissez nom et prénom pour une recherche automatique</p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="email" className="label">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input-field"
          placeholder="prenom.nom@example.com"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="password" className="label">
          Mot de passe <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            minLength={8}
            className="input-field pr-10"
            placeholder={t('auth.placeholder.password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            tabIndex={-1}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="confirm_password" className="label">
          Confirmer le mot de passe <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="confirm_password"
            name="confirm_password"
            type={showConfirm ? 'text' : 'password'}
            required
            autoComplete="new-password"
            className="input-field pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            tabIndex={-1}
          >
            <EyeIcon open={showConfirm} />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            name="accept_cgu"
            required
            className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground">
            J&apos;accepte les{' '}
            <a href="/legal/cgu" target="_blank" className="text-primary underline">CGU</a>,
            la{' '}
            <a href="/legal/confidentialite" target="_blank" className="text-primary underline">politique de confidentialité</a>
            {' '}et je consens au traitement de mes données personnelles. <span className="text-red-500">*</span>
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Vérification...' : 'Créer mon compte'}
      </button>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-primary hover:text-primary/90">
          Se connecter
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Pas de matricule ?{' '}
        <Link href="/adhesion" className="font-medium text-primary hover:text-primary/90">
          Demander une adhésion
        </Link>
      </p>
    </form>
  )
}
