'use client'

import { useState } from 'react'
import { User, LogOut, Shield, Settings, Crown, ClipboardCheck } from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import type { ProfileWithSubscription } from '@/types/database'

export function AppHeader({ profile }: { profile: ProfileWithSubscription | null }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight">InternLog</span>
            <span className="ml-1.5 hidden text-[10px] font-normal text-slate-400 sm:inline">Logbook DES</span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
              </div>
            )}
            <span className="hidden sm:inline">
              {profile?.first_name} {profile?.last_name?.charAt(0)}.
            </span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl bg-white text-slate-700 shadow-xl ring-1 ring-slate-200/60">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{profile?.first_name} {profile?.last_name}</p>
                  <p className="text-xs text-slate-500">{profile?.email}</p>
                  {profile?.des_level && (
                    <span className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {profile.des_level}
                    </span>
                  )}
                </div>

                {(profile?.role === 'supervisor' || profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'developer') && (
                  <a
                    href="/supervision"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-slate-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <ClipboardCheck className="h-4 w-4 text-emerald-500" />
                    Supervision
                  </a>
                )}

                {(profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'developer') && (
                  <a
                    href="/admin"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-slate-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Shield className="h-4 w-4 text-slate-400" />
                    Administration
                  </a>
                )}

                <a
                  href="/subscription"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-slate-50"
                  onClick={() => setMenuOpen(false)}
                >
                  <Crown className="h-4 w-4 text-amber-500" />
                  Abonnement
                </a>

                <a
                  href="/settings"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-slate-50"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  Paramètres
                </a>

                <div className="border-t border-slate-100">
                  <form action={logout}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Déconnexion
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
