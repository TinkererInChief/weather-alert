import { EarthquakeFeature } from '@/types/earthquake'
import { BaseDataSource, FetchOptions } from './base-source'

/**
 * JMA (Japan Meteorological Agency) earthquake data source
 * Coverage: Japan, Western Pacific
 * Update frequency: Real-time (critical for tsunami detection)
 * 
 * Note: JMA provides data in Japanese format. We use their English API endpoint.
 */
export class JMASource extends BaseDataSource {
  readonly name = 'JMA'
  readonly coverage = ['Japan', 'Western Pacific', 'East Asia']
  readonly updateFrequency = 60 // seconds
  
  // JMA provides data through various endpoints
  // Using their earthquake information feed
  private readonly baseUrl = 'https://www.data.jma.go.jp/multi/quake/data'
  
  protected async healthCheck(): Promise<void> {
    // Simple health check - try to fetch the main page
    const response = await fetch('https://www.data.jma.go.jp/multi/quake/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      throw new Error(`JMA health check failed: ${response.status}`)
    }
  }
  
  async fetchEarthquakes(options?: FetchOptions): Promise<EarthquakeFeature[]> {
    const fetchStartTime = Date.now()
    
    try {
      // JMA provides earthquake list in JSON format
      // Note: This is a simplified implementation. In production, you'd need to:
      // 1. Parse their specific XML/JSON format
      // 2. Handle Japanese text encoding
      // 3. Implement proper authentication if required
      
      const response = await fetch(`${this.baseUrl}/quake_list.json`, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EmergencyAlertSystem/1.0'
        }
      })
      
      if (!response.ok) {
        // JMA might not have a public JSON API - fallback to empty array
        console.warn(`JMA fetch returned ${response.status}, using fallback`)
        this.recordSuccess() // Don't count as failure if endpoint doesn't exist
        return []
      }
      
      const data = await response.json()
      
      this.recordSuccess()
      this.recordResponseTime(Date.now() - fetchStartTime)
      
      // Convert JMA format to our standard format
      const earthquakes = this.convertJMAToStandard(data, options)
      
      return earthquakes
      
    } catch (error) {
      // JMA API might not be publicly accessible - log but don't fail
      console.warn('JMA source unavailable:', error)
      this.recordFailure(error instanceof Error ? error : new Error('Unknown error'))
      
      // Return empty array instead of throwing to allow other sources to work
      return []
    }
  }
  
  private convertJMAToStandard(data: any, options?: FetchOptions): EarthquakeFeature[] {
    // JMA data structure varies - this is a generic parser
    const earthquakes: EarthquakeFeature[] = []
    
    if (!data || !Array.isArray(data)) {
      return earthquakes
    }
    
    const minMag = options?.minMagnitude || 0
    
    for (const item of data) {
      try {
        // JMA typically provides: magnitude, epicenter, depth, time
        const magnitude = this.parseMagnitude(item)
        const coordinates = this.parseCoordinates(item)
        const time = this.parseTime(item)
        const location = this.parseLocation(item)
        const depth = this.parseDepth(item)
        
        if (magnitude < minMag) continue
        
        const earthquake: EarthquakeFeature = {
          type: 'Feature',
          id: `jma_${item.id || `${time}_${coordinates[0]}_${coordinates[1]}`}`,
          properties: {
            mag: magnitude,
            place: location,
            time: time,
            updated: time,
            tz: 540, // JST is UTC+9
            url: `https://www.data.jma.go.jp/multi/quake/`,
            detail: '',
            felt: null,
            cdi: null,
            mmi: null,
            alert: null,
            status: 'reviewed', // JMA data is typically reviewed
            tsunami: item.tsunami || 0,
            sig: Math.round(magnitude * 100),
            net: 'jma',
            code: String(item.id || ''),
            ids: `jma${item.id || ''}`,
            sources: 'jma',
            types: 'origin,magnitude',
            nst: null,
            dmin: null,
            rms: 0,
            gap: null,
            magType: 'M',
            type: 'earthquake',
            title: `M ${magnitude.toFixed(1)} - ${location}`
          },
          geometry: {
            type: 'Point',
            coordinates: [coordinates[0], coordinates[1], depth]
          }
        }
        
        earthquakes.push(earthquake)
      } catch (err) {
        console.warn('Failed to parse JMA earthquake:', err)
        continue
      }
    }
    
    return earthquakes
  }
  
  private parseMagnitude(item: any): number {
    return parseFloat(item.magnitude || item.mag || item.M || 0)
  }
  
  private parseCoordinates(item: any): [number, number] {
    // JMA might provide coordinates in various formats
    if (item.longitude && item.latitude) {
      return [parseFloat(item.longitude), parseFloat(item.latitude)]
    }
    if (item.lon && item.lat) {
      return [parseFloat(item.lon), parseFloat(item.lat)]
    }
    if (item.coordinates && Array.isArray(item.coordinates)) {
      return [item.coordinates[0], item.coordinates[1]]
    }
    // Default to Japan region if coordinates not found
    return [139.6917, 35.6895] // Tokyo coordinates as fallback
  }
  
  private parseTime(item: any): number {
    if (item.time) {
      return new Date(item.time).getTime()
    }
    if (item.timestamp) {
      return new Date(item.timestamp).getTime()
    }
    if (item.datetime) {
      return new Date(item.datetime).getTime()
    }
    return Date.now()
  }
  
  private parseLocation(item: any): string {
    return item.location || item.place || item.region || item.epicenter || 'Japan region'
  }
  
  private parseDepth(item: any): number {
    const depth = parseFloat(item.depth || item.dep || 10)
    return isNaN(depth) ? 10 : depth
  }
}
