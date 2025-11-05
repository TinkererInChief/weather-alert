/**
 * MarineTraffic API Service
 * 
 * Provides access to MarineTraffic's AIS data API for:
 * - Vessel positions and tracking
 * - Vessel details and metadata
 * - Port calls and voyage information
 * - Historical track data
 * 
 * API Documentation: https://servicedocs.marinetraffic.com/
 */

const MARINETRAFFIC_API_KEY = process.env.MARINETRAFFIC_API_KEY
const BASE_URL = 'https://services.marinetraffic.com/api'

type VesselPosition = {
  mmsi: number
  imo?: number
  shipName: string
  latitude: number
  longitude: number
  speed: number
  course: number
  heading: number
  status: number
  timestamp: string
  shipType?: number
  destination?: string
  eta?: string
  draught?: number
  length?: number
  width?: number
}

type VesselDetails = {
  mmsi: number
  imo?: number
  shipName: string
  shipType: number
  shipTypeText: string
  flag: string
  yearBuilt?: number
  grossTonnage?: number
  deadweight?: number
  length?: number
  width?: number
  draught?: number
  callsign?: string
}

export class MarineTrafficService {
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || MARINETRAFFIC_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('⚠️  MarineTraffic API key not configured')
    }
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Get vessel positions in a bounding box
   * 
   * Common API endpoints:
   * - PS01: Simple positions
   * - PS02: Extended positions
   * - PS03: Vessel photos
   * - PS06: Single vessel positions
   * - PS07: Fleet vessel positions
   */
  async getVesselPositions(params: {
    minLat?: number
    maxLat?: number
    minLon?: number
    maxLon?: number
    mmsi?: number
    imo?: number
    timespan?: number // minutes
  }): Promise<VesselPosition[]> {
    if (!this.isConfigured()) {
      throw new Error('MarineTraffic API key not configured')
    }

    try {
      // Use PS07 for extended positions
      const endpoint = '/exportvessels/v:8'
      const url = new URL(`${BASE_URL}${endpoint}/${this.apiKey}`)
      
      // Add parameters
      if (params.minLat) url.searchParams.set('MINLAT', params.minLat.toString())
      if (params.maxLat) url.searchParams.set('MAXLAT', params.maxLat.toString())
      if (params.minLon) url.searchParams.set('MINLON', params.minLon.toString())
      if (params.maxLon) url.searchParams.set('MAXLON', params.maxLon.toString())
      if (params.mmsi) url.searchParams.set('MMSI', params.mmsi.toString())
      if (params.imo) url.searchParams.set('IMO', params.imo.toString())
      if (params.timespan) url.searchParams.set('TIMESPAN', params.timespan.toString())
      
      url.searchParams.set('protocol', 'jsono')
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error(`MarineTraffic API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Parse response based on API format
      if (Array.isArray(data)) {
        return data.map(this.parseVesselPosition)
      }
      
      return []
    } catch (error) {
      console.error('❌ MarineTraffic API error:', error)
      throw error
    }
  }

  /**
   * Get single vessel position by MMSI
   */
  async getVesselByMMSI(mmsi: number): Promise<VesselPosition | null> {
    try {
      const positions = await this.getVesselPositions({ mmsi })
      return positions.length > 0 ? positions[0] : null
    } catch (error) {
      console.error(`❌ Failed to get vessel ${mmsi}:`, error)
      return null
    }
  }

  /**
   * Get single vessel position by IMO
   */
  async getVesselByIMO(imo: number): Promise<VesselPosition | null> {
    try {
      const positions = await this.getVesselPositions({ imo })
      return positions.length > 0 ? positions[0] : null
    } catch (error) {
      console.error(`❌ Failed to get vessel IMO ${imo}:`, error)
      return null
    }
  }

  /**
   * Get vessel details/metadata
   * Uses VD (Vessel Data) API
   */
  async getVesselDetails(params: {
    mmsi?: number
    imo?: number
    shipName?: string
  }): Promise<VesselDetails | null> {
    if (!this.isConfigured()) {
      throw new Error('MarineTraffic API key not configured')
    }

    try {
      const endpoint = '/vesselmasterdata/v:2'
      const url = new URL(`${BASE_URL}${endpoint}/${this.apiKey}`)
      
      if (params.mmsi) url.searchParams.set('mmsi', params.mmsi.toString())
      if (params.imo) url.searchParams.set('imo', params.imo.toString())
      if (params.shipName) url.searchParams.set('shipname', params.shipName)
      
      url.searchParams.set('protocol', 'jsono')
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error(`MarineTraffic API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (Array.isArray(data) && data.length > 0) {
        return this.parseVesselDetails(data[0])
      }
      
      return null
    } catch (error) {
      console.error('❌ MarineTraffic vessel details error:', error)
      return null
    }
  }

  /**
   * Get vessels in area (bounding box)
   */
  async getVesselsInArea(bounds: {
    minLat: number
    maxLat: number
    minLon: number
    maxLon: number
  }): Promise<VesselPosition[]> {
    return this.getVesselPositions(bounds)
  }

  /**
   * Parse vessel position from API response
   */
  private parseVesselPosition(data: any): VesselPosition {
    return {
      mmsi: parseInt(data.MMSI || data.mmsi),
      imo: data.IMO || data.imo ? parseInt(data.IMO || data.imo) : undefined,
      shipName: data.SHIPNAME || data.shipname || data.name || 'Unknown',
      latitude: parseFloat(data.LAT || data.lat || data.latitude),
      longitude: parseFloat(data.LON || data.lon || data.longitude),
      speed: parseFloat(data.SPEED || data.speed || 0),
      course: parseFloat(data.COURSE || data.course || 0),
      heading: parseFloat(data.HEADING || data.heading || 0),
      status: parseInt(data.STATUS || data.status || 0),
      timestamp: data.TIMESTAMP || data.timestamp || data.last_position_UTC || new Date().toISOString(),
      shipType: data.TYPE || data.type ? parseInt(data.TYPE || data.type) : undefined,
      destination: data.DESTINATION || data.destination,
      eta: data.ETA || data.eta,
      draught: data.DRAUGHT || data.draught ? parseFloat(data.DRAUGHT || data.draught) : undefined,
      length: data.LENGTH || data.length ? parseFloat(data.LENGTH || data.length) : undefined,
      width: data.WIDTH || data.width ? parseFloat(data.WIDTH || data.width) : undefined
    }
  }

  /**
   * Parse vessel details from API response
   */
  private parseVesselDetails(data: any): VesselDetails {
    return {
      mmsi: parseInt(data.MMSI || data.mmsi),
      imo: data.IMO || data.imo ? parseInt(data.IMO || data.imo) : undefined,
      shipName: data.SHIPNAME || data.shipname || 'Unknown',
      shipType: parseInt(data.TYPE_SUMMARY || data.type_summary || data.TYPE || data.type || 0),
      shipTypeText: data.TYPE_NAME || data.type_name || 'Unknown',
      flag: data.FLAG || data.flag || 'Unknown',
      yearBuilt: data.YEAR_BUILT || data.year_built ? parseInt(data.YEAR_BUILT || data.year_built) : undefined,
      grossTonnage: data.GRT || data.grt ? parseFloat(data.GRT || data.grt) : undefined,
      deadweight: data.DWT || data.dwt ? parseFloat(data.DWT || data.dwt) : undefined,
      length: data.LENGTH || data.length ? parseFloat(data.LENGTH || data.length) : undefined,
      width: data.WIDTH || data.width ? parseFloat(data.WIDTH || data.width) : undefined,
      draught: data.DRAUGHT || data.draught ? parseFloat(data.DRAUGHT || data.draught) : undefined,
      callsign: data.CALLSIGN || data.callsign
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
      // Try to get a small area around Singapore (busy shipping lane)
      const vessels = await this.getVesselsInArea({
        minLat: 1.0,
        maxLat: 1.5,
        minLon: 103.5,
        maxLon: 104.0
      })

      return {
        success: true,
        message: `API working! Found ${vessels.length} vessels`,
        data: {
          vesselCount: vessels.length,
          sampleVessel: vessels[0]
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

export const marineTrafficService = new MarineTrafficService()
