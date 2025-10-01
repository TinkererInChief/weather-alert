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
  private readonly eventsUrl = 'https://www.tsunami.gov/events_json/events.json'
  
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
      const response = await fetch(this.eventsUrl, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EmergencyAlertSystem/1.0'
        }
      })
      
      if (!response.ok) {
        throw new Error(`PTWC fetch failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      this.recordSuccess()
      this.recordResponseTime(Date.now() - fetchStartTime)
      
      return this.convertPTWCToStandard(data)
      
    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error('Unknown error'))
      throw error
    }
  }
  
  private convertPTWCToStandard(data: any): TsunamiAlert[] {
    const alerts: TsunamiAlert[] = []
    
    if (!data || !Array.isArray(data)) {
      return alerts
    }
    
    for (const event of data) {
      try {
        // PTWC event structure
        const alert: TsunamiAlert = {
          id: `ptwc_${event.id || event.eventID || Date.now()}`,
          source: 'PTWC',
          title: event.title || event.name || 'Tsunami Event',
          category: this.determineCategory(event),
          severity: this.determineSeverity(event),
          latitude: parseFloat(event.latitude || event.lat || 0),
          longitude: parseFloat(event.longitude || event.lon || 0),
          affectedRegions: this.parseAffectedRegions(event),
          issuedAt: new Date(event.issuedTime || event.time || Date.now()),
          expiresAt: event.expiresTime ? new Date(event.expiresTime) : undefined,
          description: event.description || event.summary || '',
          instructions: event.instructions || event.guidance || '',
          rawData: event
        }
        
        alerts.push(alert)
      } catch (err) {
        console.warn('Failed to parse PTWC alert:', err)
        continue
      }
    }
    
    return alerts
  }
  
  private determineCategory(event: any): string {
    const type = (event.type || event.category || '').toLowerCase()
    
    if (type.includes('warning')) return 'WARNING'
    if (type.includes('watch')) return 'WATCH'
    if (type.includes('advisory')) return 'ADVISORY'
    if (type.includes('information')) return 'INFORMATION'
    
    // Check severity indicators
    if (event.severity === 'Extreme' || event.urgency === 'Immediate') {
      return 'WARNING'
    }
    if (event.severity === 'Severe') {
      return 'WATCH'
    }
    
    return 'INFORMATION'
  }
  
  private determineSeverity(event: any): number {
    const category = this.determineCategory(event)
    
    switch (category) {
      case 'WARNING': return 5
      case 'WATCH': return 4
      case 'ADVISORY': return 3
      case 'INFORMATION': return 2
      default: return 1
    }
  }
  
  private parseAffectedRegions(event: any): string[] {
    const regions: string[] = []
    
    // PTWC might provide affected areas in various formats
    if (event.affectedAreas && Array.isArray(event.affectedAreas)) {
      regions.push(...event.affectedAreas)
    }
    
    if (event.regions && Array.isArray(event.regions)) {
      regions.push(...event.regions)
    }
    
    if (event.area && typeof event.area === 'string') {
      regions.push(event.area)
    }
    
    if (event.areaDesc && typeof event.areaDesc === 'string') {
      regions.push(event.areaDesc)
    }
    
    // If no regions specified, infer from coordinates
    if (regions.length === 0) {
      const lat = parseFloat(event.latitude || event.lat || 0)
      const lon = parseFloat(event.longitude || event.lon || 0)
      regions.push(this.inferRegionFromCoordinates(lat, lon))
    }
    
    return [...new Set(regions)] // Remove duplicates
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
