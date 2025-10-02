import { EarthquakeFeature } from '@/types/earthquake'
import { DataSource, TsunamiAlert, FetchOptions } from './base-source'
import { USGSSource } from './usgs-source'
import { EMSCSource } from './emsc-source'
import { JMASource } from './jma-source'
import { PTWCSource } from './ptwc-source'
import { IRISSource } from './iris-source'

/**
 * Deduplicated earthquake event with source attribution
 */
export type AggregatedEarthquake = EarthquakeFeature & {
  sources: string[] // List of sources that reported this event
  primarySource: string // Most authoritative source
  confidence: number // 0-1 score based on source agreement
}

/**
 * Aggregates earthquake and tsunami data from multiple sources
 * Handles deduplication, cross-validation, and source prioritization
 */
export class DataAggregator {
  private sources: DataSource[]
  private tsunamiSources: DataSource[]
  
  constructor() {
    // Initialize all data sources
    this.sources = [
      new USGSSource(),
      new EMSCSource(),
      new JMASource(),
      new IRISSource()
    ]
    
    this.tsunamiSources = [
      new PTWCSource()
    ]
  }
  
  /**
   * Fetch earthquakes from all available sources and deduplicate
   */
  async fetchAggregatedEarthquakes(options?: FetchOptions): Promise<AggregatedEarthquake[]> {
    console.log('🌍 Fetching earthquakes from multiple sources...')
    
    // Fetch from all sources in parallel
    const results = await Promise.allSettled(
      this.sources.map(async (source) => {
        try {
          const isAvailable = await source.isAvailable()
          if (!isAvailable) {
            console.warn(`⚠️ Source ${source.name} is not available`)
            return { source: source.name, earthquakes: [] }
          }
          
          const earthquakes = await source.fetchEarthquakes(options)
          console.log(`✅ ${source.name}: ${earthquakes.length} earthquakes`)
          return { source: source.name, earthquakes }
        } catch (error) {
          console.error(`❌ ${source.name} failed:`, error)
          return { source: source.name, earthquakes: [] }
        }
      })
    )
    
    // Collect all earthquakes with source attribution
    const allEarthquakes: Array<{ source: string; earthquake: EarthquakeFeature }> = []
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { source, earthquakes } = result.value
        for (const eq of earthquakes) {
          allEarthquakes.push({ source, earthquake: eq })
        }
      }
    }
    
    console.log(`📊 Total events before deduplication: ${allEarthquakes.length}`)
    
    // Deduplicate and merge
    const deduplicated = this.deduplicateEarthquakes(allEarthquakes)
    
    console.log(`📊 Unique events after deduplication: ${deduplicated.length}`)
    
    return deduplicated
  }
  
  /**
   * Fetch tsunami alerts from all sources
   */
  async fetchAggregatedTsunamiAlerts(): Promise<TsunamiAlert[]> {
    console.log('🌊 Fetching tsunami alerts from multiple sources...')
    
    const results = await Promise.allSettled(
      this.tsunamiSources.map(async (source) => {
        if (!source.fetchTsunamiAlerts) return []
        
        try {
          const isAvailable = await source.isAvailable()
          if (!isAvailable) {
            console.warn(`⚠️ Tsunami source ${source.name} is not available`)
            return []
          }
          
          const alerts = await source.fetchTsunamiAlerts()
          console.log(`✅ ${source.name}: ${alerts.length} tsunami alerts`)
          return alerts
        } catch (error) {
          console.error(`❌ ${source.name} tsunami fetch failed:`, error)
          return []
        }
      })
    )
    
    // Flatten all alerts
    const allAlerts: TsunamiAlert[] = []
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allAlerts.push(...result.value)
      }
    }
    
    return allAlerts
  }
  
  /**
   * Get health status of all sources
   */
  getSourcesHealth() {
    return {
      earthquake: this.sources.map(source => ({
        name: source.name,
        coverage: source.coverage,
        health: source.getHealthStatus()
      })),
      tsunami: this.tsunamiSources.map(source => ({
        name: source.name,
        coverage: source.coverage,
        health: source.getHealthStatus()
      }))
    }
  }
  
  /**
   * Deduplicate earthquakes from multiple sources
   * Events are considered duplicates if they occur within:
   * - 50km distance
   * - 5 minute time window
   * - 0.3 magnitude difference
   */
  private deduplicateEarthquakes(
    events: Array<{ source: string; earthquake: EarthquakeFeature }>
  ): AggregatedEarthquake[] {
    const groups: Array<Array<{ source: string; earthquake: EarthquakeFeature }>> = []
    
    // Group similar events
    for (const event of events) {
      let foundGroup = false
      
      for (const group of groups) {
        const representative = group[0].earthquake
        
        if (this.areEventsSimilar(event.earthquake, representative)) {
          group.push(event)
          foundGroup = true
          break
        }
      }
      
      if (!foundGroup) {
        groups.push([event])
      }
    }
    
    // Merge each group into a single aggregated event
    return groups.map(group => this.mergeEventGroup(group))
  }
  
  /**
   * Check if two earthquakes are likely the same event
   */
  private areEventsSimilar(eq1: EarthquakeFeature, eq2: EarthquakeFeature): boolean {
    // Time difference (5 minutes = 300,000 ms)
    const timeDiff = Math.abs(eq1.properties.time - eq2.properties.time)
    if (timeDiff > 300000) return false
    
    // Distance difference (50 km)
    const distance = this.calculateDistance(
      eq1.geometry.coordinates[1], eq1.geometry.coordinates[0],
      eq2.geometry.coordinates[1], eq2.geometry.coordinates[0]
    )
    if (distance > 50) return false
    
    // Magnitude difference (0.3)
    const magDiff = Math.abs(eq1.properties.mag - eq2.properties.mag)
    if (magDiff > 0.3) return false
    
    return true
  }
  
  /**
   * Merge a group of similar events into one aggregated event
   */
  private mergeEventGroup(
    group: Array<{ source: string; earthquake: EarthquakeFeature }>
  ): AggregatedEarthquake {
    // Source priority: JMA > USGS > EMSC (for their respective regions)
    const sourcePriority: Record<string, number> = {
      'JMA': 3,
      'USGS': 2,
      'EMSC': 1
    }
    
    // Sort by priority
    const sorted = [...group].sort((a, b) => {
      const priorityA = sourcePriority[a.source] || 0
      const priorityB = sourcePriority[b.source] || 0
      return priorityB - priorityA
    })
    
    const primary = sorted[0].earthquake
    const sources = group.map(e => e.source)
    const primarySource = sorted[0].source
    
    // Calculate confidence based on source agreement
    const confidence = Math.min(1, sources.length / 2) // More sources = higher confidence
    
    // Use average magnitude if multiple sources
    const avgMagnitude = group.reduce((sum, e) => sum + e.earthquake.properties.mag, 0) / group.length
    
    // Use average coordinates
    const avgLat = group.reduce((sum, e) => sum + e.earthquake.geometry.coordinates[1], 0) / group.length
    const avgLon = group.reduce((sum, e) => sum + e.earthquake.geometry.coordinates[0], 0) / group.length
    const avgDepth = group.reduce((sum, e) => sum + e.earthquake.geometry.coordinates[2], 0) / group.length
    
    return {
      ...primary,
      properties: {
        ...primary.properties,
        mag: Number(avgMagnitude.toFixed(2)),
        sources: sources.join(','),
        title: `M ${avgMagnitude.toFixed(1)} - ${primary.properties.place}`
      },
      geometry: {
        ...primary.geometry,
        coordinates: [
          Number(avgLon.toFixed(4)),
          Number(avgLat.toFixed(4)),
          Number(avgDepth.toFixed(1))
        ]
      },
      sources,
      primarySource,
      confidence
    }
  }
  
  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }
  
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}

// Export singleton instance
export const dataAggregator = new DataAggregator()
