import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authLogger as log } from '@/lib/logger'

/**
 * Callback OAuth / magic link Supabase.
 *
 * Utilisé principalement par le flow reset password :
 *   1. resetPasswordForEmail() envoie un email avec un lien vers cette route
 *   2. Le lien contient ?code=... (PKCE) qu'on échange contre une session
 *   3. La session est posée en cookies via Supabase-SSR
 *   4. Redirect vers ?next=... (typiquement /reset-password)
 *
 * Extensible pour d'autres flows OAuth (Google, GitHub) sans changement.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/'

  if (!code) {
    log.warn({ url: request.url }, 'Callback auth appelé sans code')
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    log.error({ err: error.message }, 'exchangeCodeForSession échoué')
    return NextResponse.redirect(new URL('/login?error=invalid_code', url.origin))
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
