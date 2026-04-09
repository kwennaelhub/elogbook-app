import { cookies } from 'next/headers'
import { dictionaries, type Locale } from './dictionaries'

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('internlog_locale')?.value
  return (locale === 'en' ? 'en' : 'fr') as Locale
}

export async function getServerT() {
  const locale = await getServerLocale()
  return (key: string, params?: Record<string, string | number>) => {
    let value = dictionaries[locale][key] || dictionaries.fr[key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(`{${k}}`, String(v))
      })
    }
    return value
  }
}
