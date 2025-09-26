/**
 * Secure Session Management with Enhanced JWT
 * Implements secure session handling with device binding and threat detection
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import { log } from './logger'
import { getSecret } from './secrets'

export interface SessionData {
  userId: string
  phone: string
  deviceFingerprint: string
  ipAddress: string
  userAgent: string
  loginTime: number
  lastActivity: number
  securityLevel: 'minimal' | 'standard' | 'enhanced' | 'maximum'
  mfaVerified: boolean
  geoLocation?: {
    country: string
    city: string
    coordinates?: [number, number]
  }
  riskScore: number
  sessionVersion: number
}

export interface EnhancedJWTPayload extends JWTPayload {
  sessionData: SessionData
  tokenType: 'access' | 'refresh'
  deviceId: string
  securityHash: string
}

export interface SessionValidationResult {
  valid: boolean
  session?: SessionData
  reason?: string
  requiresReauth?: boolean
  securityAction?: 'logout' | 'challenge' | 'monitor'
}

class SecureSessionManager {
  private readonly secretKey: Uint8Array
  private readonly algorithm = 'HS256'
  private readonly accessTokenTTL = 900 // 15 minutes
  private readonly refreshTokenTTL = 604800 // 7 days
  private readonly maxSessionAge = 86400 // 24 hours
  private readonly activeSessions = new Map<string, SessionData>()

  constructor() {
    const secret = getSecret('NEXTAUTH_SECRET')
    this.secretKey = new TextEncoder().encode(secret)
  }

  /**
   * Create a secure session with enhanced JWT tokens
   */
  async createSession(
    userData: {
      userId: string
      phone: string
      deviceFingerprint: string
      ipAddress: string
      userAgent: string
      geoLocation?: SessionData['geoLocation']
      securityLevel?: SessionData['securityLevel']
      riskScore?: number
    }
  ): Promise<{
    accessToken: string
    refreshToken: string
    sessionId: string
    expiresAt: Date
  }> {
    const now = Date.now()
    const sessionId = crypto.randomUUID()
    
    const sessionData: SessionData = {
      userId: userData.userId,
      phone: userData.phone,
      deviceFingerprint: userData.deviceFingerprint,
      ipAddress: userData.ipAddress,
      userAgent: userData.userAgent,
      loginTime: now,
      lastActivity: now,
      securityLevel: userData.securityLevel || 'standard',
      mfaVerified: true, // OTP verification counts as MFA
      geoLocation: userData.geoLocation,
      riskScore: userData.riskScore || 0,
      sessionVersion: 1
    }

    // Generate device ID from fingerprint and user agent
    const deviceId = await this.generateDeviceId(userData.deviceFingerprint, userData.userAgent)
    
    // Create security hash for tamper detection
    const securityHash = await this.generateSecurityHash(sessionData, deviceId)

    // Store session
    this.activeSessions.set(sessionId, sessionData)

    // Create JWT payload
    const basePayload = {
      sessionData,
      deviceId,
      securityHash,
      sessionId,
      iat: Math.floor(now / 1000),
      iss: 'emergency-alert-system',
      aud: 'emergency-alert-users'
    }

    // Generate access token
    const accessToken = await new SignJWT({
      ...basePayload,
      tokenType: 'access' as const
    })
      .setProtectedHeader({ alg: this.algorithm })
      .setExpirationTime(Math.floor((now + this.accessTokenTTL * 1000) / 1000))
      .sign(this.secretKey)

    // Generate refresh token
    const refreshToken = await new SignJWT({
      ...basePayload,
      tokenType: 'refresh' as const
    })
      .setProtectedHeader({ alg: this.algorithm })
      .setExpirationTime(Math.floor((now + this.refreshTokenTTL * 1000) / 1000))
      .sign(this.secretKey)

    const expiresAt = new Date(now + this.accessTokenTTL * 1000)

    log.info('Secure session created', {
      sessionId,
      userId: userData.userId,
      deviceId: deviceId.substring(0, 8) + '***',
      securityLevel: sessionData.securityLevel,
      riskScore: sessionData.riskScore,
      ipAddress: this.maskIP(userData.ipAddress)
    })

    return {
      accessToken,
      refreshToken,
      sessionId,
      expiresAt
    }
  }

  /**
   * Validate session with enhanced security checks
   */
  async validateSession(
    token: string,
    request: {
      ipAddress: string
      userAgent: string
      deviceFingerprint?: string
    }
  ): Promise<SessionValidationResult> {
    try {
      // Verify JWT
      const { payload } = await jwtVerify(token, this.secretKey)
      const enhancedPayload = payload as EnhancedJWTPayload

      if (!enhancedPayload.sessionData || !enhancedPayload.sessionId) {
        return { valid: false, reason: 'Invalid token structure' }
      }

      const sessionId = enhancedPayload.sessionId as string
      const sessionData = enhancedPayload.sessionData
      const storedSession = this.activeSessions.get(sessionId)

      // Check if session exists in memory
      if (!storedSession) {
        return { 
          valid: false, 
          reason: 'Session not found',
          requiresReauth: true 
        }
      }

      // Verify security hash
      const expectedHash = await this.generateSecurityHash(sessionData, enhancedPayload.deviceId)
      if (enhancedPayload.securityHash !== expectedHash) {
        log.security('Session tampering detected', {
          success: false,
          action: 'session_validation',
          sessionId,
          userId: sessionData.userId,
          ip: this.maskIP(request.ipAddress)
        })

        this.invalidateSession(sessionId)
        return { 
          valid: false, 
          reason: 'Session integrity violation',
          requiresReauth: true,
          securityAction: 'logout'
        }
      }

      // Check session age
      const sessionAge = Date.now() - sessionData.loginTime
      if (sessionAge > this.maxSessionAge * 1000) {
        this.invalidateSession(sessionId)
        return { 
          valid: false, 
          reason: 'Session expired',
          requiresReauth: true 
        }
      }

      // Device binding check
      if (request.deviceFingerprint) {
        const currentDeviceId = await this.generateDeviceId(request.deviceFingerprint, request.userAgent)
        if (currentDeviceId !== enhancedPayload.deviceId) {
          log.security('Device binding violation detected', {
            success: false,
            action: 'device_binding_check',
            sessionId,
            userId: sessionData.userId,
            expectedDevice: enhancedPayload.deviceId.substring(0, 8) + '***',
            actualDevice: currentDeviceId.substring(0, 8) + '***',
            ip: this.maskIP(request.ipAddress)
          })

          // For high security levels, reject immediately
          if (sessionData.securityLevel === 'maximum') {
            this.invalidateSession(sessionId)
            return {
              valid: false,
              reason: 'Device binding violation',
              requiresReauth: true,
              securityAction: 'logout'
            }
          } else {
            // For lower security levels, challenge the user
            return {
              valid: false,
              reason: 'Device verification required',
              securityAction: 'challenge'
            }
          }
        }
      }

      // IP address change detection
      if (request.ipAddress !== sessionData.ipAddress) {
        const ipDistance = await this.calculateIPDistance(sessionData.ipAddress, request.ipAddress)
        
        if (ipDistance > 1000) { // More than 1000km difference
          log.security('Suspicious IP change detected', {
            success: false,
            action: 'ip_change_detection',
            sessionId,
            userId: sessionData.userId,
            previousIP: this.maskIP(sessionData.ipAddress),
            currentIP: this.maskIP(request.ipAddress),
            estimatedDistance: ipDistance
          })

          if (sessionData.securityLevel === 'maximum' || sessionData.securityLevel === 'enhanced') {
            return {
              valid: false,
              reason: 'Location verification required',
              securityAction: 'challenge'
            }
          }
        }
      }

      // User agent consistency check
      if (request.userAgent !== sessionData.userAgent) {
        // Allow minor variations but flag major changes
        const similarity = this.calculateUserAgentSimilarity(sessionData.userAgent, request.userAgent)
        
        if (similarity < 0.8) {
          log.warn('User agent change detected', {
            sessionId,
            userId: sessionData.userId,
            similarity: similarity.toFixed(2),
            previousUA: sessionData.userAgent.substring(0, 50) + '***',
            currentUA: request.userAgent.substring(0, 50) + '***'
          })

          if (sessionData.securityLevel === 'maximum') {
            return {
              valid: false,
              reason: 'Browser verification required',
              securityAction: 'challenge'
            }
          }
        }
      }

      // Update last activity
      storedSession.lastActivity = Date.now()
      storedSession.ipAddress = request.ipAddress // Update current IP

      return {
        valid: true,
        session: storedSession
      }

    } catch (error) {
      log.error('Session validation error', error, {
        tokenLength: token.length,
        hasRequest: !!request,
        ip: request?.ipAddress ? this.maskIP(request.ipAddress) : 'unknown'
      })

      return {
        valid: false,
        reason: 'Token validation failed',
        requiresReauth: true
      }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshSession(refreshToken: string): Promise<{
    accessToken: string
    expiresAt: Date
  } | null> {
    try {
      const { payload } = await jwtVerify(refreshToken, this.secretKey)
      const enhancedPayload = payload as EnhancedJWTPayload

      if (enhancedPayload.tokenType !== 'refresh') {
        return null
      }

      const sessionId = enhancedPayload.sessionId as string
      const storedSession = this.activeSessions.get(sessionId)

      if (!storedSession) {
        return null
      }

      // Create new access token
      const now = Date.now()
      const accessToken = await new SignJWT({
        sessionData: storedSession,
        deviceId: enhancedPayload.deviceId,
        securityHash: enhancedPayload.securityHash,
        sessionId,
        tokenType: 'access' as const,
        iat: Math.floor(now / 1000),
        iss: 'emergency-alert-system',
        aud: 'emergency-alert-users'
      })
        .setProtectedHeader({ alg: this.algorithm })
        .setExpirationTime(Math.floor((now + this.accessTokenTTL * 1000) / 1000))
        .sign(this.secretKey)

      return {
        accessToken,
        expiresAt: new Date(now + this.accessTokenTTL * 1000)
      }

    } catch (error) {
      log.error('Token refresh failed', error)
      return null
    }
  }

  /**
   * Invalidate a specific session
   */
  invalidateSession(sessionId: string): void {
    this.activeSessions.delete(sessionId)
    log.info('Session invalidated', { sessionId })
  }

  /**
   * Invalidate all sessions for a user
   */
  invalidateUserSessions(userId: string): number {
    let count = 0
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        this.activeSessions.delete(sessionId)
        count++
      }
    }
    
    log.info('User sessions invalidated', { userId, count })
    return count
  }

  /**
   * Update session security level
   */
  updateSessionSecurity(
    sessionId: string, 
    securityLevel: SessionData['securityLevel'],
    riskScore?: number
  ): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    session.securityLevel = securityLevel
    session.sessionVersion++
    
    if (riskScore !== undefined) {
      session.riskScore = riskScore
    }

    log.info('Session security updated', {
      sessionId,
      userId: session.userId,
      securityLevel,
      riskScore: session.riskScore,
      version: session.sessionVersion
    })

    return true
  }

  /**
   * Get active sessions for monitoring
   */
  getActiveSessions(): { 
    total: number
    bySecurityLevel: Record<string, number>
    byRiskScore: { low: number; medium: number; high: number }
  } {
    const total = this.activeSessions.size
    const bySecurityLevel: Record<string, number> = {}
    const byRiskScore = { low: 0, medium: 0, high: 0 }

    for (const session of this.activeSessions.values()) {
      bySecurityLevel[session.securityLevel] = (bySecurityLevel[session.securityLevel] || 0) + 1
      
      if (session.riskScore < 30) byRiskScore.low++
      else if (session.riskScore < 70) byRiskScore.medium++
      else byRiskScore.high++
    }

    return { total, bySecurityLevel, byRiskScore }
  }

  // Private helper methods
  private async generateDeviceId(fingerprint: string, userAgent: string): Promise<string> {
    const data = `${fingerprint}:${userAgent}`
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 32)
  }

  private async generateSecurityHash(sessionData: SessionData, deviceId: string): Promise<string> {
    const data = `${sessionData.userId}:${sessionData.deviceFingerprint}:${deviceId}:${sessionData.sessionVersion}`
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 16)
  }

  private async calculateIPDistance(ip1: string, ip2: string): Promise<number> {
    // Simplified IP distance calculation
    // In production, you'd use actual geolocation data
    if (ip1 === ip2) return 0
    
    // Check if they're in same subnet (rough approximation)
    const parts1 = ip1.split('.')
    const parts2 = ip2.split('.')
    
    if (parts1.length === 4 && parts2.length === 4) {
      if (parts1[0] === parts2[0] && parts1[1] === parts2[1]) return 50 // Same region
      if (parts1[0] === parts2[0]) return 200 // Same country (rough)
    }
    
    return 2000 // Different countries (rough)
  }

  private calculateUserAgentSimilarity(ua1: string, ua2: string): number {
    if (ua1 === ua2) return 1.0
    
    // Simple similarity calculation based on common tokens
    const tokens1 = ua1.toLowerCase().split(/[\s\/\(\)]+/)
    const tokens2 = ua2.toLowerCase().split(/[\s\/\(\)]+/)
    
    const commonTokens = tokens1.filter(token => tokens2.includes(token))
    const totalTokens = new Set([...tokens1, ...tokens2]).size
    
    return commonTokens.length / totalTokens
  }

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
export const secureSessionManager = new SecureSessionManager()

// Utility functions
export const createSecureSession = (userData: Parameters<SecureSessionManager['createSession']>[0]) =>
  secureSessionManager.createSession(userData)

export const validateSecureSession = (token: string, request: Parameters<SecureSessionManager['validateSession']>[1]) =>
  secureSessionManager.validateSession(token, request)

export const refreshSecureSession = (refreshToken: string) =>
  secureSessionManager.refreshSession(refreshToken)

export const invalidateSession = (sessionId: string) =>
  secureSessionManager.invalidateSession(sessionId)

export const invalidateUserSessions = (userId: string) =>
  secureSessionManager.invalidateUserSessions(userId)
