/**
 * Comprehensive API Middleware System
 * Provides security, monitoring, validation, and error handling for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { log } from './logger'
import { 
  getApiRateLimit, 
  getClientIdentifier, 
  checkRateLimit, 
  createRateLimitHeaders 
} from './rate-limit'
import { validateRequestSize } from './validation'
import { handleApiError, withErrorHandler } from './error-handler'
import { generateSecurityHeaders, generateNonce } from './security-headers'

// Middleware configuration
interface MiddlewareConfig {
  rateLimit?: {
    enabled: boolean
    requests: number
    window: number // seconds
  }
  validation?: {
    maxBodySize: number // KB
    requireJson: boolean
  }
  security?: {
    requireHttps: boolean
    allowedOrigins?: string[]
    requireApiKey?: boolean
  }
  monitoring?: {
    logRequests: boolean
    logResponses: boolean
    trackPerformance: boolean
  }
}

// Default middleware configuration
const defaultConfig: MiddlewareConfig = {
  rateLimit: {
    enabled: true,
    requests: 100,
    window: 60
  },
  validation: {
    maxBodySize: 1024, // 1MB
    requireJson: true
  },
  security: {
    requireHttps: process.env.NODE_ENV === 'production',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    requireApiKey: false
  },
  monitoring: {
    logRequests: true,
    logResponses: true,
    trackPerformance: true
  }
}

// Request context for middleware chain
interface RequestContext {
  startTime: number
  requestId: string
  clientId: string
  method: string
  url: string
  userAgent: string
  ip: string
  authenticated: boolean
  userId?: string
  nonce?: string
  securityHeaders?: Record<string, string>
}

// Middleware result
interface MiddlewareResult {
  success: boolean
  response?: NextResponse
  context?: Partial<RequestContext>
}

// Enhanced security headers middleware
export function securityHeadersMiddleware(
  request: NextRequest,
  config: MiddlewareConfig = defaultConfig
): MiddlewareResult {
  // HTTPS enforcement
  if (config.security?.requireHttps && request.nextUrl.protocol !== 'https:') {
    log.security('HTTPS required but request is HTTP', {
      success: false,
      action: 'enforce_https',
      ip: request.ip || 'unknown',
      metadata: { url: request.url }
    })

    return {
      success: false,
      response: NextResponse.redirect(
        request.url.replace('http:', 'https:'),
        { status: 301 }
      )
    }
  }

  // Generate nonce for CSP
  const nonce = generateNonce()
  
  // Get comprehensive security headers
  const securityHeaders = generateSecurityHeaders({
    csp: {
      strictMode: process.env.NODE_ENV === 'production',
      enableNonce: true,
      allowInlineScripts: process.env.NODE_ENV === 'development',
      allowInlineStyles: true,
      trustedDomains: [
        'https://api.usgs.gov',
        'https://api.weather.gov',
        'https://hcaptcha.com',
        'https://*.hcaptcha.com'
      ]
    }
  }, nonce)

  // Add CORS headers
  const origin = request.headers.get('origin')
  const allowedOrigins = config.security?.allowedOrigins || ['*']
  
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    securityHeaders['Access-Control-Allow-Origin'] = origin || '*'
    securityHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    securityHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    securityHeaders['Access-Control-Max-Age'] = '86400'
  }

  return {
    success: true,
    context: { 
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      nonce,
      securityHeaders
    }
  }
}

// Rate limiting middleware
export async function rateLimitMiddleware(
  request: NextRequest,
  config: MiddlewareConfig = defaultConfig
): Promise<MiddlewareResult> {
  if (!config.rateLimit?.enabled) {
    return { success: true }
  }

  const clientId = getClientIdentifier(request)
  const result = await checkRateLimit(getApiRateLimit(), clientId)

  if (!result.success) {
    const headers = createRateLimitHeaders(result)
    
    log.rateLimitViolation(
      clientId.split(':')[0], // Extract IP from client ID
      request.nextUrl.pathname,
      result.limit
    )

    return {
      success: false,
      response: NextResponse.json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((result.reset.getTime() - Date.now()) / 1000)
      }, {
        status: 429,
        headers
      })
    }
  }

  return {
    success: true,
    context: {
      clientId
    }
  }
}

// Request validation middleware
export async function validationMiddleware(
  request: NextRequest,
  config: MiddlewareConfig = defaultConfig
): Promise<MiddlewareResult> {
  // Validate request size
  if (!validateRequestSize(config.validation?.maxBodySize || 1024)(request)) {
    log.warn('Request size exceeded limit', {
      url: request.url,
      contentLength: request.headers.get('content-length'),
      maxSize: config.validation?.maxBodySize
    })

    return {
      success: false,
      response: NextResponse.json({
        success: false,
        error: 'Request too large'
      }, { status: 413 })
    }
  }

  // Validate content type for POST/PUT requests
  if ((request.method === 'POST' || request.method === 'PUT') && 
      config.validation?.requireJson) {
    const contentType = request.headers.get('content-type')
    
    if (!contentType || !contentType.includes('application/json')) {
      return {
        success: false,
        response: NextResponse.json({
          success: false,
          error: 'Content-Type must be application/json'
        }, { status: 400 })
      }
    }
  }

  return { success: true }
}

// Authentication middleware
export async function authenticationMiddleware(
  request: NextRequest
): Promise<MiddlewareResult> {
  // Skip authentication for public endpoints
  const publicPaths = ['/api/health', '/api/ping', '/api/auth/']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  if (isPublicPath) {
    return { success: true, context: { authenticated: false } }
  }

  // Check for API key in headers
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')
  
  if (!apiKey) {
    return {
      success: false,
      response: NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }
  }

  // Validate API key (simplified - in production, use proper JWT validation)
  // This is a placeholder for actual authentication logic
  const isValidKey = apiKey === process.env.API_KEY || apiKey.startsWith('Bearer ')
  
  if (!isValidKey) {
    log.security('Invalid API key', {
      success: false,
      action: 'authenticate',
      ip: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return {
      success: false,
      response: NextResponse.json({
        success: false,
        error: 'Invalid authentication'
      }, { status: 401 })
    }
  }

  return {
    success: true,
    context: {
      authenticated: true,
      userId: 'api-user' // In production, extract from JWT
    }
  }
}

// Request logging middleware
export function requestLoggingMiddleware(
  request: NextRequest,
  context: RequestContext,
  config: MiddlewareConfig = defaultConfig
): MiddlewareResult {
  if (!config.monitoring?.logRequests) {
    return { success: true }
  }

  log.http('API Request', {
    requestId: context.requestId,
    method: request.method,
    url: request.nextUrl.pathname,
    query: Object.fromEntries(request.nextUrl.searchParams),
    ip: context.ip,
    userAgent: context.userAgent,
    authenticated: context.authenticated,
    userId: context.userId
  })

  return { success: true }
}

// Response logging middleware
export function responseLoggingMiddleware(
  request: NextRequest,
  response: NextResponse,
  context: RequestContext,
  config: MiddlewareConfig = defaultConfig
): void {
  if (!config.monitoring?.logResponses) {
    return
  }

  const duration = Date.now() - context.startTime

  log.http('API Response', {
    requestId: context.requestId,
    method: request.method,
    url: request.nextUrl.pathname,
    status: response.status,
    duration,
    ip: context.ip,
    authenticated: context.authenticated,
    userId: context.userId
  })

  // Log slow requests
  if (duration > 5000) {
    log.warn('Slow API request', {
      requestId: context.requestId,
      method: request.method,
      url: request.nextUrl.pathname,
      duration,
      status: response.status
    })
  }
}

// Main middleware compositor
export async function apiMiddleware(
  request: NextRequest,
  config: Partial<MiddlewareConfig> = {}
): Promise<NextResponse> {
  const finalConfig = { ...defaultConfig, ...config }
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  
  // Build request context
  const context: RequestContext = {
    startTime,
    requestId,
    clientId: '',
    method: request.method,
    url: request.nextUrl.pathname,
    userAgent: request.headers.get('user-agent') || 'unknown',
    ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    authenticated: false
  }

  try {
    // Run middleware chain
    const middlewares = [
      () => securityHeadersMiddleware(request, finalConfig),
      () => rateLimitMiddleware(request, finalConfig),
      () => validationMiddleware(request, finalConfig),
      () => authenticationMiddleware(request)
    ]

    for (const middleware of middlewares) {
      const result = await middleware()
      
      if (!result.success) {
        // Middleware failed, return early response
        if (result.response) {
          responseLoggingMiddleware(request, result.response, context, finalConfig)
          return result.response
        }
        
        // Fallback error response
        const errorResponse = NextResponse.json({
          success: false,
          error: 'Middleware validation failed'
        }, { status: 500 })
        
        responseLoggingMiddleware(request, errorResponse, context, finalConfig)
        return errorResponse
      }

      // Merge context from middleware
      if (result.context) {
        Object.assign(context, result.context)
      }
    }

    // Log successful request
    requestLoggingMiddleware(request, context, finalConfig)

    // Continue to route handler (this would be handled by Next.js routing)
    const response = NextResponse.next()
    
    // Add security headers to response
    const securityResult = securityHeadersMiddleware(request, finalConfig)
    if (securityResult.success && securityResult.context) {
      // Security headers would be added here in actual implementation
    }

    responseLoggingMiddleware(request, response, context, finalConfig)
    return response

  } catch (error) {
    log.error('Middleware error', error, {
      requestId: context.requestId,
      url: request.url,
      method: request.method
    })

    const errorResponse = handleApiError(error, request)
    responseLoggingMiddleware(request, errorResponse, context, finalConfig)
    return errorResponse
  }
}

// Convenience wrapper for API routes
export function withApiMiddleware(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: Partial<MiddlewareConfig>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Run middleware first
    const middlewareResponse = await apiMiddleware(request, config)
    
    // If middleware returned a response (error/redirect), return it
    if (middlewareResponse.status !== 200 || middlewareResponse.headers.get('location')) {
      return middlewareResponse
    }

    // Otherwise, run the actual handler
    return withErrorHandler(handler)(request)
  }
}
