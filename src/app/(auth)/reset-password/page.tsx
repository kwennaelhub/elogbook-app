'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { resetPassword, type AuthState } from '@/lib/actions/auth'

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

export default function ResetPasswordPage() {
  const [state, action, isPending] = useActionState<AuthState, FormData>(
    resetPassword,
    {},
  )
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const passwordsMatch = password.length > 0 && password === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  if (state.success) {
    return (
      <div className="rounded-2xl bg-card p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Mot de passe mis à jour</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Votre nouveau mot de passe est actif. Vous pouvez maintenant vous connecter.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form action={action} className="rounded-2xl bg-card p-8 shadow-xl">
      <h2 className="mb-2 text-xl font-semibold text-foreground">Nouveau mot de passe</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Choisissez un mot de passe robuste. Vous pourrez ensuite vous connecter avec.
      </p>

      {state.error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {state.error === 'auth.error.resetSessionMissing'
            ? "Le lien de réinitialisation a expiré ou est invalide. Redemandez-en un depuis « Mot de passe oublié »."
            : state.error === 'auth.error.resetFailed'
            ? 'La mise à jour du mot de passe a échoué. Réessayez ou contactez le support.'
            : state.error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="password" className="label">
          Nouveau mot de passe <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field pr-10"
            placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            tabIndex={-1}
            aria-label={showPassword ? 'Masquer' : 'Afficher'}
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
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`input-field pr-10 ${
              passwordsMismatch
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : passwordsMatch
                ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                : ''
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            tabIndex={-1}
            aria-label={showConfirm ? 'Masquer' : 'Afficher'}
          >
            <EyeIcon open={showConfirm} />
          </button>
        </div>
        {passwordsMismatch && (
          <p className="mt-1 text-xs text-red-600">Les mots de passe ne correspondent pas</p>
        )}
        {passwordsMatch && (
          <p className="mt-1 text-xs text-green-600">Les mots de passe correspondent</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || !passwordsMatch}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Mise à jour…' : 'Enregistrer le nouveau mot de passe'}
      </button>
    </form>
  )
}
