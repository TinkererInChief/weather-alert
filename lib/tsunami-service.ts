import { prisma } from '@/lib/prisma'

// Tsunami Alert Levels based on NOAA classifications
export enum TsunamiAlertLevel {
  INFORMATION = 'information',
  ADVISORY = 'advisory', 
  WATCH = 'watch',
  WARNING = 'warning',
  EMERGENCY = 'emergency'
}

// Tsunami data source types
export enum TsunamiSource {
  NTWC = 'ntwc', // National Tsunami Warning Center
  PTWC = 'ptwc', // Pacific Tsunami Warning Center
  JMA = 'jma',   // Japan Meteorological Agency
  IOC = 'ioc'    // UNESCO-IOC
}

// Tsunami threat assessment result
export interface TsunamiThreat {
  level: TsunamiAlertLevel
  confidence: number // 0-1 scale
  estimatedWaveHeight?: number // meters
  estimatedArrivalTime?: Date
  affectedRegions: string[]
  sourceEarthquake?: {
    magnitude: number
    depth: number
    latitude: number
    longitude: number
    location: string
  }
}

// Raw tsunami alert data from NOAA feeds
export interface RawTsunamiAlert {
  id: string
  title: string
  updated: string
  category: 'Information' | 'Advisory' | 'Watch' | 'Warning'
  urgency: string
  severity: string
  certainty: string
  location: string
  latitude: number
  longitude: number
  magnitude?: number
  depth?: string
  description: string
  instruction: string
  expires?: string
  web?: string
}

export class TsunamiService {
  // NOAA data feed URLs
  private static readonly NTWC_ATOM_FEED = 'https://www.tsunami.gov/events/xml/PAAQAtom.xml'
  private static readonly PTWC_ATOM_FEED = 'https://www.tsunami.gov/events/xml/PHEBAtom.xml'
  private static readonly NTWC_CAP_FEED = 'https://www.tsunami.gov/events/xml/PAAQCAP.xml'
  private static readonly PTWC_CAP_FEED = 'https://www.tsunami.gov/events/xml/PHEBCAP.xml'

  /**
   * Fetch latest tsunami alerts from all sources
   */
  static async fetchLatestAlerts(): Promise<RawTsunamiAlert[]> {
    const alerts: RawTsunamiAlert[] = []

    try {
      // Fetch from NTWC (National Tsunami Warning Center)
      console.log('🌊 Fetching NTWC tsunami alerts...')
      const ntwcAlerts = await this.fetchFromAtomFeed(this.NTWC_ATOM_FEED, TsunamiSource.NTWC)
      alerts.push(...ntwcAlerts)

      // Fetch from PTWC (Pacific Tsunami Warning Center)  
      console.log('🌊 Fetching PTWC tsunami alerts...')
      const ptwcAlerts = await this.fetchFromAtomFeed(this.PTWC_ATOM_FEED, TsunamiSource.PTWC)
      alerts.push(...ptwcAlerts)

      console.log(`✅ Retrieved ${alerts.length} tsunami alerts`)
      return alerts

    } catch (error) {
      console.error('❌ Error fetching tsunami alerts:', error)
      throw new Error(`Failed to fetch tsunami alerts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse ATOM feed from NOAA tsunami warning centers
   */
  private static async fetchFromAtomFeed(feedUrl: string, source: TsunamiSource): Promise<RawTsunamiAlert[]> {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Emergency-Alert-System/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const xmlText = await response.text()
      return this.parseAtomXML(xmlText, source)

    } catch (error) {
      console.error(`❌ Error fetching from ${feedUrl}:`, error)
      return []
    }
  }

  /**
   * Parse ATOM XML format from NOAA feeds
   */
  private static parseAtomXML(xmlText: string, source: TsunamiSource): RawTsunamiAlert[] {
    const alerts: RawTsunamiAlert[] = []

    try {
      // Basic XML parsing for ATOM entries
      const entryRegex = /<entry>(.*?)<\/entry>/gs
      const entries = xmlText.match(entryRegex) || []

      for (const entry of entries) {
        try {
          const alert = this.parseAtomEntry(entry, source)
          if (alert) {
            alerts.push(alert)
          }
        } catch (error) {
          console.error('❌ Error parsing ATOM entry:', error)
        }
      }

    } catch (error) {
      console.error('❌ Error parsing ATOM XML:', error)
    }

    return alerts
  }

  /**
   * Parse individual ATOM entry
   */
  private static parseAtomEntry(entryXml: string, source: TsunamiSource): RawTsunamiAlert | null {
    try {
      const extractValue = (tag: string): string => {
        const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's')
        const match = entryXml.match(regex)
        return match ? match[1].trim() : ''
      }

      const extractAttribute = (tag: string, attr: string): string => {
        const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 's')
        const match = entryXml.match(regex)
        return match ? match[1].trim() : ''
      }

      // Extract basic info
      const title = extractValue('title')
      const updated = extractValue('updated')
      const id = extractValue('id')
      
      // Extract geographic coordinates
      const latitude = parseFloat(extractValue('geo:lat')) || 0
      const longitude = parseFloat(extractValue('geo:long')) || 0

      // Extract summary HTML content
      const summaryHtml = extractValue('summary')
      
      // Parse category from summary (Information, Advisory, Watch, Warning)
      const categoryMatch = summaryHtml.match(/<strong>Category:<\/strong>\s*(\w+)/i)
      const category = categoryMatch ? categoryMatch[1] as any : 'Information'

      // Extract magnitude if present
      const magnitudeMatch = summaryHtml.match(/<strong>Preliminary Magnitude:<\/strong>\s*([\d.]+)/i)
      const magnitude = magnitudeMatch ? parseFloat(magnitudeMatch[1]) : undefined

      // Extract depth if present  
      const depthMatch = summaryHtml.match(/Depth:\s*([^<\n]+)/i)
      const depth = depthMatch ? depthMatch[1].trim() : undefined

      // Extract description from summary
      const description = summaryHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

      // Create alert object
      const alert: RawTsunamiAlert = {
        id: `${source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title,
        updated,
        category,
        urgency: this.mapCategoryToUrgency(category),
        severity: this.mapCategoryToSeverity(category), 
        certainty: 'Possible',
        location: title,
        latitude,
        longitude,
        magnitude,
        depth,
        description,
        instruction: this.extractInstruction(summaryHtml)
      }

      return alert

    } catch (error) {
      console.error('❌ Error parsing ATOM entry:', error)
      return null
    }
  }

  /**
   * Map tsunami category to urgency level
   */
  private static mapCategoryToUrgency(category: string): string {
    switch (category.toLowerCase()) {
      case 'warning': return 'Immediate'
      case 'watch': return 'Expected'
      case 'advisory': return 'Expected'  
      case 'information': return 'Future'
      default: return 'Unknown'
    }
  }

  /**
   * Map tsunami category to severity level
   */
  private static mapCategoryToSeverity(category: string): string {
    switch (category.toLowerCase()) {
      case 'warning': return 'Extreme'
      case 'watch': return 'Severe'
      case 'advisory': return 'Moderate'
      case 'information': return 'Minor'
      default: return 'Unknown'
    }
  }

  /**
   * Extract instruction text from summary HTML
   */
  private static extractInstruction(summaryHtml: string): string {
    const instructionMatch = summaryHtml.match(/<b>Note:<\/b>\s*([^<]+)/i)
    return instructionMatch ? instructionMatch[1].trim() : 'Monitor conditions and follow local guidance.'
  }

  /**
   * Assess tsunami threat level based on earthquake and alert data
   */
  static assessTsunamiThreat(earthquake: any, existingAlerts: RawTsunamiAlert[]): TsunamiThreat {
    // Base threat assessment on earthquake parameters
    let level = TsunamiAlertLevel.INFORMATION
    let confidence = 0.1

    // Check if there are existing tsunami alerts for this region
    const relevantAlerts = existingAlerts.filter(alert => 
      this.isNearLocation(earthquake.latitude, earthquake.longitude, alert.latitude, alert.longitude, 500) // 500km radius
    )

    if (relevantAlerts.length > 0) {
      const highestAlert = relevantAlerts.sort((a, b) => 
        this.getAlertPriority(b.category) - this.getAlertPriority(a.category)
      )[0]

      level = this.mapCategoryToAlertLevel(highestAlert.category)
      confidence = 0.8
    } else {
      // Assess based on earthquake characteristics
      const magnitude = earthquake.magnitude || 0
      const depth = earthquake.depth || 0

      // Tsunami generation criteria (simplified)
      if (magnitude >= 7.5 && depth <= 70) {
        level = TsunamiAlertLevel.WARNING
        confidence = 0.7
      } else if (magnitude >= 7.0 && depth <= 100) {
        level = TsunamiAlertLevel.WATCH  
        confidence = 0.6
      } else if (magnitude >= 6.5 && depth <= 50) {
        level = TsunamiAlertLevel.ADVISORY
        confidence = 0.4
      }
    }

    return {
      level,
      confidence,
      affectedRegions: [earthquake.location],
      sourceEarthquake: {
        magnitude: earthquake.magnitude,
        depth: earthquake.depth,
        latitude: earthquake.latitude,
        longitude: earthquake.longitude,
        location: earthquake.location
      }
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private static isNearLocation(lat1: number, lon1: number, lat2: number, lon2: number, radiusKm: number): boolean {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c

    return distance <= radiusKm
  }

  /**
   * Get numeric priority for alert categories
   */
  private static getAlertPriority(category: string): number {
    switch (category.toLowerCase()) {
      case 'warning': return 4
      case 'watch': return 3
      case 'advisory': return 2
      case 'information': return 1
      default: return 0
    }
  }

  /**
   * Map NOAA category to internal alert level
   */
  private static mapCategoryToAlertLevel(category: string): TsunamiAlertLevel {
    switch (category.toLowerCase()) {
      case 'warning': return TsunamiAlertLevel.WARNING
      case 'watch': return TsunamiAlertLevel.WATCH
      case 'advisory': return TsunamiAlertLevel.ADVISORY
      case 'information': return TsunamiAlertLevel.INFORMATION
      default: return TsunamiAlertLevel.INFORMATION
    }
  }

  /**
   * Store tsunami alert in database
   */
  static async storeTsunamiAlert(alert: RawTsunamiAlert, threat: TsunamiThreat): Promise<void> {
    try {
      await prisma.tsunamiAlert.create({
        data: {
          eventId: alert.id, // Use alert ID as event ID
          source: 'noaa',
          alertType: threat.level,
          severityLevel: this.getAlertPriority(alert.category),
          estimatedWaveHeight: threat.estimatedWaveHeight,
          estimatedArrivalTime: threat.estimatedArrivalTime,
          affectedZones: threat.affectedRegions,
          rawData: {
            id: alert.id,
            title: alert.title,
            category: alert.category,
            urgency: alert.urgency,
            severity: alert.severity,
            description: alert.description,
            instruction: alert.instruction,
            location: alert.location,
            coordinates: {
              latitude: alert.latitude,
              longitude: alert.longitude
            }
          }
        }
      })

      console.log(`✅ Stored tsunami alert: ${alert.title} (${threat.level})`)

    } catch (error) {
      console.error('❌ Error storing tsunami alert:', error)
      throw error
    }
  }
}
