import { BaseDataSource, TsunamiAlert } from './base-source'
import { EarthquakeFeature } from '@/types/earthquake'

/**
 * PTWC (Pacific Tsunami Warning Center) data source
 * Coverage: Pacific Ocean basin
 * Focus: Tsunami warnings and related seismic events
 * Update frequency: Real-time for tsunami threats
 */
export class PTWCSource extends BaseDataSource {
  readonly name = 'PTWC'
  readonly coverage = ['Pacific Ocean', 'Global Tsunami Monitoring']
  readonly updateFrequency = 300 // 5 minutes - tsunamis are less frequent
  
  private readonly baseUrl = 'https://www.tsunami.gov'
  // Use Atom feeds instead of JSON API (which returns 403)
  private readonly atomFeeds = [
    'https://www.tsunami.gov/events/xml/PHEBAtom.xml', // Pacific Basin
    'https://www.tsunami.gov/events/xml/PAAQAtom.xml'  // Alaska/West Coast
  ]
  
  // Backoff/TTL + caching
  private nextAllowedFetchAt = 0
  private backoffMs = 0
  private readonly ttlMs = parseInt(process.env.TSUNAMI_POLL_TTL_MS || '300000', 10) // 5 minutes
  private readonly maxBackoffMs = parseInt(process.env.TSUNAMI_POLL_MAX_BACKOFF_MS || '3600000', 10) // 60 minutes
  private lastErrorLogAt = 0
  private readonly errorLogIntervalMs = 5 * 60 * 1000
  private lastModified: string | undefined
  private etag: string | undefined
  
  protected async healthCheck(): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      throw new Error(`PTWC health check failed: ${response.status}`)
    }
  }
  
  async fetchEarthquakes(): Promise<EarthquakeFeature[]> {
    // PTWC primarily provides tsunami alerts, not general earthquake data
    // Return empty array - use fetchTsunamiAlerts instead
    return []
  }
  
  async fetchTsunamiAlerts(): Promise<TsunamiAlert[]> {
    const fetchStartTime = Date.now()
    
    try {
      const now = Date.now()
      if (now < this.nextAllowedFetchAt) {
        return []
      }

      const userAgent = process.env.PTWC_USER_AGENT || process.env.EXTERNAL_REQUEST_USER_AGENT || 'Mozilla/5.0 (compatible; EmergencyAlertSystem/1.0; +https://weather-alert.app)'
      const headers: Record<string, string> = {
        'Accept': 'application/atom+xml,application/xml,text/xml',
        'User-Agent': userAgent
      }

      // Fetch from both Atom feeds
      const allAlerts: TsunamiAlert[] = []
      
      for (const feedUrl of this.atomFeeds) {
        try {
          const response = await fetch(feedUrl, {
            signal: AbortSignal.timeout(15000),
            headers
          })
          
          if (!response.ok) {
            console.warn(`PTWC feed ${feedUrl} returned ${response.status}`)
            continue
          }
          
          const xmlText = await response.text()
          const feedAlerts = this.parseAtomFeed(xmlText)
          allAlerts.push(...feedAlerts)
        } catch (error) {
          console.warn(`Failed to fetch PTWC feed ${feedUrl}:`, error instanceof Error ? error.message : 'Unknown')
          continue
        }
      }
      
      this.recordSuccess()
      this.recordResponseTime(Date.now() - fetchStartTime)
      this.nextAllowedFetchAt = now + this.ttlMs
      
      // Reset backoff on success
      this.backoffMs = 0
      
      return allAlerts
      
    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error('Unknown error'))
      throw error
    }
  }
  
  /**
   * Parse Atom XML feed from PTWC
   * Uses simple regex-based parsing to avoid XML parser dependency
   */
  private parseAtomFeed(xmlText: string): TsunamiAlert[] {
    const alerts: TsunamiAlert[] = []
    
    try {
      // Extract all <entry> elements
      const entryMatches = xmlText.match(/<entry>([\s\S]*?)<\/entry>/g) || []
      
      for (const entryXml of entryMatches) {
        try {
          const entry = this.parseAtomEntry(entryXml)
          if (entry) alerts.push(entry)
        } catch (err) {
          continue
        }
      }
    } catch (error) {
      console.warn('Failed to parse PTWC Atom feed:', error)
    }
    
    return alerts
  }
  
  private parseAtomEntry(entryXml: string): TsunamiAlert | null {
    try {
      // Extract fields using regex
      const extractTag = (tag: string): string => {
        const match = entryXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i'))
        return match ? match[1].trim() : ''
      }
      
      const extractGeo = (tag: string): string => {
        const match = entryXml.match(new RegExp(`<geo:${tag}>([^<]+)<\/geo:${tag}>`, 'i'))
        return match ? match[1].trim() : '0'
      }
      
      const title = extractTag('title')
      const updated = extractTag('updated')
      const summary = extractTag('summary')
      const id = extractTag('id')
      const lat = parseFloat(extractGeo('lat'))
      const lon = parseFloat(extractGeo('long'))
      
      if (!title || !updated) return null
      
      // Extract category from summary
      const categoryMatch = summary.match(/<strong>Category:<\/strong>\s*([^<]+)/i)
      const category = categoryMatch ? categoryMatch[1].trim() : 'Information'
      
      // Extract magnitude if available
      const magMatch = summary.match(/Magnitude[^>]*>\s*([\d.]+)/i)
      const magnitude = magMatch ? parseFloat(magMatch[1]) : 0
      
      // Extract affected region
      const regionMatch = summary.match(/<strong>Affected Region:<\/strong>\s*([^<]+)/i)
      const affectedRegion = regionMatch ? regionMatch[1].trim() : this.inferRegionFromCoordinates(lat, lon)
      
      // Determine if there's a tsunami threat
      const noThreat = summary.toLowerCase().includes('no tsunami') || 
                       summary.toLowerCase().includes('no threat')
      
      // Skip information-only statements with no threat
      if (category.toLowerCase() === 'information' && noThreat) {
        return null
      }
      
      const alert: TsunamiAlert = {
        id: `ptwc_${id.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
        source: 'PTWC',
        title: title,
        category: this.mapCategoryFromPTWC(category),
        severity: this.mapSeverityFromCategory(category),
        latitude: lat,
        longitude: lon,
        affectedRegions: [affectedRegion],
        issuedAt: new Date(updated),
        expiresAt: new Date(new Date(updated).getTime() + 24 * 60 * 60 * 1000),
        description: this.cleanHtmlFromSummary(summary),
        instructions: this.extractInstructions(summary),
        rawData: { xml: entryXml, category, magnitude, noThreat }
      }
      
      return alert
    } catch (error) {
      return null
    }
  }
  
  private mapCategoryFromPTWC(ptwcCategory: string): string {
    const cat = ptwcCategory.toLowerCase()
    if (cat.includes('warning')) return 'WARNING'
    if (cat.includes('watch')) return 'WATCH'
    if (cat.includes('advisory')) return 'ADVISORY'
    return 'INFORMATION'
  }
  
  private mapSeverityFromCategory(category: string): number {
    const cat = category.toLowerCase()
    if (cat.includes('warning')) return 4
    if (cat.includes('watch')) return 3
    if (cat.includes('advisory')) return 3
    return 2
  }
  
  private cleanHtmlFromSummary(summary: string): string {
    return summary
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500)
  }
  
  private extractInstructions(summary: string): string {
    // Extract key instructions from summary
    if (summary.toLowerCase().includes('evacuate')) {
      return 'Evacuate coastal areas immediately and move to high ground.'
    }
    if (summary.toLowerCase().includes('stay away') || summary.toLowerCase().includes('avoid')) {
      return 'Stay away from beaches, harbors, and coastal areas.'
    }
    if (summary.toLowerCase().includes('no action')) {
      return 'No action required. Monitor for updates.'
    }
    return 'Follow guidance from local emergency management officials.'
  }
  
  private inferRegionFromCoordinates(lat: number, lon: number): string {
    // Simple region inference based on coordinates
    if (lon >= -180 && lon <= -60) {
      if (lat >= 0) return 'North Pacific'
      return 'South Pacific'
    }
    if (lon >= -60 && lon <= 20) {
      if (lat >= 0) return 'North Atlantic'
      return 'South Atlantic'
    }
    if (lon >= 20 && lon <= 180) {
      if (lat >= 0) return 'Western Pacific'
      return 'Indian Ocean'
    }
    return 'Pacific Ocean'
  }
}
