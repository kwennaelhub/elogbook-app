import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const publicRoutes = ['/login', '/register', '/feedback', '/adhesion', '/offline']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Laisser passer les fichiers statiques
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') // fichiers statiques (favicon, manifest, etc.)
  ) {
    return NextResponse.next()
  }

  // Rate limiting sur les endpoints sensibles
  const rateLimitConfig = getRateLimitConfig(pathname, request.method)
  if (rateLimitConfig) {
    const ip = getClientIp(request.headers)
    const identifier = `${ip}:${pathname}`
    const result = rateLimit(identifier, rateLimitConfig)

    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques instants.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(rateLimitConfig.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }
  }

  // Laisser passer les API (rate limit déjà vérifié si applicable)
  if (pathname.startsWith('/api')) {
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
          cookiesToSet.forEach(({ name, value }) => {
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

  // Routes publiques
  if (publicRoutes.includes(pathname)) {
    // /feedback, /adhesion, /offline sont accessibles à tous (connecté ou non)
    // /offline doit être servi sans redirection : le service worker Safari
    // rejette toute réponse SW qui contient une redirection.
    if (pathname === '/feedback' || pathname === '/adhesion' || pathname === '/offline') {
      return supabaseResponse
    }
    // login/register : si connecté, rediriger vers logbook
    // Exception : ?invite=1 force l'affichage de la page login même authentifié
    // (le recipient d'un email d'invitation doit pouvoir se logger en tant que
    // lui-même, pas rester sur le compte d'un admin déjà loggé dans le navigateur)
    if (user) {
      const isInvite = request.nextUrl.searchParams.get('invite') === '1'
      if (!isInvite) {
        return NextResponse.redirect(new URL('/logbook', request.url))
      }
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

function getRateLimitConfig(pathname: string, method: string): { limit: number; windowSeconds: number } | null {
  // Auth POST uniquement : 10 tentatives par minute (protection brute force)
  // GET sur /login et /register ne sont PAS rate limités (navigation normale)
  if ((pathname === '/login' || pathname === '/register') && method === 'POST') {
    return { limit: 10, windowSeconds: 60 }
  }

  // Lookup matricule : 15 requêtes par minute (anti-énumération)
  if (pathname === '/api/lookup-matricule') {
    return { limit: 15, windowSeconds: 60 }
  }

  // Adhésion POST : 5 soumissions par 10 minutes (anti-spam)
  if (pathname === '/api/adhesion' && method === 'POST') {
    return { limit: 5, windowSeconds: 600 }
  }

  // Welcome email : 5 par minute (anti-spam)
  if (pathname === '/api/send-welcome') {
    return { limit: 5, windowSeconds: 60 }
  }

  return null
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)',
  ],
}
