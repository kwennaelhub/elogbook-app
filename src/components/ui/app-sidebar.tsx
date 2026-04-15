'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  BookOpen, BarChart3, Calendar, Library,
  StickyNote, HeartPulse, ClipboardCheck, Shield,
  Settings, Crown, LogOut
} from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import { useI18n } from '@/lib/i18n/context'
import type { ProfileWithSubscription } from '@/types/database'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: string[]
}

export function AppSidebar({ profile }: { profile: ProfileWithSubscription | null }) {
  const pathname = usePathname()
  const { t } = useI18n()
  const role = profile?.role || 'intern'

  const mainNav: NavItem[] = [
    { href: '/dashboard', label: t('nav.stats'), icon: BarChart3 },
    { href: '/logbook', label: t('nav.logbook'), icon: BookOpen },
    { href: '/calendar', label: t('nav.gardes'), icon: Calendar },
    { href: '/templates', label: t('nav.reference'), icon: Library },
  ]

  const secondaryNav: NavItem[] = [
    { href: '/notes', label: t('nav.notes'), icon: StickyNote },
    { href: '/followups', label: t('nav.followups'), icon: HeartPulse },
    { href: '/supervision', label: t('nav.supervision'), icon: ClipboardCheck, roles: ['supervisor', 'admin', 'superadmin', 'developer'] },
    { href: '/admin', label: t('nav.admin'), icon: Shield, roles: ['admin', 'superadmin', 'developer'] },
  ]

  const filteredSecondary = secondaryNav.filter(
    item => !item.roles || item.roles.includes(role)
  )

  return (
    <aside className="hidden lg:flex flex-col w-[72px] xl:w-[220px] min-h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 xl:px-5">
        <img src="/logo.svg" alt="InternLog" width={40} height={40} className="h-10 w-10 rounded-xl shrink-0" />
        <div className="hidden xl:flex flex-col">
          <span className="text-sm font-bold tracking-tight text-sidebar-accent-foreground">Intern</span>
          <span className="text-sm font-bold tracking-tight text-primary">Log</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2 xl:px-3 py-4 space-y-1">
        <p className="hidden xl:block px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Principal
        </p>
        {mainNav.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="hidden xl:inline truncate">{item.label}</span>
            </Link>
          )
        })}

        {filteredSecondary.length > 0 && (
          <>
            <div className="my-3 border-t border-sidebar-border" />
            <p className="hidden xl:block px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Outils
            </p>
            {filteredSecondary.map((item) => {
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  <span className="hidden xl:inline truncate">{item.label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Bottom Section — Settings + Profile */}
      <div className="border-t border-sidebar-border px-2 xl:px-3 py-3 space-y-1">
        <Link
          href="/subscription"
          title={t('nav.subscription')}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
            pathname.startsWith('/subscription')
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          }`}
        >
          <Crown className="h-5 w-5 shrink-0 stroke-[1.8]" />
          <span className="hidden xl:inline truncate">{t('nav.subscription')}</span>
        </Link>

        <Link
          href="/settings"
          title={t('nav.settings')}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
            pathname.startsWith('/settings')
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          }`}
        >
          <Settings className="h-5 w-5 shrink-0 stroke-[1.8]" />
          <span className="hidden xl:inline truncate">{t('nav.settings')}</span>
        </Link>

        {/* User Profile Card */}
        <div className="mt-2 rounded-xl bg-sidebar-accent/50 p-2 xl:p-3">
          <div className="flex items-center gap-2.5">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/30 shrink-0" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground ring-2 ring-primary/30 shrink-0">
                {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
              </div>
            )}
            <div className="hidden xl:flex flex-col min-w-0">
              <span className="text-xs font-semibold text-sidebar-accent-foreground truncate">
                {profile?.first_name} {profile?.last_name?.charAt(0)}.
              </span>
              <span className="text-[10px] text-muted-foreground truncate">{profile?.des_level || role}</span>
            </div>
          </div>

          {/* Logout */}
          <form action={logout} className="mt-2">
            <button
              type="submit"
              title={t('nav.logout')}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden xl:inline">{t('nav.logout')}</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
