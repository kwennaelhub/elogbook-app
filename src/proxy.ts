import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const publicRoutes = ['/login', '/register']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Laisser passer les fichiers statiques et API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // fichiers statiques (favicon, manifest, etc.)
  ) {
    return NextResponse.next()
  }

  // Si Supabase n'est pas configuré, laisser passer les routes publiques
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (publicRoutes.includes(pathname)) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Routes publiques : si connecté, rediriger vers le logbook
  if (publicRoutes.includes(pathname)) {
    if (user) {
      return NextResponse.redirect(new URL('/logbook', request.url))
    }
    return supabaseResponse
  }

  // Routes protégées : si non connecté, rediriger vers login
  if (!user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Racine : rediriger vers logbook
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/logbook', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)',
  ],
}
