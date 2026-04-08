'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, BarChart3, Calendar, Library } from 'lucide-react'

const navItems = [
  { href: '/logbook', label: 'Logbook', icon: BookOpen },
  { href: '/dashboard', label: 'Stats', icon: BarChart3 },
  { href: '/calendar', label: 'Gardes', icon: Calendar },
  { href: '/templates', label: 'Référentiel', icon: Library },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 bg-white/95 backdrop-blur-md safe-area-bottom">
      <div className="mx-auto flex max-w-lg">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition-all ${
                isActive
                  ? 'text-emerald-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`rounded-lg p-1 transition-all ${isActive ? 'bg-emerald-50' : ''}`}>
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
