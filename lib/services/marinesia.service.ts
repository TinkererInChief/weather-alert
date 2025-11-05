/**
 * Marinesia API Service
 * 
 * Provides access to Marinesia's maritime data API for:
 * - Vessel profiles and metadata (IMO, MMSI, dimensions, type)
 * - Real-time vessel locations (AIS data)
 * - Historical vessel tracking
 * - Vessels in bounding box (area search)
 * - Port information and locations
 * - Live camera streams
 * 
 * API Documentation: https://api.marinesia.com/swagger
 */

const MARINESIA_API_KEY = process.env.MARINESIA_API_KEY || process.env.MARINETRAFFIC_API_KEY
const BASE_URL = 'https://api.marinesia.com/api/v1'

type VesselProfile = {
  mmsi: number
  imo?: number
  callsign?: string
  name: string
  ship_type: string
  country: string
  dimension_a?: number
  dimension_b?: number
  dimension_c?: number
  dimension_d?: number
  length?: number
  width?: number
  image?: string
}

type VesselLocation = {
  mmsi: number
  com_state?: number
  status: number
  pos_acc: boolean
  raim: boolean
  lat: number
  lng: number
  cog: number
  sog: number
  rot: number
  hdt: number
  spare?: number
  repeat?: number
  smi?: number
  valid: boolean
  ts: string
}

type VesselNearby = {
  name: string
  type: string
  flag: string
  mmsi: number
  lat: number
  lng: number
  cog: number
  sog: number
  rot: number
  hdt: number
  ts: string
}

type PortProfile = {
  name: string
  port_id: string
  country: string
  un_locode: string
  lat: number
  long: number
  berths: number
  image?: string
}

type ApiResponse<T> = {
  error: boolean
  message: string
  data?: T
  meta?: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export class MarinesiaService {
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || MARINESIA_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('⚠️  Marinesia API key not configured')
    }
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Make API request with error handling
   */
  private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('Marinesia API key not configured')
    }

    try {
      const url = new URL(`${BASE_URL}${endpoint}`)
      
      // Add API key
      url.searchParams.set('key', this.apiKey)
      
      // Add other parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      })

      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error(`Marinesia API error: ${response.status} ${response.statusText}`)
      }
      
      const result: ApiResponse<T> = await response.json()
      
      if (result.error) {
        throw new Error(result.message || 'API request failed')
      }
      
      return result.data as T
    } catch (error) {
      console.error('❌ Marinesia API error:', error)
      throw error
    }
  }

  /**
   * Get vessel profile by MMSI
   */
  async getVesselProfile(mmsi: number): Promise<VesselProfile | null> {
    try {
      return await this.request<VesselProfile>(`/vessel/${mmsi}/profile`)
    } catch (error) {
      console.error(`❌ Failed to get vessel profile for MMSI ${mmsi}:`, error)
      return null
    }
  }

  /**
   * Get vessel image by MMSI
   */
  async getVesselImage(mmsi: number): Promise<{ imo: number; mmsi: number; image: string } | null> {
    try {
      return await this.request(`/vessel/${mmsi}/image`)
    } catch (error) {
      console.error(`❌ Failed to get vessel image for MMSI ${mmsi}:`, error)
      return null
    }
  }

  /**
   * Get latest vessel location by MMSI
   */
  async getVesselLatestLocation(mmsi: number): Promise<VesselLocation | null> {
    try {
      return await this.request<VesselLocation>(`/vessel/${mmsi}/location/latest`)
    } catch (error) {
      console.error(`❌ Failed to get latest location for MMSI ${mmsi}:`, error)
      return null
    }
  }

  /**
   * Get historical vessel locations by MMSI
   */
  async getVesselLocationHistory(mmsi: number): Promise<VesselLocation[]> {
    try {
      const data = await this.request<VesselLocation[]>(`/vessel/${mmsi}/location`)
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error(`❌ Failed to get location history for MMSI ${mmsi}:`, error)
      return []
    }
  }

  /**
   * Get vessels in bounding box (area)
   */
  async getVesselsNearby(bounds: {
    lat_min: number
    lat_max: number
    long_min: number
    long_max: number
  }): Promise<VesselNearby[]> {
    try {
      const data = await this.request<VesselNearby[]>('/vessel/nearby', bounds)
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('❌ Failed to get nearby vessels:', error)
      return []
    }
  }

  /**
   * List vessel profiles with pagination and filters
   */
  async listVesselProfiles(options: {
    page?: number
    limit?: number
    sort?: string
    order?: 'asc' | 'desc'
    filters?: string // e.g., "country:JPN,ship_type:Tanker"
  } = {}): Promise<{
    data: VesselProfile[]
    meta?: {
      page: number
      limit: number
      total: number
      total_pages: number
    }
  }> {
    try {
      const result = await this.request<any>('/vessel/profile', options)
      return {
        data: Array.isArray(result) ? result : [],
        meta: result.meta
      }
    } catch (error) {
      console.error('❌ Failed to list vessel profiles:', error)
      return { data: [] }
    }
  }

  /**
   * Get port profile by ID
   */
  async getPortProfile(portId: string): Promise<PortProfile | null> {
    try {
      return await this.request<PortProfile>(`/port/${portId}/profile`)
    } catch (error) {
      console.error(`❌ Failed to get port profile for ID ${portId}:`, error)
      return null
    }
  }

  /**
   * Get ports in bounding box (area)
   */
  async getPortsNearby(bounds: {
    lat_min: number
    lat_max: number
    long_min: number
    long_max: number
  }): Promise<PortProfile[]> {
    try {
      const data = await this.request<PortProfile[]>('/port/nearby', bounds)
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('❌ Failed to get nearby ports:', error)
      return []
    }
  }

  /**
   * List ports with pagination and filters
   */
  async listPorts(options: {
    page?: number
    limit?: number
    sort?: string
    order?: 'asc' | 'desc'
    filters?: string // e.g., "country:JPN"
  } = {}): Promise<{
    data: PortProfile[]
    meta?: {
      page: number
      limit: number
      total: number
      total_pages: number
    }
  }> {
    try {
      const result = await this.request<any>('/port/profile', options)
      return {
        data: Array.isArray(result) ? result : [],
        meta: result.meta
      }
    } catch (error) {
      console.error('❌ Failed to list ports:', error)
      return { data: [] }
    }
  }

  /**
   * Get camera streams in bounding box
   */
  async getCamerasNearby(bounds: {
    lat_min: number
    lat_max: number
    long_min: number
    long_max: number
  }): Promise<any[]> {
    try {
      const data = await this.request<any[]>('/camera/nearby', bounds)
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('❌ Failed to get nearby cameras:', error)
      return []
    }
  }

  /**
   * Get camera stream by ID
   */
  async getCameraStream(cameraId: string): Promise<any | null> {
    try {
      return await this.request(`/camera/${cameraId}/play`)
    } catch (error) {
      console.error(`❌ Failed to get camera stream for ID ${cameraId}:`, error)
      return null
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{
    success: boolean
    message: string
    data?: any
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'API key not configured'
      }
    }

    try {
      // Try to get vessels in a small area (Singapore Strait - busy shipping lane)
      const vessels = await this.getVesselsNearby({
        lat_min: 1.0,
        lat_max: 1.5,
        long_min: 103.5,
        long_max: 104.0
      })

      if (vessels.length > 0) {
        return {
          success: true,
          message: `API working! Found ${vessels.length} vessels in Singapore Strait`,
          data: {
            vesselCount: vessels.length,
            sampleVessel: vessels[0]
          }
        }
      } else {
        // Try a different area if Singapore has no vessels
        const vesselsAlt = await this.getVesselsNearby({
          lat_min: -7.5,
          lat_max: -5.0,
          long_min: 105.0,
          long_max: 107.0
        })

        return {
          success: true,
          message: `API working! Found ${vesselsAlt.length} vessels`,
          data: {
            vesselCount: vesselsAlt.length,
            sampleVessel: vesselsAlt[0]
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const marinesiaService = new MarinesiaService()
