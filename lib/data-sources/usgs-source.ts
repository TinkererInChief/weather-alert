import { EarthquakeFeature, EarthquakeResponse } from '@/types/earthquake'
import { BaseDataSource, FetchOptions } from './base-source'

/**
 * USGS (United States Geological Survey) earthquake data source
 * Coverage: Global, with best coverage in the Americas
 * Update frequency: Real-time (updates every minute)
 */
export class USGSSource extends BaseDataSource {
  readonly name = 'USGS'
  readonly coverage = ['Global', 'Americas', 'Pacific']
  readonly updateFrequency = 60 // seconds
  
  private readonly baseUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary'
  
  protected async healthCheck(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/all_hour.geojson`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      throw new Error(`USGS health check failed: ${response.status}`)
    }
  }
  
  async fetchEarthquakes(options?: FetchOptions): Promise<EarthquakeFeature[]> {
    const fetchStartTime = Date.now()
    
    try {
      // Determine which feed to use based on time window
      const timeWindow = options?.timeWindowHours || 1
      const feedUrl = this.getFeedUrl(timeWindow)
      
      const response = await fetch(feedUrl, {
        signal: AbortSignal.timeout(10000)
      })
      
      if (!response.ok) {
        throw new Error(`USGS fetch failed: ${response.status}`)
      }
      
      const data: EarthquakeResponse = await response.json()
      
      this.recordSuccess()
      this.recordResponseTime(Date.now() - fetchStartTime)
      
      let earthquakes = data.features || []
      
      // Apply filters
      if (options?.minMagnitude) {
        earthquakes = earthquakes.filter(eq => 
          eq.properties.mag >= options.minMagnitude!
        )
      }
      
      if (options?.boundingBox) {
        const [minLat, minLng, maxLat, maxLng] = options.boundingBox
        earthquakes = earthquakes.filter(eq => {
          const [lng, lat] = eq.geometry.coordinates
          return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
        })
      }
      
      if (options?.limit) {
        earthquakes = earthquakes.slice(0, options.limit)
      }
      
      // Normalize to standard format
      return earthquakes.map(eq => this.normalizeEarthquake(eq))
      
    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error('Unknown error'))
      throw error
    }
  }
  
  private getFeedUrl(timeWindowHours: number): string {
    // USGS provides different feeds for different time windows
    if (timeWindowHours <= 1) {
      return `${this.baseUrl}/all_hour.geojson`
    } else if (timeWindowHours <= 24) {
      return `${this.baseUrl}/all_day.geojson`
    } else if (timeWindowHours <= 168) { // 7 days
      return `${this.baseUrl}/all_week.geojson`
    } else {
      return `${this.baseUrl}/all_month.geojson`
    }
  }
  
  private normalizeEarthquake(eq: EarthquakeFeature): EarthquakeFeature {
    // USGS data is already in our standard format
    // Just ensure source attribution
    return {
      ...eq,
      properties: {
        ...eq.properties,
        sources: `${eq.properties.sources || ''},usgs`,
        net: eq.properties.net || 'us'
      }
    }
  }
}
