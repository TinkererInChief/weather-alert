import axios, { AxiosError } from 'axios'
import { prisma } from '../prisma'

export interface TsunamiAlert {
  id: string
  eventId: string
  source: string
  alertType: 'watch' | 'advisory' | 'warning' | 'emergency'
  severityLevel: number
  estimatedWaveHeight?: number
  estimatedArrivalTime?: Date
  affectedZones: string[]
  location: string
  rawData: any
  sourceEarthquakeId?: string
}

export class TsunamiService {
  private static instance: TsunamiService
  private processedAlerts: Set<string> = new Set()
  
  // Request throttling / caching
  private lastFetchAt = 0
  private nextAllowedFetchAt = 0
  private backoffMs = 0
  private readonly ttlMs = parseInt(process.env.TSUNAMI_POLL_TTL_MS || '300000', 10) // 5 minutes
  private readonly maxBackoffMs = parseInt(process.env.TSUNAMI_POLL_MAX_BACKOFF_MS || '3600000', 10) // 60 minutes
  private lastSuccessfulAlerts: TsunamiAlert[] = []
  private lastErrorLogAt = 0
  private readonly errorLogIntervalMs = 5 * 60 * 1000
  private noaaLastModified?: string
  private noaaEtag?: string
  private ptwcLastModified?: string
  private ptwcEtag?: string

  static getInstance(): TsunamiService {
    if (!TsunamiService.instance) {
      TsunamiService.instance = new TsunamiService()
    }
    return TsunamiService.instance
  }

  // Fetch alerts from NOAA National Weather Service
  async fetchNOAAAlerts(): Promise<TsunamiAlert[]> {
    try {
      const userAgent = process.env.NWS_USER_AGENT || process.env.EXTERNAL_REQUEST_USER_AGENT || 'weather-alert/1.0 (+https://weather-alert.app; contact@weather-alert.app)'
      const headers: Record<string, string> = {
        'User-Agent': userAgent,
        'Accept': 'application/geo+json'
      }
      if (this.noaaLastModified) headers['If-Modified-Since'] = this.noaaLastModified
      if (this.noaaEtag) headers['If-None-Match'] = this.noaaEtag

      const response = await axios.get('https://api.weather.gov/alerts', {
        params: { event: 'Tsunami' },
        timeout: 10000,
        headers,
        validateStatus: (status) => (status >= 200 && status < 300) || status === 304
      })

      if (response.status === 304) {
        return []
      }

      if (response.data?.features) {
        // Cache conditional headers for next requests
        const lm = (response.headers as any)['last-modified'] as string | undefined
        const et = (response.headers as any)['etag'] as string | undefined
        if (lm) this.noaaLastModified = lm
        if (et) this.noaaEtag = et
        return this.parseNOAAAlerts(response.data.features)
      }

      return []
    } catch (error) {
      throw error
    }
  }

  // Fetch alerts from Pacific Tsunami Warning Center
  async fetchPTWCAlerts(): Promise<TsunamiAlert[]> {
    try {
      // PTWC provides JSON feed
      const userAgent = process.env.PTWC_USER_AGENT || process.env.EXTERNAL_REQUEST_USER_AGENT || 'weather-alert/1.0 (+https://weather-alert.app; contact@weather-alert.app)'
      const headers: Record<string, string> = {
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'Referer': 'https://www.tsunami.gov/'
      }
      if (this.ptwcLastModified) headers['If-Modified-Since'] = this.ptwcLastModified
      if (this.ptwcEtag) headers['If-None-Match'] = this.ptwcEtag

      const response = await axios.get('https://www.tsunami.gov/events_json/events.json', {
        timeout: 10000,
        headers,
        validateStatus: (status) => (status >= 200 && status < 300) || status === 304
      })

      if (response.status === 304) {
        return []
      }

      if (response.data?.events) {
        const lm = (response.headers as any)['last-modified'] as string | undefined
        const et = (response.headers as any)['etag'] as string | undefined
        if (lm) this.ptwcLastModified = lm
        if (et) this.ptwcEtag = et
        return this.parsePTWCAlerts(response.data.events)
      }

      return []
    } catch (error) {
      throw error
    }
  }

  // Parse NOAA alerts from NWS API
  private parseNOAAAlerts(features: any[]): TsunamiAlert[] {
    return features
      .filter(feature => feature.properties?.event?.toLowerCase().includes('tsunami'))
      .map(feature => {
        const props = feature.properties
        const alertType = this.classifyNOAAAlert(props.severity, props.certainty, props.urgency)
        const severityLevel = this.mapAlertTypeToSeverity(alertType)

        return {
          id: `noaa-${props.id}`,
          eventId: props.id,
          source: 'noaa',
          alertType,
          severityLevel,
          estimatedWaveHeight: this.extractWaveHeight(props.description),
          estimatedArrivalTime: this.extractArrivalTime(props.description),
          affectedZones: this.extractAffectedZones(props.areaDesc),
          location: props.areaDesc || 'Unknown location',
          rawData: props,
          sourceEarthquakeId: undefined // Will be linked later if applicable
        } as TsunamiAlert
      })
  }

  // Parse PTWC alerts
  private parsePTWCAlerts(events: any[]): TsunamiAlert[] {
    return events
      .filter(event => event.type?.toLowerCase() === 'tsunami')
      .map(event => {
        const alertType = this.classifyPTWCAlert(event.magnitude, event.depth)
        const severityLevel = this.mapAlertTypeToSeverity(alertType)

        return {
          id: `ptwc-${event.id}`,
          eventId: event.id,
          source: 'ptwc',
          alertType,
          severityLevel,
          estimatedWaveHeight: event.estimatedHeight,
          estimatedArrivalTime: event.arrivalTime ? new Date(event.arrivalTime) : undefined,
          affectedZones: event.regions || [],
          location: event.location || 'Pacific Region',
          rawData: event,
          sourceEarthquakeId: event.sourceEarthquake
        } as TsunamiAlert
      })
  }

  // Classify NOAA alert based on NWS parameters
  private classifyNOAAAlert(severity: string, certainty: string, urgency: string): TsunamiAlert['alertType'] {
    const sev = severity?.toLowerCase() || ''
    const cert = certainty?.toLowerCase() || ''
    const urg = urgency?.toLowerCase() || ''

    // Emergency: extreme severity + high certainty
    if (sev.includes('extreme') && cert.includes('observed')) {
      return 'emergency'
    }

    // Warning: severe + likely/observed
    if (sev.includes('severe') && (cert.includes('likely') || cert.includes('observed'))) {
      return 'warning'
    }

    // Advisory: moderate severity
    if (sev.includes('moderate')) {
      return 'advisory'
    }

    // Default to watch for minor or unknown
    return 'watch'
  }

  // Classify PTWC alert based on earthquake parameters
  private classifyPTWCAlert(magnitude?: number, depth?: number): TsunamiAlert['alertType'] {
    if (!magnitude) return 'watch'

    // Very large shallow earthquake
    if (magnitude >= 8.5 && (depth || 0) <= 35) {
      return 'emergency'
    }

    // Large shallow earthquake  
    if (magnitude >= 7.5 && (depth || 0) <= 50) {
      return 'warning'
    }

    // Moderate earthquake with tsunami potential
    if (magnitude >= 7.0) {
      return 'advisory'
    }

    return 'watch'
  }

  // Map alert type to severity level (1-5)
  private mapAlertTypeToSeverity(alertType: string): number {
    const mapping: Record<string, number> = {
      'emergency': 5,
      'warning': 4,
      'advisory': 3,
      'watch': 2,
      'information': 1
    }
    return mapping[alertType] || 2
  }

  // Extract wave height from description text
  private extractWaveHeight(description: string): number | undefined {
    if (!description) return undefined

    // Look for patterns like "3 meters", "15 feet", "2m waves"
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(?:meter|metre|m)\s*(?:wave|high)/i,
      /(\d+(?:\.\d+)?)\s*(?:feet|ft)\s*(?:wave|high)/i,
      /wave.*?(\d+(?:\.\d+)?)\s*(?:meter|metre|m)/i
    ]

    for (const pattern of patterns) {
      const match = description.match(pattern)
      if (match) {
        const value = parseFloat(match[1])
        // Convert feet to meters if needed
        return pattern.toString().includes('feet|ft') ? value * 0.3048 : value
      }
    }

    return undefined
  }

  // Extract arrival time from description
  private extractArrivalTime(description: string): Date | undefined {
    if (!description) return undefined

    // Look for time patterns
    const timePatterns = [
      /arrival.*?(\d{1,2}:\d{2})\s*(AM|PM)/i,
      /(\d{1,2}:\d{2})\s*(UTC|GMT)/i,
      /ETA.*?(\d{1,2}:\d{2})/i
    ]

    for (const pattern of timePatterns) {
      const match = description.match(pattern)
      if (match) {
        try {
          // Parse relative to current date
          const timeStr = match[1]
          const [hours, minutes] = timeStr.split(':').map(Number)
          
          const now = new Date()
          const arrival = new Date(now)
          arrival.setHours(hours, minutes, 0, 0)
          
          // If time has passed today, assume it's tomorrow
          if (arrival < now) {
            arrival.setDate(arrival.getDate() + 1)
          }
          
          return arrival
        } catch (e) {
          // Continue to next pattern
        }
      }
    }

    return undefined
  }

  // Extract affected zones/regions
  private extractAffectedZones(areaDesc: string): string[] {
    if (!areaDesc) return []

    // Split by common separators and clean up
    return areaDesc
      .split(/[;,]/)
      .map(zone => zone.trim())
      .filter(zone => zone.length > 0)
  }

  // Get new tsunami alerts (not processed yet)
  async getNewTsunamiAlerts(): Promise<TsunamiAlert[]> {
    const now = Date.now()
    if (now < this.nextAllowedFetchAt) {
      // Respect backoff/TTL; do not hit upstream
      return []
    }

    try {
      const settled = await Promise.allSettled([
        this.fetchNOAAAlerts(),
        this.fetchPTWCAlerts()
      ])

      const noaaAlerts = settled[0].status === 'fulfilled' ? settled[0].value : []
      const ptwcAlerts = settled[1].status === 'fulfilled' ? settled[1].value : []

      const allAlerts = [...noaaAlerts, ...ptwcAlerts]

      // Filter out already processed alerts
      const newAlerts = allAlerts.filter(alert => !this.processedAlerts.has(alert.id))

      // Mark as processed
      newAlerts.forEach(alert => this.processedAlerts.add(alert.id))

      this.lastSuccessfulAlerts = allAlerts
      this.lastFetchAt = now
      this.backoffMs = 0
      this.nextAllowedFetchAt = now + this.ttlMs

      return newAlerts
    } catch (wrapped) {
      // Determine if this is an Axios error and status code (best-effort)
      const err = (wrapped as any)?.error ?? wrapped
      const src = (wrapped as any)?.source || 'unknown'
      const status = (err as AxiosError)?.response?.status

      // 403/429 -> exponential backoff
      if (status === 403 || status === 429) {
        this.backoffMs = Math.min(this.backoffMs ? this.backoffMs * 2 : 10 * 60 * 1000, this.maxBackoffMs)
        this.nextAllowedFetchAt = now + this.backoffMs
        if (now - this.lastErrorLogAt >= this.errorLogIntervalMs) {
          console.warn(`Tsunami upstream ${src} returned ${status}. Backing off for ${Math.round(this.backoffMs / 60000)}m.`)
          this.lastErrorLogAt = now
        }
      } else {
        // Generic failure -> respect normal TTL to avoid hammering
        this.nextAllowedFetchAt = now + this.ttlMs
        if (now - this.lastErrorLogAt >= this.errorLogIntervalMs) {
          console.warn(`Tsunami upstream ${src} failed. Using TTL ${Math.round(this.ttlMs / 60000)}m before retry.`)
          this.lastErrorLogAt = now
        }
      }

      return []
    }
  }

  // Store tsunami alert in database
  async storeTsunamiAlert(alert: TsunamiAlert): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO "tsunami_alerts" (
          id, "eventId", source, "alertType", "severityLevel",
          "estimatedWaveHeight", "estimatedArrivalTime", "affectedZones",
          "sourceEarthquakeId", "rawData", "createdAt"
        ) VALUES (
          ${alert.id}, ${alert.eventId}, ${alert.source}, ${alert.alertType}, ${alert.severityLevel},
          ${alert.estimatedWaveHeight ?? null}, ${alert.estimatedArrivalTime ?? null}, ${alert.affectedZones},
          ${alert.sourceEarthquakeId ?? null}, ${alert.rawData}, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          "alertType" = EXCLUDED."alertType",
          "severityLevel" = EXCLUDED."severityLevel",
          "estimatedWaveHeight" = EXCLUDED."estimatedWaveHeight",
          "estimatedArrivalTime" = EXCLUDED."estimatedArrivalTime",
          "affectedZones" = EXCLUDED."affectedZones",
          "rawData" = EXCLUDED."rawData"
      `
    } catch (error) {
      console.error('Error storing tsunami alert:', error)
      throw error
    }
  }

  // Format tsunami alert for notifications
  formatTsunamiAlert(alert: TsunamiAlert): string {
    const severityEmoji = ['ℹ️', '🔔', '⚠️', '🚨', '🆘'][alert.severityLevel - 1] || '📢'
    
    let message = `${severityEmoji} TSUNAMI ${alert.alertType.toUpperCase()}\n`
    message += `Location: ${alert.location}\n`
    
    if (alert.estimatedWaveHeight) {
      message += `Wave Height: ${alert.estimatedWaveHeight}m\n`
    }
    
    if (alert.estimatedArrivalTime) {
      message += `ETA: ${alert.estimatedArrivalTime.toLocaleString()}\n`
    }
    
    // Add action instructions based on severity
    if (alert.severityLevel >= 4) {
      message += '\n🆘 EVACUATE IMMEDIATELY to high ground!'
    } else if (alert.severityLevel >= 3) {
      message += '\n⚠️ Move away from coast and beaches.'
    } else {
      message += '\n🔔 Stay alert and monitor updates.'
    }
    
    message += `\nSource: ${alert.source.toUpperCase()}`
    
    return message
  }

  // Check if earthquake could trigger tsunami
  async analyzeEarthquakeForTsunami(earthquake: any): Promise<boolean> {
    const { magnitude, depth, latitude, longitude } = earthquake
    
    // Basic tsunami risk criteria
    const isUnderwater = this.isLocationUnderwater(latitude, longitude)
    const isShallow = (depth || 0) <= 70 // km
    const isStrong = magnitude >= 7.0
    
    return isUnderwater && isShallow && isStrong
  }

  // Check if coordinates are underwater (ocean/sea)
  private isLocationUnderwater(lat: number, lon: number): boolean {
    // Simplified check - in production, use a proper ocean/land dataset
    // This is a rough approximation for major ocean areas
    
    // Pacific Ring of Fire zones (high tsunami risk)
    const pacificZones = [
      { minLat: -60, maxLat: 60, minLon: 100, maxLon: -60 }, // Pacific Ocean
      { minLat: 10, maxLat: 50, minLon: 140, maxLon: 180 },   // Northwest Pacific
    ]
    
    // Indian Ocean
    const indianOcean = { minLat: -60, maxLat: 30, minLon: 20, maxLon: 120 }
    
    // Atlantic Ocean (parts)
    const atlantic = { minLat: -60, maxLat: 70, minLon: -80, maxLon: 20 }
    
    // Check if coordinates fall in any ocean zone
    for (const zone of [...pacificZones, indianOcean, atlantic]) {
      if (lat >= zone.minLat && lat <= zone.maxLat && 
          lon >= zone.minLon && lon <= zone.maxLon) {
        return true
      }
    }
    
    return false
  }
}
