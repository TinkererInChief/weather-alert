/**
 * Enhanced Security Headers Service
 * Implements comprehensive security headers for production deployment
 */

export interface SecurityHeadersConfig {
  csp: {
    strictMode: boolean
    reportUri?: string
    enableNonce: boolean
    allowInlineScripts: boolean
    allowInlineStyles: boolean
    trustedDomains: string[]
  }
  hsts: {
    maxAge: number
    includeSubDomains: boolean
    preload: boolean
  }
  frameOptions: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'
  contentTypeOptions: boolean
  referrerPolicy: string
  permissionsPolicy: Record<string, string[]>
  crossOriginPolicies: {
    embedderPolicy: string
    openerPolicy: string
    resourcePolicy: string
  }
}

class SecurityHeadersService {
  private readonly defaultConfig: SecurityHeadersConfig = {
    csp: {
      strictMode: true,
      enableNonce: true,
      allowInlineScripts: false,
      allowInlineStyles: true, // For Tailwind CSS
      trustedDomains: [
        'https://api.usgs.gov',
        'https://api.weather.gov', 
        'https://hcaptcha.com',
        'https://*.hcaptcha.com',
        'https://js.hcaptcha.com',
        'https://earthquake.usgs.gov',
        'https://service.iris.edu',
        'https://www.seismicportal.eu',
        'https://www.tsunami.gov',
        'https://www.data.jma.go.jp',
        'https://www.jma.go.jp',
      ]
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    frameOptions: 'DENY',
    contentTypeOptions: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      camera: ['none'],
      microphone: ['none'],
      geolocation: ['self'],
      payment: ['none'],
      usb: ['none'],
      fullscreen: ['self'],
      autoplay: ['none'],
      'picture-in-picture': ['none'],
      'screen-wake-lock': ['none'],
      'web-share': ['self']
    },
    crossOriginPolicies: {
      embedderPolicy: 'require-corp',
      openerPolicy: 'same-origin',
      resourcePolicy: 'cross-origin'
    }
  }

  /**
   * Generate comprehensive security headers
   */
  generateSecurityHeaders(
    config: Partial<SecurityHeadersConfig> = {},
    nonce?: string
  ): Record<string, string> {
    const finalConfig = this.mergeConfig(config)
    const headers: Record<string, string> = {}

    // Content Security Policy (CSP)
    headers['Content-Security-Policy'] = this.generateCSP(finalConfig, nonce)

    // HTTP Strict Transport Security (HSTS)
    if (process.env.NODE_ENV === 'production') {
      headers['Strict-Transport-Security'] = this.generateHSTS(finalConfig.hsts)
    }

    // X-Frame-Options
    headers['X-Frame-Options'] = finalConfig.frameOptions

    // X-Content-Type-Options
    if (finalConfig.contentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff'
    }

    // X-XSS-Protection (legacy but still useful)
    headers['X-XSS-Protection'] = '1; mode=block'

    // Referrer Policy
    headers['Referrer-Policy'] = finalConfig.referrerPolicy

    // Permissions Policy
    headers['Permissions-Policy'] = this.generatePermissionsPolicy(finalConfig.permissionsPolicy)

    // Cross-Origin Policies
    headers['Cross-Origin-Embedder-Policy'] = finalConfig.crossOriginPolicies.embedderPolicy
    headers['Cross-Origin-Opener-Policy'] = finalConfig.crossOriginPolicies.openerPolicy
    headers['Cross-Origin-Resource-Policy'] = finalConfig.crossOriginPolicies.resourcePolicy

    // Additional security headers
    headers['X-DNS-Prefetch-Control'] = 'off'
    headers['X-Download-Options'] = 'noopen'
    headers['X-Permitted-Cross-Domain-Policies'] = 'none'

    // Cache control for sensitive pages
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate'
    headers['Pragma'] = 'no-cache'
    headers['Expires'] = '0'

    return headers
  }

  /**
   * Generate Content Security Policy
   */
  private generateCSP(config: SecurityHeadersConfig, nonce?: string): string {
    const csp = config.csp
    const directives: string[] = []

    // Default source
    directives.push("default-src 'self'")

    // Script sources
    const scriptSources = ["'self'"]
    if (csp.enableNonce && nonce) {
      scriptSources.push(`'nonce-${nonce}'`)
    }
    if (csp.allowInlineScripts) {
      scriptSources.push("'unsafe-inline'")
    }
    // Allow unsafe-eval in development for Next.js hot reload
    if (!csp.strictMode || process.env.NODE_ENV === 'development') {
      scriptSources.push("'unsafe-eval'")
    }
    // Add trusted script domains
    scriptSources.push('https://js.hcaptcha.com')
    scriptSources.push('https://*.hcaptcha.com')
    
    directives.push(`script-src ${scriptSources.join(' ')}`)

    // Style sources
    const styleSources = ["'self'"]
    if (csp.allowInlineStyles) {
      styleSources.push("'unsafe-inline'")
    }
    styleSources.push('https://fonts.googleapis.com')
    directives.push(`style-src ${styleSources.join(' ')}`)

    // Font sources
    directives.push("font-src 'self' https://fonts.gstatic.com")

    // Image sources
    directives.push("img-src 'self' data: https: blob:")

    // Connect sources (for API calls)
    const connectSources = ["'self'"]
    connectSources.push(...csp.trustedDomains)
    connectSources.push('https://hcaptcha.com')
    connectSources.push('https://*.hcaptcha.com')
    directives.push(`connect-src ${connectSources.join(' ')}`)

    // Frame sources (for CAPTCHA)
    directives.push("frame-src 'self' https://hcaptcha.com https://*.hcaptcha.com")

    // Object and embed
    directives.push("object-src 'none'")
    directives.push("embed-src 'none'")

    // Media sources
    directives.push("media-src 'self'")

    // Worker sources
    directives.push("worker-src 'self' blob:")

    // Manifest source
    directives.push("manifest-src 'self'")

    // Base URI
    directives.push("base-uri 'self'")

    // Form action
    directives.push("form-action 'self'")

    // Frame ancestors
    directives.push("frame-ancestors 'none'")

    // Upgrade insecure requests (production only)
    if (process.env.NODE_ENV === 'production') {
      directives.push('upgrade-insecure-requests')
    }

    // Report URI if configured
    if (csp.reportUri) {
      directives.push(`report-uri ${csp.reportUri}`)
    }

    return directives.join('; ')
  }

  /**
   * Generate HSTS header
   */
  private generateHSTS(config: SecurityHeadersConfig['hsts']): string {
    let hsts = `max-age=${config.maxAge}`
    
    if (config.includeSubDomains) {
      hsts += '; includeSubDomains'
    }
    
    if (config.preload) {
      hsts += '; preload'
    }
    
    return hsts
  }

  /**
   * Generate Permissions Policy
   */
  private generatePermissionsPolicy(permissions: Record<string, string[]>): string {
    const policies: string[] = []
    
    for (const [feature, allowlist] of Object.entries(permissions)) {
      if (allowlist.length === 0 || allowlist.includes('none')) {
        policies.push(`${feature}=()`)
      } else if (allowlist.includes('*')) {
        policies.push(`${feature}=*`)
      } else {
        const origins = allowlist.map(origin => 
          origin === 'self' ? 'self' : `"${origin}"`
        ).join(' ')
        policies.push(`${feature}=(${origins})`)
      }
    }
    
    return policies.join(', ')
  }

  /**
   * Generate CSP nonce
   */
  generateNonce(): string {
    const buffer = new Uint8Array(16)
    crypto.getRandomValues(buffer)
    return Buffer.from(buffer).toString('base64')
  }

  /**
   * Validate security headers
   */
  validateHeaders(headers: Record<string, string>): {
    valid: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check for required headers
    const requiredHeaders = [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy'
    ]

    for (const header of requiredHeaders) {
      if (!headers[header]) {
        issues.push(`Missing required header: ${header}`)
      }
    }

    // Check CSP
    const csp = headers['Content-Security-Policy']
    if (csp) {
      if (csp.includes("'unsafe-eval'")) {
        issues.push("CSP allows 'unsafe-eval' which can enable XSS attacks")
      }
      if (csp.includes("'unsafe-inline'") && csp.includes('script-src')) {
        issues.push("CSP allows 'unsafe-inline' scripts which can enable XSS attacks")
      }
      if (!csp.includes("frame-ancestors 'none'") && !csp.includes("frame-ancestors 'self'")) {
        recommendations.push("Consider adding frame-ancestors directive to prevent clickjacking")
      }
    }

    // Check HSTS in production
    if (process.env.NODE_ENV === 'production' && !headers['Strict-Transport-Security']) {
      issues.push('Missing HSTS header in production environment')
    }

    // Check X-Frame-Options
    const frameOptions = headers['X-Frame-Options']
    if (frameOptions && frameOptions !== 'DENY' && frameOptions !== 'SAMEORIGIN') {
      recommendations.push("Consider using 'DENY' or 'SAMEORIGIN' for X-Frame-Options")
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    }
  }

  /**
   * Get security grade based on headers
   */
  getSecurityGrade(headers: Record<string, string>): {
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
    score: number
    breakdown: Record<string, number>
  } {
    const breakdown: Record<string, number> = {}
    let totalScore = 0

    // CSP (30 points)
    const csp = headers['Content-Security-Policy']
    if (csp) {
      if (csp.includes("'unsafe-eval'")) {
        breakdown.csp = 10
      } else if (csp.includes("'unsafe-inline'")) {
        breakdown.csp = 20
      } else {
        breakdown.csp = 30
      }
    } else {
      breakdown.csp = 0
    }
    totalScore += breakdown.csp

    // HSTS (20 points)
    const hsts = headers['Strict-Transport-Security']
    if (hsts) {
      breakdown.hsts = 20
      if (hsts.includes('includeSubDomains')) breakdown.hsts += 5
      if (hsts.includes('preload')) breakdown.hsts += 5
    } else {
      breakdown.hsts = process.env.NODE_ENV === 'production' ? 0 : 15
    }
    totalScore += breakdown.hsts

    // Frame protection (15 points)
    breakdown.frameProtection = headers['X-Frame-Options'] ? 15 : 0
    totalScore += breakdown.frameProtection

    // Content type protection (10 points)
    breakdown.contentType = headers['X-Content-Type-Options'] ? 10 : 0
    totalScore += breakdown.contentType

    // Referrer policy (10 points)
    breakdown.referrerPolicy = headers['Referrer-Policy'] ? 10 : 0
    totalScore += breakdown.referrerPolicy

    // Permissions policy (10 points)
    breakdown.permissionsPolicy = headers['Permissions-Policy'] ? 10 : 0
    totalScore += breakdown.permissionsPolicy

    // Cross-origin policies (5 points)
    const crossOriginHeaders = [
      'Cross-Origin-Embedder-Policy',
      'Cross-Origin-Opener-Policy',
      'Cross-Origin-Resource-Policy'
    ]
    breakdown.crossOrigin = crossOriginHeaders.filter(h => headers[h]).length * 2
    totalScore += breakdown.crossOrigin

    // Calculate grade
    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
    if (totalScore >= 95) grade = 'A+'
    else if (totalScore >= 85) grade = 'A'
    else if (totalScore >= 75) grade = 'B'
    else if (totalScore >= 65) grade = 'C'
    else if (totalScore >= 50) grade = 'D'
    else grade = 'F'

    return { grade, score: totalScore, breakdown }
  }

  /**
   * Merge configurations
   */
  private mergeConfig(config: Partial<SecurityHeadersConfig>): SecurityHeadersConfig {
    return {
      csp: { ...this.defaultConfig.csp, ...config.csp },
      hsts: { ...this.defaultConfig.hsts, ...config.hsts },
      frameOptions: config.frameOptions || this.defaultConfig.frameOptions,
      contentTypeOptions: config.contentTypeOptions ?? this.defaultConfig.contentTypeOptions,
      referrerPolicy: config.referrerPolicy || this.defaultConfig.referrerPolicy,
      permissionsPolicy: { ...this.defaultConfig.permissionsPolicy, ...config.permissionsPolicy },
      crossOriginPolicies: { ...this.defaultConfig.crossOriginPolicies, ...config.crossOriginPolicies }
    }
  }
}

// Singleton instance
export const securityHeadersService = new SecurityHeadersService()

// Utility functions
export const generateSecurityHeaders = (config?: Partial<SecurityHeadersConfig>, nonce?: string) =>
  securityHeadersService.generateSecurityHeaders(config, nonce)

export const generateNonce = () => securityHeadersService.generateNonce()

export const validateSecurityHeaders = (headers: Record<string, string>) =>
  securityHeadersService.validateHeaders(headers)

export const getSecurityGrade = (headers: Record<string, string>) =>
  securityHeadersService.getSecurityGrade(headers)

// Middleware helper for Next.js
export function withSecurityHeaders(config?: Partial<SecurityHeadersConfig>) {
  return function securityMiddleware(request: Request): Record<string, string> {
    const nonce = generateNonce()
    return generateSecurityHeaders(config, nonce)
  }
}
