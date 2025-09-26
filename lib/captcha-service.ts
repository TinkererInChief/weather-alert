/**
 * CAPTCHA Service for Bot Protection
 * Integrates with hCaptcha for server-side verification
 */

import { log } from './logger'
import { getSecret } from './secrets'
import { executeWithCircuitBreaker } from './circuit-breaker'

export interface CaptchaVerificationResult {
  success: boolean
  score?: number
  challenge_ts?: string
  hostname?: string
  error_codes?: string[]
  credit?: boolean
}

export interface CaptchaValidationResult {
  isValid: boolean
  score: number
  errors: string[]
  riskLevel: 'low' | 'medium' | 'high'
}

class CaptchaService {
  private readonly siteKey: string
  private readonly secretKey: string
  private readonly apiUrl = 'https://hcaptcha.com/siteverify'
  private readonly minimumScore = 0.5 // Threshold for accepting responses

  constructor() {
    this.siteKey = getSecret('HCAPTCHA_SITE_KEY', '') || ''
    this.secretKey = getSecret('HCAPTCHA_SECRET_KEY', '') || ''
    
    if (!this.siteKey || !this.secretKey) {
      log.warn('hCaptcha not configured - CAPTCHA verification will be disabled in development')
    }
  }

  /**
   * Verify CAPTCHA token from client
   */
  async verifyCaptcha(
    token: string, 
    remoteip?: string
  ): Promise<CaptchaValidationResult> {
    const startTime = Date.now()

    try {
      // Skip verification in development if not configured
      if (!this.secretKey || process.env.NODE_ENV === 'development') {
        log.warn('CAPTCHA verification skipped - not configured for development')
        return {
          isValid: true,
          score: 1.0,
          errors: [],
          riskLevel: 'low'
        }
      }

      if (!token) {
        return {
          isValid: false,
          score: 0,
          errors: ['Missing CAPTCHA token'],
          riskLevel: 'high'
        }
      }

      const result = await executeWithCircuitBreaker('hcaptcha', async () => {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            secret: this.secretKey,
            response: token,
            ...(remoteip && { remoteip })
          }).toString()
        })

        if (!response.ok) {
          throw new Error(`hCaptcha API error: ${response.status}`)
        }

        return await response.json() as CaptchaVerificationResult
      })

      const duration = Date.now() - startTime

      // Log verification attempt
      log.info('CAPTCHA verification completed', {
        success: result.success,
        duration,
        hostname: result.hostname,
        hasErrors: result.error_codes && result.error_codes.length > 0,
        remoteip: remoteip ? this.maskIp(remoteip) : undefined
      })

      // Analyze result and determine risk level
      const validation = this.analyzeResult(result)

      // Log security events for failed verifications
      if (!validation.isValid) {
        log.security('CAPTCHA verification failed', {
          success: false,
          action: 'captcha_verify',
          ip: remoteip || 'unknown',
          metadata: {
            errors: validation.errors,
            error_codes: result.error_codes,
            duration
          }
        })
      }

      return validation

    } catch (error) {
      const duration = Date.now() - startTime
      
      log.error('CAPTCHA verification error', error, {
        duration,
        remoteip: remoteip ? this.maskIp(remoteip) : undefined,
        hasToken: !!token
      })

      // In case of service failure, we may want to allow or deny based on policy
      // For emergency systems, we lean towards availability over strict security
      const failOpen = process.env.CAPTCHA_FAIL_OPEN === 'true'
      
      return {
        isValid: failOpen,
        score: failOpen ? 0.6 : 0,
        errors: [`CAPTCHA service error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        riskLevel: failOpen ? 'medium' : 'high'
      }
    }
  }

  /**
   * Analyze hCaptcha result and determine validity
   */
  private analyzeResult(result: CaptchaVerificationResult): CaptchaValidationResult {
    const errors: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    let score = 1.0

    // Check if verification was successful
    if (!result.success) {
      errors.push('CAPTCHA verification failed')
      score = 0
      riskLevel = 'high'

      // Analyze specific error codes
      if (result.error_codes) {
        for (const errorCode of result.error_codes) {
          switch (errorCode) {
            case 'missing-input-secret':
            case 'invalid-input-secret':
              errors.push('CAPTCHA configuration error')
              break
            case 'missing-input-response':
            case 'invalid-input-response':
              errors.push('Invalid CAPTCHA response')
              break
            case 'bad-request':
              errors.push('Invalid CAPTCHA request')
              break
            case 'timeout-or-duplicate':
              errors.push('CAPTCHA timeout or already used')
              riskLevel = 'medium' // Could be legitimate slow connection
              break
            default:
              errors.push(`CAPTCHA error: ${errorCode}`)
          }
        }
      }
    }

    // Additional risk analysis based on response characteristics
    if (result.success) {
      // Check challenge timestamp if available
      if (result.challenge_ts) {
        const challengeTime = new Date(result.challenge_ts).getTime()
        const timeDiff = Date.now() - challengeTime
        
        // Flag very quick responses as potentially automated
        if (timeDiff < 2000) { // Less than 2 seconds
          score *= 0.8
          riskLevel = 'medium'
        }
        
        // Flag very old challenges
        if (timeDiff > 300000) { // More than 5 minutes
          score *= 0.9
          riskLevel = 'medium'
        }
      }
      
      // Check hostname if provided
      if (result.hostname && process.env.EXPECTED_HOSTNAME) {
        if (result.hostname !== process.env.EXPECTED_HOSTNAME) {
          score *= 0.7
          riskLevel = 'medium'
          errors.push('Unexpected hostname in CAPTCHA response')
        }
      }
    }

    return {
      isValid: result.success && score >= this.minimumScore,
      score,
      errors,
      riskLevel
    }
  }

  /**
   * Get site key for client-side integration
   */
  getSiteKey(): string {
    return this.siteKey
  }

  /**
   * Check if CAPTCHA is properly configured
   */
  isConfigured(): boolean {
    return !!(this.siteKey && this.secretKey)
  }

  /**
   * Mask IP address for logging
   */
  private maskIp(ip: string): string {
    if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':')
      return parts.slice(0, 4).join(':') + '::***'
    } else {
      // IPv4
      const parts = ip.split('.')
      return parts.slice(0, 2).join('.') + '.***'
    }
  }

  /**
   * Generate challenge parameters for high-risk scenarios
   */
  generateChallengeParams(riskLevel: 'low' | 'medium' | 'high' = 'medium'): Record<string, any> {
    const params: Record<string, any> = {
      sitekey: this.siteKey,
      theme: 'light',
      size: 'normal'
    }

    // Adjust difficulty based on risk level
    switch (riskLevel) {
      case 'high':
        params.size = 'compact' // Smaller, harder to solve
        params.theme = 'dark'
        break
      case 'medium':
        params.size = 'normal'
        break
      case 'low':
        params.size = 'invisible' // Only show if needed
        break
    }

    return params
  }
}

// Singleton instance
export const captchaService = new CaptchaService()

// Utility functions
export const verifyCaptcha = (token: string, remoteip?: string) => 
  captchaService.verifyCaptcha(token, remoteip)

export const getCaptchaSiteKey = () => captchaService.getSiteKey()

export const isCaptchaConfigured = () => captchaService.isConfigured()

// Middleware integration helper
export function requireCaptcha(riskLevel: 'low' | 'medium' | 'high' = 'medium') {
  return {
    enabled: captchaService.isConfigured(),
    siteKey: captchaService.getSiteKey(),
    params: captchaService.generateChallengeParams(riskLevel)
  }
}
