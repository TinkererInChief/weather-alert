/**
 * Advanced Security Middleware
 * Integrates all Phase 2 security features into a comprehensive protection system
 */

import { NextRequest, NextResponse } from 'next/server'
import { log } from './logger'
import { verifyCaptcha, isCaptchaConfigured } from './captcha-service'
import { generateEnhancedFingerprint, assessDeviceRisk, BrowserFingerprint } from './device-fingerprint'
import { checkIPAccess, GeolocationPolicy } from './geolocation-service'
import { assessThreat, ThreatAssessment } from './threat-detection'
import { generateSecurityHeaders, generateNonce } from './security-headers'
import { AuthenticationError, AuthorizationError, RateLimitError } from './error-handler'

export interface SecurityContext {
  sessionId: string
  fingerprint: string
  threatAssessment: ThreatAssessment
  geoCheck: any
  deviceRisk: any
  captchaRequired: boolean
  securityLevel: 'minimal' | 'standard' | 'enhanced' | 'maximum'
  restrictions: string[]
  recommendations: string[]
}

export interface AdvancedSecurityConfig {
  enableCaptcha: boolean
  enableGeolocation: boolean
  enableDeviceFingerprinting: boolean
  enableThreatDetection: boolean
  enforcementLevel: 'monitor' | 'challenge' | 'block'
  customGeolocationPolicy?: Partial<GeolocationPolicy>
  trustedUserAgents?: string[]
  exemptEndpoints?: string[]
}

class AdvancedSecurityMiddleware {
  private readonly defaultConfig: AdvancedSecurityConfig = {
    enableCaptcha: true,
    enableGeolocation: true,
    enableDeviceFingerprinting: true,
    enableThreatDetection: true,
    enforcementLevel: 'challenge',
    exemptEndpoints: ['/api/health', '/api/ping'],
    trustedUserAgents: []
  }

  /**
   * Comprehensive security assessment for incoming requests
   */
  async assessRequestSecurity(
    request: NextRequest,
    config: Partial<AdvancedSecurityConfig> = {}
  ): Promise<{ 
    context: SecurityContext
    response?: NextResponse 
    headers: Record<string, string>
  }> {
    const finalConfig = { ...this.defaultConfig, ...config }
    const startTime = Date.now()
    const requestId = crypto.randomUUID()
    const sessionId = this.extractSessionId(request) || requestId
    
    // Extract basic request info
    const ip = this.extractIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const endpoint = new URL(request.url).pathname
    
    // Check if endpoint is exempt from security checks
    if (finalConfig.exemptEndpoints?.includes(endpoint)) {
      return {
        context: this.createMinimalContext(sessionId),
        headers: generateSecurityHeaders()
      }
    }

    // Initialize security context
    let securityContext: Partial<SecurityContext> = {
      sessionId,
      securityLevel: 'standard',
      restrictions: [],
      recommendations: [],
      captchaRequired: false
    }

    // Generate security headers with nonce
    const nonce = generateNonce()
    const securityHeaders = generateSecurityHeaders(undefined, nonce)

    try {
      // Phase 1: Device Fingerprinting
      let deviceRisk: any = null
      let fingerprint = ''
      
      if (finalConfig.enableDeviceFingerprinting) {
        const clientData = await this.extractBrowserFingerprint(request)
        const deviceFP = generateEnhancedFingerprint(request, clientData)
        fingerprint = deviceFP.fingerprint
        deviceRisk = assessDeviceRisk(deviceFP, request)
        
        securityContext.fingerprint = fingerprint
        securityContext.deviceRisk = deviceRisk
        
        if (deviceRisk.riskLevel === 'high') {
          securityContext.securityLevel = 'enhanced'
          securityContext.captchaRequired = true
          securityContext.restrictions?.push('High-risk device detected')
        }
      }

      // Phase 2: Geolocation Assessment
      let geoCheck: any = null
      
      if (finalConfig.enableGeolocation) {
        geoCheck = await checkIPAccess(ip, finalConfig.customGeolocationPolicy)
        securityContext.geoCheck = geoCheck
        
        if (!geoCheck.allowed) {
          securityContext.securityLevel = 'maximum'
          securityContext.restrictions?.push(`Geolocation: ${geoCheck.reason}`)
          
          if (finalConfig.enforcementLevel === 'block') {
            log.security('Request blocked by geolocation policy', {
              success: false,
              action: 'geolocation_block',
              ip: this.maskIP(ip),
              metadata: {
                sessionId,
                country: geoCheck.location?.country,
                reason: geoCheck.reason,
                riskLevel: geoCheck.riskLevel
              }
            })

            return {
              context: securityContext as SecurityContext,
              response: NextResponse.json({
                success: false,
                error: 'Access denied: Geographic restrictions apply',
                code: 'GEOLOCATION_BLOCKED'
              }, { status: 403, headers: securityHeaders }),
              headers: securityHeaders
            }
          }
        } else if (geoCheck.riskLevel === 'high') {
          securityContext.securityLevel = 'enhanced'
          securityContext.captchaRequired = true
        }
      }

      // Phase 3: Threat Detection
      let threatAssessment: ThreatAssessment | null = null
      
      if (finalConfig.enableThreatDetection) {
        threatAssessment = await assessThreat(request, sessionId, {
          fingerprint: deviceRisk,
          geolocation: geoCheck,
          endpoint,
          action: request.method
        })
        
        securityContext.threatAssessment = threatAssessment
        
        // Apply threat-based restrictions
        if (threatAssessment.threatLevel === 'critical') {
          if (finalConfig.enforcementLevel === 'block') {
            log.security('Request blocked by threat detection', {
              success: false,
              action: 'threat_block',
              ip: this.maskIP(ip),
              metadata: {
                sessionId,
                threatLevel: threatAssessment.threatLevel,
                riskScore: threatAssessment.riskScore,
                indicatorCount: threatAssessment.indicators.length,
                recommendation: threatAssessment.recommendation
              }
            })

            return {
              context: securityContext as SecurityContext,
              response: NextResponse.json({
                success: false,
                error: 'Access denied: Security threat detected',
                code: 'THREAT_DETECTED'
              }, { status: 403, headers: securityHeaders }),
              headers: securityHeaders
            }
          }
          securityContext.securityLevel = 'maximum'
          securityContext.captchaRequired = true
        } else if (threatAssessment.threatLevel === 'high') {
          securityContext.securityLevel = 'enhanced'
          securityContext.captchaRequired = true
        }
      }

      // Phase 4: CAPTCHA Assessment
      if (finalConfig.enableCaptcha && 
          (securityContext.captchaRequired || securityContext.securityLevel === 'maximum')) {
        
        const captchaToken = request.headers.get('x-captcha-token')
        
        if (isCaptchaConfigured() && !captchaToken) {
          return {
            context: securityContext as SecurityContext,
            response: NextResponse.json({
              success: false,
              error: 'CAPTCHA verification required',
              code: 'CAPTCHA_REQUIRED',
              securityLevel: securityContext.securityLevel,
              requiresCaptcha: true
            }, { status: 400, headers: securityHeaders }),
            headers: securityHeaders
          }
        }

        if (captchaToken) {
          const captchaResult = await verifyCaptcha(captchaToken, ip)
          if (!captchaResult.isValid) {
            return {
              context: securityContext as SecurityContext,
              response: NextResponse.json({
                success: false,
                error: 'CAPTCHA verification failed',
                code: 'CAPTCHA_FAILED',
                details: captchaResult.errors
              }, { status: 400, headers: securityHeaders }),
              headers: securityHeaders
            }
          }
        }
      }

      // Generate final security recommendations
      securityContext.recommendations = this.generateRecommendations(securityContext)

      const duration = Date.now() - startTime
      
      // Log security assessment
      log.info('Advanced security assessment completed', {
        requestId,
        sessionId,
        duration,
        securityLevel: securityContext.securityLevel,
        threatLevel: threatAssessment?.threatLevel,
        captchaRequired: securityContext.captchaRequired,
        restrictionCount: securityContext.restrictions?.length || 0,
        endpoint
      })

      return {
        context: securityContext as SecurityContext,
        headers: securityHeaders
      }

    } catch (error) {
      const duration = Date.now() - startTime
      
      log.error('Security assessment error', error, {
        requestId,
        sessionId,
        duration,
        endpoint,
        ip: this.maskIP(ip)
      })

      // Fail securely - default to enhanced security
      return {
        context: {
          sessionId,
          fingerprint: '',
          threatAssessment: {
            riskScore: 50,
            threatLevel: 'medium',
            indicators: [],
            recommendation: 'challenge',
            confidence: 50,
            sessionId
          },
          geoCheck: null,
          deviceRisk: null,
          captchaRequired: true,
          securityLevel: 'enhanced',
          restrictions: ['Security assessment error - enhanced protection applied'],
          recommendations: ['Complete security verification']
        },
        headers: securityHeaders
      }
    }
  }

  /**
   * Extract browser fingerprint data from request
   */
  private async extractBrowserFingerprint(request: NextRequest): Promise<BrowserFingerprint | undefined> {
    // This would typically come from client-side JavaScript
    // For now, we extract what we can from headers
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const acceptLanguage = request.headers.get('accept-language') || 'en-US'
    const platform = request.headers.get('sec-ch-ua-platform') || 'unknown'
    
    return {
      userAgent,
      language: acceptLanguage.split(',')[0],
      platform: platform.replace(/"/g, ''),
      cookieEnabled: true, // Assume true from server side
      doNotTrack: request.headers.get('dnt') || null,
      timezone: 'UTC' // Would need client-side data
    }
  }

  /**
   * Generate security recommendations based on context
   */
  private generateRecommendations(context: Partial<SecurityContext>): string[] {
    const recommendations: string[] = []
    
    if (context.securityLevel === 'maximum') {
      recommendations.push('Complete additional verification steps')
      recommendations.push('Monitor account activity closely')
    } else if (context.securityLevel === 'enhanced') {
      recommendations.push('Complete CAPTCHA verification')
      recommendations.push('Verify device if first-time access')
    } else if (context.captchaRequired) {
      recommendations.push('Complete CAPTCHA to continue')
    }
    
    if (context.restrictions && context.restrictions.length > 0) {
      recommendations.push('Address security concerns before proceeding')
    }
    
    return recommendations
  }

  /**
   * Create minimal security context for exempt endpoints
   */
  private createMinimalContext(sessionId: string): SecurityContext {
    return {
      sessionId,
      fingerprint: '',
      threatAssessment: {
        riskScore: 0,
        threatLevel: 'minimal',
        indicators: [],
        recommendation: 'allow',
        confidence: 100,
        sessionId
      },
      geoCheck: null,
      deviceRisk: null,
      captchaRequired: false,
      securityLevel: 'minimal',
      restrictions: [],
      recommendations: []
    }
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(request: NextRequest): string | null {
    // Try to get session ID from various sources
    return request.headers.get('x-session-id') ||
           request.cookies.get('session-id')?.value ||
           null
  }

  /**
   * Extract IP address from request
   */
  private extractIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0] ||
           request.headers.get('x-real-ip') ||
           request.ip ||
           'unknown'
  }

  /**
   * Mask IP for logging
   */
  private maskIP(ip: string): string {
    if (ip.includes(':')) {
      const parts = ip.split(':')
      return parts.slice(0, 4).join(':') + '::***'
    } else {
      const parts = ip.split('.')
      return parts.slice(0, 2).join('.') + '.***'
    }
  }
}

// Singleton instance
export const advancedSecurityMiddleware = new AdvancedSecurityMiddleware()

// Main export function
export const assessRequestSecurity = (
  request: NextRequest,
  config?: Partial<AdvancedSecurityConfig>
) => advancedSecurityMiddleware.assessRequestSecurity(request, config)
