/**
 * Device Fingerprinting Service
 * Creates unique device signatures for enhanced security tracking
 */

import { createHash } from 'crypto'
import { log } from './logger'

export interface DeviceFingerprint {
  id: string
  userAgent: string
  acceptLanguage: string
  acceptEncoding: string
  timezone: string
  screenResolution?: string
  colorDepth?: string
  platform?: string
  cookieEnabled?: boolean
  doNotTrack?: boolean
  fingerprint: string
  riskScore: number
  firstSeen: Date
  lastSeen: Date
  visitCount: number
}

export interface BrowserFingerprint {
  userAgent: string
  language: string
  platform: string
  cookieEnabled: boolean
  doNotTrack: string | null
  timezone: string
  screenWidth?: number
  screenHeight?: number
  colorDepth?: number
  pixelRatio?: number
}

export interface DeviceRiskAssessment {
  fingerprint: string
  riskLevel: 'low' | 'medium' | 'high'
  riskScore: number
  factors: string[]
  recommendations: string[]
  isNewDevice: boolean
  lastSeenDays?: number
}

class DeviceFingerprintService {
  private fingerprints = new Map<string, DeviceFingerprint>()

  /**
   * Generate device fingerprint from request headers
   */
  generateFingerprint(request: Request): string {
    const components = [
      request.headers.get('user-agent') || '',
      request.headers.get('accept-language') || '',
      request.headers.get('accept-encoding') || '',
      request.headers.get('accept') || '',
      request.headers.get('sec-ch-ua') || '',
      request.headers.get('sec-ch-ua-mobile') || '',
      request.headers.get('sec-ch-ua-platform') || '',
      request.headers.get('sec-fetch-dest') || '',
      request.headers.get('sec-fetch-mode') || '',
      request.headers.get('sec-fetch-site') || '',
    ]

    // Create deterministic hash from browser characteristics
    const fingerprint = createHash('sha256')
      .update(components.join('|'))
      .digest('hex')
      .substring(0, 16)

    return fingerprint
  }

  /**
   * Enhanced fingerprint with client-side data
   */
  generateEnhancedFingerprint(
    request: Request, 
    clientData?: BrowserFingerprint
  ): DeviceFingerprint {
    const baseFingerprint = this.generateFingerprint(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Enhanced components if client data available
    let enhancedComponents = [
      userAgent,
      request.headers.get('accept-language') || '',
      request.headers.get('accept-encoding') || '',
    ]

    if (clientData) {
      enhancedComponents = enhancedComponents.concat([
        clientData.platform,
        clientData.language,
        clientData.timezone,
        clientData.cookieEnabled.toString(),
        clientData.doNotTrack || '',
        (clientData.screenWidth || 0).toString(),
        (clientData.screenHeight || 0).toString(),
        (clientData.colorDepth || 0).toString(),
        (clientData.pixelRatio || 0).toString(),
      ])
    }

    const enhancedHash = createHash('sha256')
      .update(enhancedComponents.join('|'))
      .digest('hex')
      .substring(0, 16)

    const now = new Date()
    const existing = this.fingerprints.get(enhancedHash)

    const fingerprint: DeviceFingerprint = {
      id: enhancedHash,
      userAgent,
      acceptLanguage: request.headers.get('accept-language') || '',
      acceptEncoding: request.headers.get('accept-encoding') || '',
      timezone: clientData?.timezone || '',
      screenResolution: clientData ? `${clientData.screenWidth}x${clientData.screenHeight}` : undefined,
      colorDepth: clientData?.colorDepth?.toString(),
      platform: clientData?.platform || request.headers.get('sec-ch-ua-platform') || '',
      cookieEnabled: clientData?.cookieEnabled,
      doNotTrack: clientData?.doNotTrack === '1',
      fingerprint: enhancedHash,
      riskScore: existing?.riskScore || this.calculateInitialRiskScore(request, clientData),
      firstSeen: existing?.firstSeen || now,
      lastSeen: now,
      visitCount: (existing?.visitCount || 0) + 1
    }

    this.fingerprints.set(enhancedHash, fingerprint)
    return fingerprint
  }

  /**
   * Assess device risk based on fingerprint and behavior
   */
  assessDeviceRisk(
    fingerprint: DeviceFingerprint,
    request: Request,
    phoneNumber?: string
  ): DeviceRiskAssessment {
    const factors: string[] = []
    let riskScore = 0

    // New device factor
    const isNewDevice = fingerprint.visitCount <= 1
    if (isNewDevice) {
      riskScore += 30
      factors.push('New device')
    }

    // User agent analysis
    if (this.isSuspiciousUserAgent(fingerprint.userAgent)) {
      riskScore += 40
      factors.push('Suspicious user agent')
    }

    // Missing or unusual headers
    if (!fingerprint.acceptLanguage || fingerprint.acceptLanguage === '') {
      riskScore += 20
      factors.push('Missing language headers')
    }

    // Automation indicators
    if (this.hasAutomationIndicators(request)) {
      riskScore += 50
      factors.push('Automation detected')
    }

    // Headless browser detection
    if (this.isHeadlessBrowser(fingerprint.userAgent, request)) {
      riskScore += 60
      factors.push('Headless browser detected')
    }

    // Screen resolution analysis
    if (fingerprint.screenResolution && this.isSuspiciousResolution(fingerprint.screenResolution)) {
      riskScore += 25
      factors.push('Unusual screen resolution')
    }

    // Frequency analysis
    if (fingerprint.visitCount > 100) {
      riskScore += 30
      factors.push('High frequency access')
    }

    // Time-based analysis
    const daysSinceFirstSeen = Math.floor(
      (Date.now() - fingerprint.firstSeen.getTime()) / (1000 * 60 * 60 * 24)
    )

    let riskLevel: 'low' | 'medium' | 'high'
    const recommendations: string[] = []

    if (riskScore >= 80) {
      riskLevel = 'high'
      recommendations.push('Require additional verification')
      recommendations.push('Monitor closely for suspicious activity')
      if (isNewDevice) recommendations.push('Consider blocking until manual review')
    } else if (riskScore >= 40) {
      riskLevel = 'medium'
      recommendations.push('Apply enhanced monitoring')
      recommendations.push('Consider requiring CAPTCHA')
      if (isNewDevice) recommendations.push('Limit functionality until verified')
    } else {
      riskLevel = 'low'
      recommendations.push('Normal processing')
    }

    // Log risk assessment
    log.security('Device risk assessment', {
      success: riskLevel === 'low',
      action: 'device_risk_assessment',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      metadata: {
        fingerprint: fingerprint.fingerprint,
        riskLevel,
        riskScore,
        factors: factors.length,
        isNewDevice,
        daysSinceFirstSeen,
        visitCount: fingerprint.visitCount
      }
    })

    return {
      fingerprint: fingerprint.fingerprint,
      riskLevel,
      riskScore,
      factors,
      recommendations,
      isNewDevice,
      lastSeenDays: daysSinceFirstSeen
    }
  }

  /**
   * Check if user agent indicates suspicious activity
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspicious = [
      'curl', 'wget', 'python', 'bot', 'crawler', 'scraper',
      'phantom', 'headless', 'selenium', 'playwright', 'puppeteer'
    ]
    
    const lowerUA = userAgent.toLowerCase()
    return suspicious.some(term => lowerUA.includes(term))
  }

  /**
   * Detect automation indicators in headers
   */
  private hasAutomationIndicators(request: Request): boolean {
    const automationHeaders = [
      'x-requested-with',
      'x-automation',
      'x-selenium',
      'x-playwright'
    ]

    // Check for automation-specific headers
    for (const header of automationHeaders) {
      if (request.headers.get(header)) {
        return true
      }
    }

    // Check for missing common browser headers
    const commonHeaders = ['accept', 'accept-encoding', 'accept-language']
    const missingHeaders = commonHeaders.filter(h => !request.headers.get(h))
    
    return missingHeaders.length >= 2
  }

  /**
   * Detect headless browsers
   */
  private isHeadlessBrowser(userAgent: string, request: Request): boolean {
    const headlessIndicators = [
      'headlesschrome',
      'chrome/999',
      'phantomjs',
      'headlessfirefox'
    ]

    const lowerUA = userAgent.toLowerCase()
    if (headlessIndicators.some(indicator => lowerUA.includes(indicator))) {
      return true
    }

    // Check for sec-ch-ua header patterns indicating headless
    const secChUa = request.headers.get('sec-ch-ua')
    if (secChUa && secChUa.includes('HeadlessChrome')) {
      return true
    }

    return false
  }

  /**
   * Check for suspicious screen resolutions
   */
  private isSuspiciousResolution(resolution: string): boolean {
    const suspiciousResolutions = [
      '0x0', '1x1', '800x600', '1024x768' // Common automation resolutions
    ]
    
    return suspiciousResolutions.includes(resolution)
  }

  /**
   * Calculate initial risk score for new devices
   */
  private calculateInitialRiskScore(
    request: Request, 
    clientData?: BrowserFingerprint
  ): number {
    let score = 0

    // Base score for new device
    score += 20

    // Check user agent
    const userAgent = request.headers.get('user-agent') || ''
    if (this.isSuspiciousUserAgent(userAgent)) {
      score += 40
    }

    // Check for missing browser features
    if (clientData && !clientData.cookieEnabled) {
      score += 30
    }

    // Check timezone
    if (clientData && !clientData.timezone) {
      score += 15
    }

    return Math.min(score, 100)
  }

  /**
   * Get device fingerprint statistics
   */
  getStats(): { total: number; newDevices: number; highRisk: number } {
    const now = Date.now()
    const oneDayAgo = now - (24 * 60 * 60 * 1000)
    
    let newDevices = 0
    let highRisk = 0

    for (const fp of this.fingerprints.values()) {
      if (fp.firstSeen.getTime() > oneDayAgo) {
        newDevices++
      }
      if (fp.riskScore >= 80) {
        highRisk++
      }
    }

    return {
      total: this.fingerprints.size,
      newDevices,
      highRisk
    }
  }
}

// Singleton instance
export const deviceFingerprintService = new DeviceFingerprintService()

// Utility functions
export const generateDeviceFingerprint = (request: Request) =>
  deviceFingerprintService.generateFingerprint(request)

export const generateEnhancedFingerprint = (
  request: Request, 
  clientData?: BrowserFingerprint
) => deviceFingerprintService.generateEnhancedFingerprint(request, clientData)

export const assessDeviceRisk = (
  fingerprint: DeviceFingerprint,
  request: Request,
  phoneNumber?: string
) => deviceFingerprintService.assessDeviceRisk(fingerprint, request, phoneNumber)
