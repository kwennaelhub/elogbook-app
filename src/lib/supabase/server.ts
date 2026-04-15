import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseCircuit, CircuitOpenError } from '@/lib/circuit-breaker'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Appelé depuis un Server Component — ignore
          }
        },
      },
    }
  )
}

export async function createServiceClient() {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Exécute une opération Supabase protégée par le circuit breaker.
 * Si Supabase est en panne (5 échecs consécutifs), les requêtes sont
 * rejetées immédiatement pendant 30s avant de retester.
 *
 * Usage :
 *   const data = await withCircuitBreaker(() => supabase.from('entries').select('*'))
 */
export async function withCircuitBreaker<T>(
  fn: () => Promise<{ data: T; error: { message: string; code?: string } | null }>
): Promise<{ data: T; error: { message: string; code?: string } | null }> {
  try {
    return await supabaseCircuit.execute(async () => {
      const result = await fn()

      // Les erreurs réseau/serveur déclenchent le circuit breaker
      // Les erreurs métier (RLS, validation) ne le déclenchent PAS
      if (result.error) {
        const code = result.error.code || ''
        const msg = result.error.message || ''

        const isNetworkError =
          msg.includes('Failed to fetch') ||
          msg.includes('network') ||
          msg.includes('timeout') ||
          msg.includes('ECONNREFUSED') ||
          msg.includes('502') ||
          msg.includes('503') ||
          msg.includes('504') ||
          code === 'PGRST301' // connection error

        if (isNetworkError) {
          throw new Error(`Supabase network error: ${msg}`)
        }
      }

      return result
    })
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      return {
        data: null as T,
        error: { message: error.message, code: 'CIRCUIT_OPEN' },
      }
    }
    throw error
  }
}

/** Vérifie si le circuit Supabase est actuellement ouvert */
export function isSupabaseAvailable(): boolean {
  return supabaseCircuit.getState().state !== 'OPEN'
}
