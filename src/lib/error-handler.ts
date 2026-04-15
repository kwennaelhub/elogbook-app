/**
 * Handler d'erreurs centralisé — équivalent @ControllerAdvice (Spring).
 *
 * Intercepte toutes les erreurs dans les API routes et server actions,
 * les normalise en réponse JSON structurée.
 *
 * Usage API route :
 *   export async function POST(request: NextRequest) {
 *     return handleApiRoute(async () => {
 *       // ... logique métier
 *       return { data: result }
 *     })
 *   }
 *
 * Usage server action :
 *   export async function createEntry(...) {
 *     return handleAction(async () => {
 *       // ... logique métier
 *       return { success: true }
 *     })
 *   }
 */

import { NextResponse } from 'next/server'
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  RateLimitError,
  ServiceUnavailableError,
  ExternalServiceError,
} from '@/lib/exceptions'
import { CircuitOpenError } from '@/lib/circuit-breaker'
import { logger } from '@/lib/logger'

// =============================================
// Types de réponse
// =============================================

interface ErrorResponse {
  error: string
  code: string
  statusCode: number
  fields?: Record<string, string>
  retryAfter?: number
}

interface ActionResult<T = unknown> {
  success?: boolean
  error?: string
  code?: string
  data?: T
  fields?: Record<string, string>
}

// =============================================
// API Route Handler (@ControllerAdvice pour les routes)
// =============================================

export async function handleApiRoute<T>(
  fn: () => Promise<{ data: T; status?: number }>
): Promise<NextResponse> {
  try {
    const result = await fn()
    return NextResponse.json(result.data, { status: result.status || 200 })
  } catch (error) {
    return handleApiError(error)
  }
}

function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  // Circuit breaker ouvert → 503
  if (error instanceof CircuitOpenError) {
    logError('CIRCUIT_OPEN', error)
    return NextResponse.json(
      {
        error: error.message,
        code: 'SERVICE_UNAVAILABLE',
        statusCode: 503,
        retryAfter: error.retryAfter,
      },
      {
        status: 503,
        headers: { 'Retry-After': String(error.retryAfter) },
      }
    )
  }

  // Exceptions custom AppError
  if (error instanceof AppError) {
    logError(error.code, error)

    const response: ErrorResponse = {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    }

    // Ajouter les champs en erreur pour ValidationError
    if (error instanceof ValidationError && Object.keys(error.fields).length > 0) {
      response.fields = error.fields
    }

    // Ajouter retryAfter pour RateLimitError
    if (error instanceof RateLimitError) {
      return NextResponse.json(response, {
        status: 429,
        headers: { 'Retry-After': String(error.retryAfter) },
      })
    }

    return NextResponse.json(response, { status: error.statusCode })
  }

  // Erreur Supabase PostgreSQL
  if (isSupabaseError(error)) {
    const mapped = mapSupabaseError(error)
    logError(mapped.code, error)
    return NextResponse.json(mapped, { status: mapped.statusCode })
  }

  // Erreur inconnue → 500
  logError('INTERNAL_ERROR', error)
  return NextResponse.json(
    {
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    },
    { status: 500 }
  )
}

// =============================================
// Server Action Handler (@ControllerAdvice pour les actions)
// =============================================

export async function handleAction<T>(
  fn: () => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    return await fn()
  } catch (error) {
    return handleActionError(error)
  }
}

function handleActionError<T>(error: unknown): ActionResult<T> {
  // Circuit breaker
  if (error instanceof CircuitOpenError) {
    logError('CIRCUIT_OPEN', error)
    return { error: error.message, code: 'SERVICE_UNAVAILABLE' }
  }

  // Exceptions custom
  if (error instanceof AppError) {
    logError(error.code, error)
    const result: ActionResult<T> = { error: error.message, code: error.code }
    if (error instanceof ValidationError) {
      result.fields = error.fields
    }
    return result
  }

  // Erreur Supabase
  if (isSupabaseError(error)) {
    const mapped = mapSupabaseError(error)
    logError(mapped.code, error)
    return { error: mapped.error, code: mapped.code }
  }

  // Erreur inconnue
  logError('INTERNAL_ERROR', error)
  return { error: 'Erreur interne du serveur', code: 'INTERNAL_ERROR' }
}

// =============================================
// Mapping erreurs Supabase → exceptions typées
// =============================================

interface SupabaseError {
  code: string
  message: string
  details?: string
}

function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  )
}

function mapSupabaseError(error: SupabaseError): ErrorResponse {
  const { code, message } = error

  // Doublon (unique constraint violation)
  if (code === '23505') {
    return { error: 'Cette entrée existe déjà', code: 'CONFLICT', statusCode: 409 }
  }

  // Foreign key violation
  if (code === '23503') {
    return { error: 'Référence invalide', code: 'VALIDATION_ERROR', statusCode: 422 }
  }

  // RLS policy violation
  if (code === '42501' || message?.includes('policy')) {
    return { error: 'Accès refusé', code: 'AUTHORIZATION_ERROR', statusCode: 403 }
  }

  // Connexion refusée
  if (code === 'PGRST301' || message?.includes('connection')) {
    return { error: 'Service de données indisponible', code: 'SERVICE_UNAVAILABLE', statusCode: 503 }
  }

  // Timeout
  if (code === '57014' || message?.includes('timeout')) {
    return { error: 'La requête a pris trop de temps', code: 'TIMEOUT', statusCode: 504 }
  }

  // Erreur générique
  return { error: 'Erreur de base de données', code: 'DATABASE_ERROR', statusCode: 500 }
}

// =============================================
// Logging structuré
// =============================================

function logError(code: string, error: unknown) {
  const errorObj = error instanceof Error ? error : new Error(String(error))

  logger.error({
    err: errorObj,
    code,
    ...(error instanceof AppError && { statusCode: error.statusCode }),
    ...(error instanceof ExternalServiceError && { service: error.service }),
    ...(error instanceof ServiceUnavailableError && { service: error.service }),
    ...(error instanceof AuthorizationError && error.requiredRole && { requiredRole: error.requiredRole }),
  }, errorObj.message)
}
