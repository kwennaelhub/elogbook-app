'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, BarChart3, Calendar, FileText, MessageSquare } from 'lucide-react'

const navItems = [
  { href: '/logbook', label: 'Logbook', icon: BookOpen },
  { href: '/dashboard', label: 'Stats', icon: BarChart3 },
  { href: '/calendar', label: 'Gardes', icon: Calendar },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/feedback', label: 'Feedback', icon: MessageSquare },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white safe-area-bottom">
      <div className="mx-auto flex max-w-lg">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
