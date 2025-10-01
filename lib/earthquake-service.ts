import { EarthquakeResponse, EarthquakeFeature } from '@/types/earthquake'
import { db } from './database'
import { dataAggregator } from './data-sources'

export class EarthquakeService {
  private static instance: EarthquakeService
  private lastCheckedTime: number = 0
  private useMultiSource: boolean = true // Enable multi-source by default

  static getInstance(): EarthquakeService {
    if (!EarthquakeService.instance) {
      EarthquakeService.instance = new EarthquakeService()
    }
    return EarthquakeService.instance
  }

  /**
   * Fetch earthquakes from multiple sources with deduplication
   * Falls back to USGS-only if multi-source fails
   */
  async fetchRecentEarthquakes(): Promise<EarthquakeFeature[]> {
    if (this.useMultiSource) {
      try {
        console.log('🌍 Using multi-source earthquake data aggregation')
        const aggregated = await dataAggregator.fetchAggregatedEarthquakes({
          timeWindowHours: 1,
          minMagnitude: 2.5 // Fetch all significant events
        })
        
        if (aggregated.length > 0) {
          console.log(`✅ Multi-source fetch successful: ${aggregated.length} events`)
          return aggregated
        }
        
        console.warn('⚠️ Multi-source returned no events, falling back to USGS')
      } catch (error) {
        console.error('❌ Multi-source fetch failed, falling back to USGS:', error)
      }
    }
    
    // Fallback to USGS-only
    return this.fetchUSGSOnly()
  }

  /**
   * Fallback method: fetch from USGS only
   */
  private async fetchUSGSOnly(): Promise<EarthquakeFeature[]> {
    try {
      const response = await fetch(
        'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson'
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: EarthquakeResponse = await response.json()
      return data.features || []
    } catch (error) {
      console.error('Error fetching earthquake data from USGS:', error)
      throw error
    }
  }

  async getNewSignificantEarthquakes(): Promise<EarthquakeFeature[]> {
    const allEarthquakes = await this.fetchRecentEarthquakes()
    const minMagnitude = parseFloat(process.env.MIN_MAGNITUDE || '6.0')
    
    // Get already processed earthquakes from database
    const processedIds = await db.getProcessedEarthquakeIds()
    const processedSet = new Set(processedIds)
    
    // Filter for significant earthquakes that haven't been processed
    const significantEarthquakes = allEarthquakes.filter(earthquake => {
      const magnitude = earthquake.properties.mag
      const isSignificant = magnitude >= minMagnitude
      const isNew = !processedSet.has(earthquake.id)
      const isRecent = earthquake.properties.time > this.lastCheckedTime
      
      return isSignificant && isNew && isRecent
    })

    // Cache all significant earthquakes (will be marked as processed when alerts are sent)
    for (const earthquake of significantEarthquakes) {
      await db.cacheEarthquake({
        earthquakeId: earthquake.id,
        magnitude: earthquake.properties.mag,
        location: earthquake.properties.place,
        latitude: earthquake.geometry.coordinates[1],
        longitude: earthquake.geometry.coordinates[0],
        depth: earthquake.geometry.coordinates[2],
        timestamp: new Date(earthquake.properties.time),
        processed: false
      })
    }

    this.lastCheckedTime = Date.now()
    
    return significantEarthquakes
  }

  formatEarthquakeAlert(earthquake: EarthquakeFeature): string {
    const magnitude = earthquake.properties.mag.toFixed(1)
    const location = earthquake.properties.place
    const time = new Date(earthquake.properties.time).toLocaleString()
    const tsunamiWarning = earthquake.properties.tsunami ? ' ⚠️ TSUNAMI ALERT' : ''
    
    return `🚨 EARTHQUAKE ALERT ${tsunamiWarning}
Magnitude: ${magnitude}
Location: ${location}
Time: ${time}
More info: ${earthquake.properties.url}
Stay safe and follow local emergency protocols.`
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }
}
