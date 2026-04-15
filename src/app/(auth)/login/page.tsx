import { Suspense } from 'react'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl bg-card p-8 shadow-xl animate-pulse h-80" />}>
      <LoginForm />
    </Suspense>
  )
}
