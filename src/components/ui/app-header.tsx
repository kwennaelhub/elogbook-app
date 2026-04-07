'use client'

import { useState } from 'react'
import { User, LogOut, Shield } from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import type { ProfileWithSubscription } from '@/types/database'

export function AppHeader({ profile }: { profile: ProfileWithSubscription | null }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-blue-700 text-white">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          <span className="text-sm font-semibold">E-Logbook</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1.5 text-xs transition-colors hover:bg-blue-500"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">
              {profile?.first_name} {profile?.last_name?.charAt(0)}.
            </span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg bg-white py-1 text-slate-700 shadow-lg ring-1 ring-slate-200">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-medium">{profile?.first_name} {profile?.last_name}</p>
                  <p className="text-xs text-slate-500">{profile?.email}</p>
                  {profile?.des_level && (
                    <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {profile.des_level}
                    </span>
                  )}
                </div>

                {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
                  <a
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Shield className="h-4 w-4" />
                    Administration
                  </a>
                )}

                <form action={logout}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
