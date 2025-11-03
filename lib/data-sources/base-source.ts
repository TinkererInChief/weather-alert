import { EarthquakeFeature } from '@/types/earthquake'

/**
 * Tsunami alert from various sources
 */
export type TsunamiAlert = {
  id: string
  source: string
  title: string
  category: string
  severity: number
  latitude: number
  longitude: number
  affectedRegions: string[]
  issuedAt: Date
  expiresAt?: Date
  description?: string
  instructions?: string
  rawData: any
  
  // DART enrichment fields
  dartConfirmation?: {
    stationId: string
    stationName: string
    height: number // meters
    timestamp: Date
    region: string
  }
  confidence?: number // 0-100
  sources?: string[] // Array of source names that detected this event
  sourceCount?: number // Number of sources
  waveTrains?: Array<{
    number: number
    height: number // meters
    eta: Date
    isStrongest: boolean
  }>
}

/**
 * Base interface for all earthquake/tsunami data sources
 */
export interface DataSource {
  /** Unique identifier for the data source */
  readonly name: string
  
  /** Geographic coverage area */
  readonly coverage: string[]
  
  /** Update frequency in seconds */
  readonly updateFrequency: number
  
  /** Check if the data source is available and responding */
  isAvailable(): Promise<boolean>
  
  /** Fetch recent earthquakes from this source */
  fetchEarthquakes(options?: FetchOptions): Promise<EarthquakeFeature[]>
  
  /** Fetch tsunami alerts from this source (if supported) */
  fetchTsunamiAlerts?(options?: FetchOptions): Promise<TsunamiAlert[]>
  
  /** Get the last successful fetch timestamp */
  getLastFetchTime(): Date | null
  
  /** Get source health status */
  getHealthStatus(): SourceHealthStatus
}

export type FetchOptions = {
  /** Minimum magnitude to fetch */
  minMagnitude?: number
  
  /** Time window in hours */
  timeWindowHours?: number
  
  /** Maximum number of events to return */
  limit?: number
  
  /** Geographic bounding box [minLat, minLng, maxLat, maxLng] */
  boundingBox?: [number, number, number, number]
}

export type SourceHealthStatus = {
  isHealthy: boolean
  lastSuccessfulFetch: Date | null
  lastError: string | null
  consecutiveFailures: number
  averageResponseTime: number
}

/**
 * Abstract base class for data sources with common functionality
 */
export abstract class BaseDataSource implements DataSource {
  abstract readonly name: string
  abstract readonly coverage: string[]
  abstract readonly updateFrequency: number
  
  protected lastFetchTime: Date | null = null
  protected lastError: string | null = null
  protected consecutiveFailures: number = 0
  protected responseTimes: number[] = []
  
  async isAvailable(): Promise<boolean> {
    try {
      const startTime = Date.now()
      await this.healthCheck()
      const responseTime = Date.now() - startTime
      this.recordResponseTime(responseTime)
      return true
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown error'
      this.consecutiveFailures++
      return false
    }
  }
  
  abstract fetchEarthquakes(options?: FetchOptions): Promise<EarthquakeFeature[]>
  
  getLastFetchTime(): Date | null {
    return this.lastFetchTime
  }
  
  getHealthStatus(): SourceHealthStatus {
    return {
      isHealthy: this.consecutiveFailures < 3,
      lastSuccessfulFetch: this.lastFetchTime,
      lastError: this.lastError,
      consecutiveFailures: this.consecutiveFailures,
      averageResponseTime: this.getAverageResponseTime()
    }
  }
  
  protected recordSuccess(): void {
    this.lastFetchTime = new Date()
    this.consecutiveFailures = 0
    this.lastError = null
  }
  
  protected recordFailure(error: Error): void {
    this.lastError = error.message
    this.consecutiveFailures++
  }
  
  protected recordResponseTime(time: number): void {
    this.responseTimes.push(time)
    // Keep only last 10 response times
    if (this.responseTimes.length > 10) {
      this.responseTimes.shift()
    }
  }
  
  protected getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0
    const sum = this.responseTimes.reduce((a, b) => a + b, 0)
    return Math.round(sum / this.responseTimes.length)
  }
  
  /**
   * Health check implementation - should be lightweight
   */
  protected abstract healthCheck(): Promise<void>
}
