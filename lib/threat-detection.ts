/**
 * Advanced Threat Detection System
 * Implements behavioral analysis and anomaly detection for security threats
 */

import { log } from './logger'
import { DeviceFingerprint, assessDeviceRisk } from './device-fingerprint'
import { GeolocationData, GeolocationResult } from './geolocation-service'

export interface ThreatIndicator {
  type: 'behavioral' | 'technical' | 'geolocation' | 'temporal' | 'volume'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  confidence: number // 0-100
  evidence: Record<string, any>
}

export interface ThreatAssessment {
  riskScore: number
  threatLevel: 'minimal' | 'low' | 'medium' | 'high' | 'critical'
  indicators: ThreatIndicator[]
  recommendation: 'allow' | 'challenge' | 'block' | 'investigate'
  confidence: number
  sessionId: string
}

export interface UserSession {
  sessionId: string
  ip: string
  userAgent: string
  fingerprint: string
  startTime: Date
  lastActivity: Date
  requestCount: number
  endpoints: string[]
  failedAttempts: number
  successfulActions: number
  geolocation?: GeolocationData
  deviceRisk?: any
}

export interface BehavioralPattern {
  rapidRequests: boolean
  unusualEndpoints: boolean
  failureSpike: boolean
  locationJumps: boolean
  deviceChanges: boolean
  timeAnomalies: boolean
}

class ThreatDetectionService {
  private sessions = new Map<string, UserSession>()
  private ipActivity = new Map<string, { requests: number[]; lastReset: number }>()
  private globalStats = {
    totalRequests: 0,
    failureRate: 0,
    averageSessionDuration: 0,
    commonUserAgents: new Map<string, number>()
  }

  /**
   * Comprehensive threat assessment
   */
  async assessThreat(
    request: Request,
    sessionId: string,
    additionalData?: {
      fingerprint?: DeviceFingerprint
      geolocation?: GeolocationResult
      phoneNumber?: string
      endpoint?: string
      action?: string
      success?: boolean
    }
  ): Promise<ThreatAssessment> {
    const ip = this.extractIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Get or create session
    const session = this.getOrCreateSession(sessionId, ip, userAgent, request)
    
    // Update session with current activity
    this.updateSession(session, request, additionalData)
    
    // Collect threat indicators
    const indicators: ThreatIndicator[] = []
    
    // Technical indicators
    indicators.push(...this.detectTechnicalThreats(request, session))
    
    // Behavioral indicators
    indicators.push(...this.detectBehavioralThreats(session))
    
    // Volume-based indicators
    indicators.push(...this.detectVolumeThreats(ip, session))
    
    // Temporal indicators
    indicators.push(...this.detectTemporalThreats(session))
    
    // Geolocation indicators
    if (additionalData?.geolocation) {
      indicators.push(...this.detectGeolocationThreats(additionalData.geolocation, session))
    }
    
    // Device indicators
    if (additionalData?.fingerprint) {
      indicators.push(...this.detectDeviceThreats(additionalData.fingerprint, session))
    }
    
    // Calculate overall risk score
    const riskScore = this.calculateRiskScore(indicators)
    const threatLevel = this.determineThreatLevel(riskScore)
    const confidence = this.calculateConfidence(indicators)
    const recommendation = this.getRecommendation(threatLevel, indicators)
    
    const assessment: ThreatAssessment = {
      riskScore,
      threatLevel,
      indicators,
      recommendation,
      confidence,
      sessionId
    }
    
    // Log high-risk assessments
    if (threatLevel === 'high' || threatLevel === 'critical') {
      log.security('High-risk threat detected', {
        success: false,
        action: 'threat_assessment',
        ip: this.maskIP(ip),
        metadata: {
          sessionId,
          threatLevel,
          riskScore,
          confidence,
          indicatorCount: indicators.length,
          recommendation,
          userAgent: userAgent.substring(0, 100),
          endpoint: additionalData?.endpoint
        }
      })
    }
    
    return assessment
  }

  /**
   * Detect technical threats from request headers and patterns
   */
  private detectTechnicalThreats(request: Request, session: UserSession): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = []
    const userAgent = request.headers.get('user-agent') || ''
    
    // Bot detection
    if (this.isBotUserAgent(userAgent)) {
      indicators.push({
        type: 'technical',
        severity: 'high',
        description: 'Bot or automated tool detected in user agent',
        confidence: 90,
        evidence: { userAgent: userAgent.substring(0, 100) }
      })
    }
    
    // Headless browser detection
    if (this.isHeadlessBrowser(request)) {
      indicators.push({
        type: 'technical',
        severity: 'high',
        description: 'Headless browser detected',
        confidence: 85,
        evidence: { 
          userAgent: userAgent.substring(0, 100),
          secChUa: request.headers.get('sec-ch-ua')
        }
      })
    }
    
    // Missing common headers
    const commonHeaders = ['accept', 'accept-language', 'accept-encoding']
    const missingHeaders = commonHeaders.filter(h => !request.headers.get(h))
    
    if (missingHeaders.length >= 2) {
      indicators.push({
        type: 'technical',
        severity: 'medium',
        description: 'Missing common browser headers',
        confidence: 70,
        evidence: { missingHeaders }
      })
    }
    
    // Suspicious accept headers
    const accept = request.headers.get('accept')
    if (accept && (accept === '*/*' || accept.includes('application/json') && !accept.includes('text/html'))) {
      indicators.push({
        type: 'technical',
        severity: 'low',
        description: 'Unusual accept header pattern',
        confidence: 60,
        evidence: { accept }
      })
    }
    
    return indicators
  }

  /**
   * Detect behavioral anomalies
   */
  private detectBehavioralThreats(session: UserSession): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = []
    const now = Date.now()
    const sessionDuration = now - session.startTime.getTime()
    
    // Rapid fire requests
    if (session.requestCount > 50 && sessionDuration < 60000) { // 50 requests in 1 minute
      indicators.push({
        type: 'behavioral',
        severity: 'high',
        description: 'Unusually high request frequency',
        confidence: 85,
        evidence: { 
          requestCount: session.requestCount, 
          duration: sessionDuration,
          requestsPerMinute: (session.requestCount / (sessionDuration / 60000)).toFixed(2)
        }
      })
    }
    
    // High failure rate
    const failureRate = session.failedAttempts / Math.max(session.requestCount, 1)
    if (failureRate > 0.5 && session.requestCount > 10) {
      indicators.push({
        type: 'behavioral',
        severity: 'medium',
        description: 'High failure rate indicating potential brute force',
        confidence: 80,
        evidence: { 
          failureRate: (failureRate * 100).toFixed(1) + '%',
          failedAttempts: session.failedAttempts,
          totalRequests: session.requestCount
        }
      })
    }
    
    // Unusual endpoint patterns
    const uniqueEndpoints = new Set(session.endpoints).size
    if (uniqueEndpoints > 20 && sessionDuration < 300000) { // 20+ endpoints in 5 minutes
      indicators.push({
        type: 'behavioral',
        severity: 'medium',
        description: 'Unusual endpoint exploration pattern',
        confidence: 75,
        evidence: { 
          uniqueEndpoints,
          totalRequests: session.requestCount,
          endpointDiversity: (uniqueEndpoints / session.requestCount).toFixed(2)
        }
      })
    }
    
    // No successful actions despite many attempts
    if (session.requestCount > 20 && session.successfulActions === 0) {
      indicators.push({
        type: 'behavioral',
        severity: 'medium',
        description: 'Many requests without successful actions',
        confidence: 70,
        evidence: { 
          requestCount: session.requestCount,
          successfulActions: session.successfulActions
        }
      })
    }
    
    return indicators
  }

  /**
   * Detect volume-based threats
   */
  private detectVolumeThreats(ip: string, session: UserSession): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = []
    const now = Date.now()
    
    // Get IP activity
    let ipActivity = this.ipActivity.get(ip)
    if (!ipActivity) {
      ipActivity = { requests: [], lastReset: now }
      this.ipActivity.set(ip, ipActivity)
    }
    
    // Clean old requests (last hour)
    const oneHourAgo = now - 3600000
    ipActivity.requests = ipActivity.requests.filter(time => time > oneHourAgo)
    
    // Add current request
    ipActivity.requests.push(now)
    
    // Check for volume-based threats
    const recentRequests = ipActivity.requests.filter(time => time > now - 300000) // Last 5 minutes
    
    if (recentRequests.length > 100) { // 100 requests in 5 minutes from single IP
      indicators.push({
        type: 'volume',
        severity: 'high',
        description: 'Excessive request volume from single IP',
        confidence: 90,
        evidence: { 
          recentRequests: recentRequests.length,
          totalHourlyRequests: ipActivity.requests.length,
          ip: this.maskIP(ip)
        }
      })
    }
    
    return indicators
  }

  /**
   * Detect temporal anomalies
   */
  private detectTemporalThreats(session: UserSession): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = []
    const now = new Date()
    const hour = now.getHours()
    
    // Activity during unusual hours (very late night/early morning)
    if ((hour >= 2 && hour <= 5) && session.requestCount > 10) {
      indicators.push({
        type: 'temporal',
        severity: 'low',
        description: 'Activity during unusual hours',
        confidence: 50,
        evidence: { 
          hour,
          requestCount: session.requestCount,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })
    }
    
    // Very short session with many requests
    const sessionDuration = now.getTime() - session.startTime.getTime()
    if (sessionDuration < 10000 && session.requestCount > 10) { // 10+ requests in 10 seconds
      indicators.push({
        type: 'temporal',
        severity: 'medium',
        description: 'Extremely rapid session progression',
        confidence: 80,
        evidence: { 
          duration: sessionDuration,
          requestCount: session.requestCount,
          requestsPerSecond: (session.requestCount / (sessionDuration / 1000)).toFixed(2)
        }
      })
    }
    
    return indicators
  }

  /**
   * Detect geolocation-based threats
   */
  private detectGeolocationThreats(geoResult: GeolocationResult, session: UserSession): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = []
    
    if (!geoResult.allowed) {
      indicators.push({
        type: 'geolocation',
        severity: geoResult.riskLevel === 'high' ? 'high' : 'medium',
        description: `Geolocation policy violation: ${geoResult.reason}`,
        confidence: 85,
        evidence: { 
          reason: geoResult.reason,
          riskLevel: geoResult.riskLevel,
          policy: geoResult.policy,
          country: geoResult.location?.country,
          isProxy: geoResult.location?.isProxy,
          isVpn: geoResult.location?.isVpn
        }
      })
    }
    
    // Check for location inconsistencies if we have previous geolocation data
    if (session.geolocation && geoResult.location) {
      const distance = this.calculateDistance(
        session.geolocation.latitude,
        session.geolocation.longitude,
        geoResult.location.latitude,
        geoResult.location.longitude
      )
      
      // Flag impossible travel (>500km in session duration)
      const sessionHours = (Date.now() - session.startTime.getTime()) / 3600000
      const maxPossibleDistance = sessionHours * 500 // 500km/h as reasonable travel speed
      
      if (distance > maxPossibleDistance && distance > 100) {
        indicators.push({
          type: 'geolocation',
          severity: 'high',
          description: 'Impossible travel detected between requests',
          confidence: 95,
          evidence: { 
            distance: distance.toFixed(0) + 'km',
            sessionDuration: sessionHours.toFixed(1) + 'h',
            maxPossible: maxPossibleDistance.toFixed(0) + 'km',
            previousLocation: `${session.geolocation.city}, ${session.geolocation.country}`,
            currentLocation: `${geoResult.location.city}, ${geoResult.location.country}`
          }
        })
      }
    }
    
    return indicators
  }

  /**
   * Detect device-based threats
   */
  private detectDeviceThreats(fingerprint: DeviceFingerprint, session: UserSession): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = []
    
    const deviceRisk = assessDeviceRisk(fingerprint, new Request('http://localhost'), undefined)
    
    if (deviceRisk.riskLevel === 'high') {
      indicators.push({
        type: 'technical',
        severity: 'high',
        description: 'High-risk device fingerprint detected',
        confidence: 85,
        evidence: { 
          riskScore: deviceRisk.riskScore,
          factors: deviceRisk.factors,
          isNewDevice: deviceRisk.isNewDevice
        }
      })
    }
    
    return indicators
  }

  /**
   * Calculate overall risk score from indicators
   */
  private calculateRiskScore(indicators: ThreatIndicator[]): number {
    let score = 0
    
    for (const indicator of indicators) {
      let weight = 1
      
      switch (indicator.severity) {
        case 'critical': weight = 4; break
        case 'high': weight = 3; break
        case 'medium': weight = 2; break
        case 'low': weight = 1; break
      }
      
      const weightedScore = (indicator.confidence / 100) * weight * 25
      score += weightedScore
    }
    
    return Math.min(score, 100)
  }

  /**
   * Determine threat level from risk score
   */
  private determineThreatLevel(riskScore: number): 'minimal' | 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 90) return 'critical'
    if (riskScore >= 70) return 'high'
    if (riskScore >= 50) return 'medium'
    if (riskScore >= 25) return 'low'
    return 'minimal'
  }

  /**
   * Calculate confidence in assessment
   */
  private calculateConfidence(indicators: ThreatIndicator[]): number {
    if (indicators.length === 0) return 100
    
    const avgConfidence = indicators.reduce((sum, ind) => sum + ind.confidence, 0) / indicators.length
    const diversityBonus = Math.min(new Set(indicators.map(i => i.type)).size * 5, 20)
    
    return Math.min(avgConfidence + diversityBonus, 100)
  }

  /**
   * Get security recommendation
   */
  private getRecommendation(
    threatLevel: string, 
    indicators: ThreatIndicator[]
  ): 'allow' | 'challenge' | 'block' | 'investigate' {
    const hasHighSeverity = indicators.some(i => i.severity === 'high' || i.severity === 'critical')
    const hasTechnicalThreats = indicators.some(i => i.type === 'technical')
    
    switch (threatLevel) {
      case 'critical':
        return 'block'
      case 'high':
        return hasHighSeverity ? 'block' : 'investigate'
      case 'medium':
        return hasTechnicalThreats ? 'challenge' : 'investigate'
      case 'low':
        return 'challenge'
      default:
        return 'allow'
    }
  }

  // Helper methods
  private extractIP(request: Request): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0] ||
           request.headers.get('x-real-ip') ||
           'unknown'
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

  private getOrCreateSession(sessionId: string, ip: string, userAgent: string, request: Request): UserSession {
    let session = this.sessions.get(sessionId)
    
    if (!session) {
      session = {
        sessionId,
        ip,
        userAgent,
        fingerprint: '',
        startTime: new Date(),
        lastActivity: new Date(),
        requestCount: 0,
        endpoints: [],
        failedAttempts: 0,
        successfulActions: 0
      }
      this.sessions.set(sessionId, session)
    }
    
    return session
  }

  private updateSession(session: UserSession, request: Request, additionalData?: any): void {
    session.lastActivity = new Date()
    session.requestCount++
    
    const endpoint = new URL(request.url).pathname
    session.endpoints.push(endpoint)
    
    if (additionalData?.success === false) {
      session.failedAttempts++
    } else if (additionalData?.success === true) {
      session.successfulActions++
    }
    
    if (additionalData?.geolocation?.location) {
      session.geolocation = additionalData.geolocation.location
    }
  }

  private isBotUserAgent(userAgent: string): boolean {
    const botPatterns = [
      'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
      'python', 'java', 'go-http', 'okhttp', 'axios',
      'phantom', 'headless', 'selenium', 'playwright', 'puppeteer'
    ]
    
    const lowerUA = userAgent.toLowerCase()
    return botPatterns.some(pattern => lowerUA.includes(pattern))
  }

  private isHeadlessBrowser(request: Request): boolean {
    const userAgent = request.headers.get('user-agent') || ''
    const secChUa = request.headers.get('sec-ch-ua') || ''
    
    return userAgent.toLowerCase().includes('headless') ||
           secChUa.includes('HeadlessChrome') ||
           !request.headers.get('sec-fetch-dest')
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private toRad(deg: number): number {
    return deg * (Math.PI/180)
  }
}

// Singleton instance
export const threatDetectionService = new ThreatDetectionService()

// Utility function
export const assessThreat = (
  request: Request,
  sessionId: string,
  additionalData?: any
) => threatDetectionService.assessThreat(request, sessionId, additionalData)
