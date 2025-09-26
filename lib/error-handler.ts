import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { log } from './logger'
import { CircuitBreakerError } from './circuit-breaker'

// Standard error response interface
export interface ErrorResponse {
  success: false
  error: string
  code?: string
  details?: any
  timestamp: string
  requestId?: string
}

// Custom error classes for different scenarios
export class ValidationError extends Error {
  public code = 'VALIDATION_ERROR'
  public statusCode = 400
  public details: any

  constructor(message: string, details?: any) {
    super(message)
    this.name = 'ValidationError'
    this.details = details
  }
}

export class AuthenticationError extends Error {
  public code = 'AUTHENTICATION_ERROR'
  public statusCode = 401

  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  public code = 'AUTHORIZATION_ERROR'
  public statusCode = 403

  constructor(message: string = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends Error {
  public code = 'NOT_FOUND'
  public statusCode = 404

  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends Error {
  public code = 'RATE_LIMIT_EXCEEDED'  
  public statusCode = 429
  public retryAfter?: number

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

export class ServiceUnavailableError extends Error {
  public code = 'SERVICE_UNAVAILABLE'
  public statusCode = 503
  public service?: string

  constructor(message: string = 'Service temporarily unavailable', service?: string) {
    super(message)
    this.name = 'ServiceUnavailableError'
    this.service = service
  }
}

export class DatabaseError extends Error {
  public code = 'DATABASE_ERROR'
  public statusCode = 500
  public query?: string

  constructor(message: string, query?: string) {
    super(message)
    this.name = 'DatabaseError'
    this.query = query
  }
}

export class ExternalServiceError extends Error {
  public code = 'EXTERNAL_SERVICE_ERROR'
  public statusCode = 502
  public service: string
  public originalError?: Error

  constructor(service: string, message: string, originalError?: Error) {
    super(message)
    this.name = 'ExternalServiceError'
    this.service = service
    this.originalError = originalError
  }
}

// Enhanced error handler that creates appropriate responses
export function handleApiError(error: unknown, request?: Request): NextResponse<ErrorResponse> {
  const requestId = crypto.randomUUID()
  const timestamp = new Date().toISOString()
  
  // Extract request context for logging
  const requestContext = request ? {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
  } : {}

  // Handle different error types
  if (error instanceof ValidationError) {
    log.warn('Validation error', {
      requestId,
      error: error.message,
      details: error.details,
      ...requestContext
    })

    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      timestamp,
      requestId
    }, { status: error.statusCode })
  }

  if (error instanceof ZodError) {
    const details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))

    log.warn('Schema validation error', {
      requestId,
      error: 'Invalid request data',
      details,
      ...requestContext
    })

    return NextResponse.json({
      success: false,
      error: 'Invalid request data',
      code: 'SCHEMA_VALIDATION_ERROR',
      details,
      timestamp,
      requestId
    }, { status: 400 })
  }

  if (error instanceof AuthenticationError) {
    log.security('Authentication failure', {
      success: false,
      action: 'authenticate',
      reason: error.message,
      ip: requestContext.ip,
      userAgent: requestContext.userAgent,
      metadata: { requestId }
    })

    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      timestamp,
      requestId
    }, { status: error.statusCode })
  }

  if (error instanceof AuthorizationError) {
    log.security('Authorization failure', {
      success: false,
      action: 'authorize',
      reason: error.message,
      ip: requestContext.ip,
      userAgent: requestContext.userAgent,
      metadata: { requestId }
    })

    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      timestamp,
      requestId
    }, { status: error.statusCode })
  }

  if (error instanceof RateLimitError) {
    const headers: Record<string, string> = {}
    if (error.retryAfter) {
      headers['Retry-After'] = error.retryAfter.toString()
    }

    log.rateLimitViolation(
      requestContext.ip || 'unknown',
      requestContext.url || 'unknown',
      0 // We don't have the actual limit here
    )

    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      timestamp,
      requestId
    }, { 
      status: error.statusCode,
      headers
    })
  }

  if (error instanceof CircuitBreakerError) {
    log.warn('Circuit breaker error', {
      requestId,
      error: error.message,
      circuitState: error.circuitState,
      nextAttemptTime: error.nextAttemptTime,
      ...requestContext
    })

    return NextResponse.json({
      success: false,
      error: 'Service temporarily unavailable',
      code: 'CIRCUIT_BREAKER_OPEN',
      details: {
        nextRetryTime: error.nextAttemptTime ? new Date(error.nextAttemptTime).toISOString() : undefined
      },
      timestamp,
      requestId
    }, { status: 503 })
  }

  if (error instanceof ExternalServiceError) {
    log.error('External service error', error, {
      requestId,
      service: error.service,
      originalError: error.originalError?.message,
      ...requestContext
    })

    return NextResponse.json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? `${error.service} service is temporarily unavailable`
        : error.message,
      code: error.code,
      timestamp,
      requestId
    }, { status: error.statusCode })
  }

  if (error instanceof DatabaseError) {
    log.error('Database error', error, {
      requestId,
      query: error.query,
      ...requestContext
    })

    return NextResponse.json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Database operation failed'
        : error.message,
      code: error.code,
      timestamp,
      requestId
    }, { status: error.statusCode })
  }

  // Handle known custom errors
  if (error instanceof NotFoundError || 
      error instanceof ServiceUnavailableError) {
    const customError = error as NotFoundError | ServiceUnavailableError
    
    log.warn(`${customError.name}`, {
      requestId,
      error: customError.message,
      ...requestContext
    })

    return NextResponse.json({
      success: false,
      error: customError.message,
      code: customError.code,
      timestamp,
      requestId
    }, { status: customError.statusCode })
  }

  // Handle unknown errors
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
  const errorStack = error instanceof Error ? error.stack : undefined

  log.error('Unhandled error', error, {
    requestId,
    stack: errorStack,
    ...requestContext
  })

  // In production, don't expose internal error details
  const publicMessage = process.env.NODE_ENV === 'production' 
    ? 'Internal server error'
    : errorMessage

  return NextResponse.json({
    success: false,
    error: publicMessage,
    code: 'INTERNAL_SERVER_ERROR',
    timestamp,
    requestId
  }, { status: 500 })
}

// Async error wrapper for API routes
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      const request = args[0] as Request
      return handleApiError(error, request)
    }
  }) as T
}

// Database operation wrapper with error handling
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  query?: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof Error) {
      // Check for common database errors
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        throw new DatabaseError('Database connection failed', query)
      }
      if (error.message.includes('unique constraint')) {
        throw new ValidationError('Duplicate entry', { constraint: 'unique' })
      }
      if (error.message.includes('foreign key constraint')) {
        throw new ValidationError('Invalid reference', { constraint: 'foreign_key' })
      }
      if (error.message.includes('not found')) {
        throw new NotFoundError('Record not found')
      }
    }
    
    throw new DatabaseError(
      error instanceof Error ? error.message : 'Database operation failed',
      query
    )
  }
}

// External service call wrapper
export async function withExternalServiceErrorHandling<T>(
  serviceName: string,
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      throw error // Re-throw circuit breaker errors as-is
    }
    
    throw new ExternalServiceError(
      serviceName,
      error instanceof Error ? error.message : `${serviceName} service failed`,
      error instanceof Error ? error : undefined
    )
  }
}

// Global error boundary for unhandled promise rejections
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled promise rejection', reason, {
      promise: promise.toString(),
      type: 'unhandledRejection'
    })
    
    // In production, you might want to restart the process
    if (process.env.NODE_ENV === 'production') {
      console.error('Unhandled promise rejection. Process will exit.')
      process.exit(1)
    }
  })

  process.on('uncaughtException', (error) => {
    log.error('Uncaught exception', error, {
      type: 'uncaughtException',
      stack: error.stack
    })
    
    // Always exit on uncaught exceptions
    console.error('Uncaught exception. Process will exit.')
    process.exit(1)
  })
}
