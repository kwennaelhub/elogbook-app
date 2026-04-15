'use client'

import { useState } from 'react'
import Image from 'next/image'
import { User, LogOut, Shield, Settings, Crown, ClipboardCheck, StickyNote, AlertTriangle, Loader2, HeartPulse, ChevronDown } from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import { logoutOtherSessions } from '@/lib/actions/sessions'
import { useI18n } from '@/lib/i18n/context'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { ProfileWithSubscription } from '@/types/database'

export function AppHeader({ profile, otherSessionsCount = 0 }: { profile: ProfileWithSubscription | null; otherSessionsCount?: number }) {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSessionAlert, setShowSessionAlert] = useState(otherSessionsCount > 0)
  const [disconnecting, setDisconnecting] = useState(false)

  return (
    <>
    {showSessionAlert && (
      <div className="sticky top-0 z-50 flex items-center justify-between gap-2 bg-amber-500 px-4 py-2 text-xs font-medium text-white">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t('header.sessions.alert', { count: otherSessionsCount })}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setDisconnecting(true)
              await logoutOtherSessions()
              setShowSessionAlert(false)
              setDisconnecting(false)
            }}
            disabled={disconnecting}
            className="rounded-md bg-white/20 px-2.5 py-1 text-[10px] font-semibold transition-colors hover:bg-white/30 disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : t('header.sessions.disconnect')}
          </button>
          <button onClick={() => setShowSessionAlert(false)} className="transition-colors hover:text-white/80" aria-label="Fermer l'alerte">
            ✕
          </button>
        </div>
      </div>
    )}
    <header className="sticky top-0 z-40 border-b border-border/40 bg-card/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Logo + Brand — visible uniquement sur mobile (la sidebar prend le relais sur desktop) */}
        <div className="flex items-center gap-3 lg:hidden">
          <img src="/logo.svg" alt="InternLog" width={36} height={36} className="h-9 w-9 rounded-xl" />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground">InternLog</span>
            <span className="hidden text-[10px] font-medium text-muted-foreground sm:inline">{t('header.subtitle')}</span>
          </div>
        </div>

        {/* Desktop: espace pour titre de page ou recherche */}
        <div className="hidden lg:flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">{t('header.subtitle')}</h1>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu utilisateur"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs transition-all hover:bg-secondary hover:shadow-sm"
          >
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="" width={24} height={24} className="h-6 w-6 rounded-full object-cover ring-1 ring-primary/20" />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
              </div>
            )}
            <span className="hidden font-medium text-foreground sm:inline">
              {profile?.first_name} {profile?.last_name?.charAt(0)}.
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl">
                {/* Profile Section */}
                <div className="bg-secondary/30 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{profile?.first_name} {profile?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  {profile?.des_level && (
                    <Badge variant="secondary" className="mt-1.5 border-primary/20 bg-primary/10 text-primary">
                      {profile.des_level}
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Navigation Links */}
                <div className="py-1">
                  {(profile?.role === 'supervisor' || profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'developer') && (
                    <a
                      href="/supervision"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <ClipboardCheck className="h-4 w-4 text-primary" />
                      {t('nav.supervision')}
                    </a>
                  )}

                  {(profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'developer') && (
                    <a
                      href="/admin"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      {t('nav.admin')}
                    </a>
                  )}

                  <a
                    href="/notes"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <StickyNote className="h-4 w-4 text-amber-500" />
                    {t('nav.notes')}
                  </a>

                  <a
                    href="/followups"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <HeartPulse className="h-4 w-4 text-rose-500" />
                    {t('nav.followups')}
                  </a>

                  <a
                    href="/subscription"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Crown className="h-4 w-4 text-amber-500" />
                    {t('nav.subscription')}
                  </a>

                  <a
                    href="/settings"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary/50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    {t('nav.settings')}
                  </a>
                </div>

                <Separator />

                <div className="py-1">
                  <form action={logout}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('nav.logout')}
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
    </>
  )
}
