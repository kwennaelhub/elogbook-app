'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { dictionaries, type Locale } from './dictionaries'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children, initialLocale = 'fr' }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    // Persister dans un cookie pour le SSR
    document.cookie = `internlog_locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
    // Mettre à jour le lang du HTML
    document.documentElement.lang = newLocale
  }, [])

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let value = dictionaries[locale][key] || dictionaries.fr[key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(`{${k}}`, String(v))
      })
    }
    return value
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
