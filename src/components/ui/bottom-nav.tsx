'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, BarChart3, Calendar, Library } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

function useNavItems() {
  const { t } = useI18n()
  return [
    { href: '/logbook', label: t('nav.logbook'), icon: BookOpen },
    { href: '/dashboard', label: t('nav.stats'), icon: BarChart3 },
    { href: '/calendar', label: t('nav.gardes'), icon: Calendar },
    { href: '/templates', label: t('nav.reference'), icon: Library },
  ]
}

export function BottomNav() {
  const pathname = usePathname()
  const navItems = useNavItems()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur-xl safe-area-bottom lg:hidden">
      <div className="mx-auto flex max-w-lg">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] transition-all touch-manipulation ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ minHeight: '56px' }}
            >
              <div className={`rounded-xl p-1.5 transition-all ${isActive ? 'bg-primary/10' : ''}`}>
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              </div>
              <span className={isActive ? 'font-semibold' : 'font-medium'}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
