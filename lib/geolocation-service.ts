/**
 * IP Geolocation Service for Regional Security Controls
 * Provides IP-based location detection and risk assessment
 */

import { log } from './logger'
import { executeWithCircuitBreaker } from './circuit-breaker'
import { getSecret } from './secrets'

export interface GeolocationData {
  ip: string
  country: string
  countryCode: string
  region: string
  regionCode: string
  city: string
  latitude: number
  longitude: number
  timezone: string
  isp: string
  organization: string
  asn: string
  isProxy: boolean
  isVpn: boolean
  isTor: boolean
  isDataCenter: boolean
  threatLevel: 'low' | 'medium' | 'high'
  riskScore: number
}

export interface GeolocationPolicy {
  allowedCountries: string[]
  blockedCountries: string[]
  allowedRegions: string[]
  blockedRegions: string[]
  blockProxies: boolean
  blockVpns: boolean
  blockTor: boolean
  blockDataCenters: boolean
  maxRiskScore: number
}

export interface GeolocationResult {
  allowed: boolean
  location: GeolocationData | null
  reason: string
  riskLevel: 'low' | 'medium' | 'high'
  policy: 'allow' | 'block' | 'monitor'
}

class GeolocationService {
  private cache = new Map<string, { data: GeolocationData; timestamp: number }>()
  private readonly cacheTimeout = 3600000 // 1 hour
  
  // Default policy for emergency alert system
  private readonly defaultPolicy: GeolocationPolicy = {
    // Allow most countries but block known high-risk ones
    allowedCountries: [], // Empty means allow all except blocked
    blockedCountries: [
      'CN', 'RU', 'KP', 'IR', 'SY', // High-risk countries
      'MM', 'AF', 'IQ' // Additional restricted regions
    ],
    allowedRegions: [],
    blockedRegions: [],
    blockProxies: true,
    blockVpns: true,
    blockTor: true,
    blockDataCenters: true,
    maxRiskScore: 70
  }

  /**
   * Get geolocation data for an IP address
   */
  async getGeolocation(ip: string): Promise<GeolocationData | null> {
    try {
      // Check cache first
      const cached = this.cache.get(ip)
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }

      // Skip for local/private IPs
      if (this.isPrivateIP(ip)) {
        const localData: GeolocationData = {
          ip,
          country: 'Local',
          countryCode: 'LO',
          region: 'Local',
          regionCode: 'LO',
          city: 'Local',
          latitude: 0,
          longitude: 0,
          timezone: 'UTC',
          isp: 'Local',
          organization: 'Local',
          asn: 'Local',
          isProxy: false,
          isVpn: false,
          isTor: false,
          isDataCenter: false,
          threatLevel: 'low',
          riskScore: 0
        }
        return localData
      }

      // Try multiple geolocation services with circuit breaker
      const geoData = await this.fetchGeolocationData(ip)
      
      if (geoData) {
        // Cache the result
        this.cache.set(ip, { data: geoData, timestamp: Date.now() })
        
        log.info('IP geolocation lookup successful', {
          ip: this.maskIp(ip),
          country: geoData.country,
          countryCode: geoData.countryCode,
          threatLevel: geoData.threatLevel,
          riskScore: geoData.riskScore
        })
      }

      return geoData

    } catch (error) {
      log.error('Geolocation lookup failed', error, {
        ip: this.maskIp(ip)
      })
      return null
    }
  }

  /**
   * Check if IP is allowed based on geolocation policy
   */
  async checkIPAccess(
    ip: string, 
    customPolicy?: Partial<GeolocationPolicy>
  ): Promise<GeolocationResult> {
    const policy = { ...this.defaultPolicy, ...customPolicy }
    
    try {
      const location = await this.getGeolocation(ip)
      
      if (!location) {
        // If we can't determine location, apply conservative policy
        log.warn('Unable to determine IP location', {
          ip: this.maskIp(ip),
          action: 'geolocation_check_failed'
        })
        
        return {
          allowed: !policy.blockProxies, // Conservative: block if configured to block proxies
          location: null,
          reason: 'Unable to determine location',
          riskLevel: 'medium',
          policy: 'monitor'
        }
      }

      // Apply policy rules
      const result = this.applyPolicy(location, policy)
      
      // Log security events for blocked or high-risk access
      if (!result.allowed || result.riskLevel === 'high') {
        log.security('IP geolocation access control', {
          success: result.allowed,
          action: 'geolocation_access_check',
          ip: this.maskIp(ip),
          metadata: {
            country: location.country,
            countryCode: location.countryCode,
            reason: result.reason,
            riskLevel: result.riskLevel,
            riskScore: location.riskScore,
            isProxy: location.isProxy,
            isVpn: location.isVpn,
            isTor: location.isTor,
            isDataCenter: location.isDataCenter
          }
        })
      }

      return result

    } catch (error) {
      log.error('IP access check failed', error, {
        ip: this.maskIp(ip)
      })

      // Fail open for emergency services
      return {
        allowed: true,
        location: null,
        reason: 'Geolocation service error - allowing access',
        riskLevel: 'medium',
        policy: 'allow'
      }
    }
  }

  /**
   * Apply geolocation policy to determine access
   */
  private applyPolicy(location: GeolocationData, policy: GeolocationPolicy): GeolocationResult {
    const reasons: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' = 'low'

    // Check country restrictions
    if (policy.blockedCountries.includes(location.countryCode)) {
      reasons.push(`Country ${location.country} is blocked`)
      riskLevel = 'high'
    }

    if (policy.allowedCountries.length > 0 && !policy.allowedCountries.includes(location.countryCode)) {
      reasons.push(`Country ${location.country} is not in allow list`)
      riskLevel = 'high'
    }

    // Check region restrictions
    if (policy.blockedRegions.includes(location.regionCode)) {
      reasons.push(`Region ${location.region} is blocked`)
      riskLevel = 'high'
    }

    // Check proxy/VPN/Tor
    if (policy.blockProxies && location.isProxy) {
      reasons.push('Proxy detected')
      riskLevel = 'high'
    }

    if (policy.blockVpns && location.isVpn) {
      reasons.push('VPN detected')
      riskLevel = 'high'
    }

    if (policy.blockTor && location.isTor) {
      reasons.push('Tor exit node detected')
      riskLevel = 'high'
    }

    if (policy.blockDataCenters && location.isDataCenter) {
      reasons.push('Data center IP detected')
      riskLevel = location.riskScore > 50 ? 'high' : 'medium'
    }

    // Check risk score
    if (location.riskScore > policy.maxRiskScore) {
      reasons.push(`High risk score: ${location.riskScore}`)
      riskLevel = 'high'
    }

    const allowed = reasons.length === 0
    const reason = allowed ? 'Access allowed' : reasons.join(', ')

    // Determine policy action
    let policyAction: 'allow' | 'block' | 'monitor'
    if (allowed) {
      policyAction = 'allow'
    } else if (riskLevel === 'high') {
      policyAction = 'block'
    } else {
      policyAction = 'monitor'
    }

    return {
      allowed,
      location,
      reason,
      riskLevel,
      policy: policyAction
    }
  }

  /**
   * Fetch geolocation data from external service
   */
  private async fetchGeolocationData(ip: string): Promise<GeolocationData | null> {
    // Try multiple free services for redundancy
    const services = [
      () => this.fetchFromIPAPI(ip),
      () => this.fetchFromIPInfo(ip),
      () => this.fetchFromFreeGeoIP(ip)
    ]

    for (const service of services) {
      try {
        const data = await executeWithCircuitBreaker('geolocation', service)
        if (data) return data
      } catch (error) {
        log.warn('Geolocation service failed, trying next', {
          ip: this.maskIp(ip),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return null
  }

  /**
   * Fetch from ip-api.com (free service)
   */
  private async fetchFromIPAPI(ip: string): Promise<GeolocationData | null> {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,proxy,hosting,query`)
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    if (data.status !== 'success') return null

    return {
      ip: data.query,
      country: data.country,
      countryCode: data.countryCode,
      region: data.regionName,
      regionCode: data.region,
      city: data.city,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
      isp: data.isp,
      organization: data.org,
      asn: data.as,
      isProxy: data.proxy || false,
      isVpn: false, // ip-api doesn't provide this
      isTor: false, // ip-api doesn't provide this
      isDataCenter: data.hosting || false,
      threatLevel: this.calculateThreatLevel(data),
      riskScore: this.calculateRiskScore(data)
    }
  }

  /**
   * Fetch from ipinfo.io (free tier available)
   */
  private async fetchFromIPInfo(ip: string): Promise<GeolocationData | null> {
    const token = getSecret('IPINFO_TOKEN', '')
    const url = token 
      ? `https://ipinfo.io/${ip}?token=${token}`
      : `https://ipinfo.io/${ip}`

    const response = await fetch(url)
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    if (data.bogon) return null // Bogon IP

    const [lat, lon] = (data.loc || '0,0').split(',').map(Number)
    const [city, region] = (data.region || '').split(', ')

    return {
      ip: data.ip,
      country: data.country,
      countryCode: data.country,
      region: region || data.region || '',
      regionCode: data.region || '',
      city: data.city || city || '',
      latitude: lat,
      longitude: lon,
      timezone: data.timezone || '',
      isp: data.org || '',
      organization: data.org || '',
      asn: data.org || '',
      isProxy: false, // ipinfo doesn't provide this in free tier
      isVpn: false,
      isTor: false,
      isDataCenter: (data.org || '').toLowerCase().includes('hosting') || 
                   (data.org || '').toLowerCase().includes('cloud') ||
                   (data.org || '').toLowerCase().includes('datacenter'),
      threatLevel: this.calculateThreatLevel(data),
      riskScore: this.calculateRiskScore(data)
    }
  }

  /**
   * Fetch from freegeoip.app (backup service)
   */
  private async fetchFromFreeGeoIP(ip: string): Promise<GeolocationData | null> {
    const response = await fetch(`https://freegeoip.app/json/${ip}`)
    
    if (!response.ok) return null
    
    const data = await response.json()

    return {
      ip: data.ip,
      country: data.country_name,
      countryCode: data.country_code,
      region: data.region_name,
      regionCode: data.region_code,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.time_zone,
      isp: '',
      organization: '',
      asn: '',
      isProxy: false,
      isVpn: false,
      isTor: false,
      isDataCenter: false,
      threatLevel: this.calculateThreatLevel(data),
      riskScore: this.calculateRiskScore(data)
    }
  }

  /**
   * Calculate threat level based on location data
   */
  private calculateThreatLevel(data: any): 'low' | 'medium' | 'high' {
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR', 'SY']
    const mediumRiskCountries = ['PK', 'BD', 'VN', 'ID']

    const countryCode = data.countryCode || data.country_code
    
    if (highRiskCountries.includes(countryCode)) return 'high'
    if (mediumRiskCountries.includes(countryCode)) return 'medium'
    if (data.proxy || data.hosting) return 'medium'
    
    return 'low'
  }

  /**
   * Calculate numerical risk score
   */
  private calculateRiskScore(data: any): number {
    let score = 0
    
    const countryCode = data.countryCode || data.country_code
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR', 'SY']
    const mediumRiskCountries = ['PK', 'BD', 'VN', 'ID']

    if (highRiskCountries.includes(countryCode)) score += 60
    else if (mediumRiskCountries.includes(countryCode)) score += 30

    if (data.proxy) score += 40
    if (data.hosting) score += 30
    
    const org = (data.org || data.isp || '').toLowerCase()
    if (org.includes('hosting') || org.includes('cloud') || org.includes('vps')) {
      score += 25
    }

    return Math.min(score, 100)
  }

  /**
   * Check if IP is private/local
   */
  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ]

    return privateRanges.some(range => range.test(ip)) || ip === 'localhost'
  }

  /**
   * Mask IP for logging
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
   * Get geolocation service statistics
   */
  getStats(): { cacheSize: number; hitRate: number; blockedCountries: number } {
    return {
      cacheSize: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
      blockedCountries: this.defaultPolicy.blockedCountries.length
    }
  }
}

// Singleton instance
export const geolocationService = new GeolocationService()

// Utility functions
export const getGeolocation = (ip: string) => geolocationService.getGeolocation(ip)
export const checkIPAccess = (ip: string, policy?: Partial<GeolocationPolicy>) => 
  geolocationService.checkIPAccess(ip, policy)

// Middleware helper
export async function requireGeolocationCheck(
  request: Request,
  policy?: Partial<GeolocationPolicy>
): Promise<GeolocationResult> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown'
             
  return checkIPAccess(ip, policy)
}
