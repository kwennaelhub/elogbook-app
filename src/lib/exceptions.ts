/**
 * Hiérarchie d'exceptions custom pour InternLog.
 * Équivalent des exceptions typées Java/Spring.
 *
 * AppError (base)
 * ├── AuthenticationError   — 401 (non connecté, session expirée)
 * ├── AuthorizationError    — 403 (rôle insuffisant)
 * ├── NotFoundError         — 404 (ressource inexistante)
 * ├── ValidationError       — 422 (données invalides)
 * ├── ConflictError         — 409 (doublon, état incohérent)
 * ├── RateLimitError        — 429 (trop de requêtes)
 * ├── ServiceUnavailableError — 503 (circuit ouvert, Supabase down)
 * └── ExternalServiceError  — 502 (Brevo, PayPal en erreur)
 */

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
  }
}

// 401 — Utilisateur non authentifié
export class AuthenticationError extends AppError {
  constructor(message = 'Authentification requise') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

// 403 — Rôle insuffisant
export class AuthorizationError extends AppError {
  constructor(message = 'Accès refusé', public readonly requiredRole?: string) {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

// 404 — Ressource introuvable
export class NotFoundError extends AppError {
  constructor(resource = 'Ressource', identifier?: string) {
    const msg = identifier
      ? `${resource} introuvable : ${identifier}`
      : `${resource} introuvable`
    super(msg, 404, 'NOT_FOUND')
  }
}

// 422 — Données invalides
export class ValidationError extends AppError {
  public readonly fields: Record<string, string>

  constructor(message = 'Données invalides', fields: Record<string, string> = {}) {
    super(message, 422, 'VALIDATION_ERROR')
    this.fields = fields
  }
}

// 409 — Conflit (doublon, état incohérent)
export class ConflictError extends AppError {
  constructor(message = 'Conflit de données') {
    super(message, 409, 'CONFLICT')
  }
}

// 429 — Rate limit
export class RateLimitError extends AppError {
  public readonly retryAfter: number

  constructor(retryAfter: number) {
    super(`Trop de requêtes. Réessayez dans ${retryAfter}s.`, 429, 'RATE_LIMIT')
    this.retryAfter = retryAfter
  }
}

// 503 — Service indisponible (circuit breaker ouvert)
export class ServiceUnavailableError extends AppError {
  public readonly service: string

  constructor(service: string, retryAfter?: number) {
    super(
      `Service ${service} temporairement indisponible${retryAfter ? `. Réessai dans ${retryAfter}s` : ''}.`,
      503,
      'SERVICE_UNAVAILABLE'
    )
    this.service = service
  }
}

// 502 — Service externe en erreur (Brevo, PayPal)
export class ExternalServiceError extends AppError {
  public readonly service: string
  public readonly originalError?: string

  constructor(service: string, originalError?: string) {
    super(`Erreur du service ${service}`, 502, 'EXTERNAL_SERVICE_ERROR')
    this.service = service
    this.originalError = originalError
  }
}
