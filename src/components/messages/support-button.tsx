'use client'

import Link from 'next/link'
import { LifeBuoy } from 'lucide-react'

/**
 * Bouton "Contacter le support" — raccourci vers la conversation avec l'admin
 * technique de l'app. Masqué si le user courant EST le support (self-message
 * bloqué côté DB de toute façon).
 *
 * L'ID du support est résolu côté serveur via getSupportAdminId() (env var
 * SUPPORT_ADMIN_USER_ID ou fallback developer/superadmin le plus ancien),
 * puis passé en prop `supportUserId`.
 */
interface Props {
  supportUserId: string | null
  currentUserId: string
  variant?: 'primary' | 'secondary' | 'inline'
}

export function SupportButton({ supportUserId, currentUserId, variant = 'primary' }: Props) {
  if (!supportUserId || supportUserId === currentUserId) return null

  const href = `/messages/${supportUserId}`
  const label = 'Contacter le support'

  if (variant === 'inline') {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/90"
      >
        <LifeBuoy className="h-3.5 w-3.5" />
        {label}
      </Link>
    )
  }

  const base =
    'flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors'
  const styles =
    variant === 'primary'
      ? 'bg-primary text-white hover:bg-primary/90'
      : 'border border-primary/30 text-primary hover:bg-primary/10'

  return (
    <Link href={href} className={`${base} ${styles}`}>
      <LifeBuoy className="h-4 w-4" />
      {label}
    </Link>
  )
}
