import { prisma } from '@/lib/prisma'

type OpenShipDataReport = {
  timeSecUtc: number
  point: {
    latitude: number
    longitude: number
  }
  destination?: {
    latitude: number
    longitude: number
  }
  destinationName?: string
  etaSecUtc?: number
  boatName: string
  callSign?: string
  mmsi: string
  lengthMeters?: number
  widthMeters?: number
  heightMeters?: number
  captain?: string
  speedKmh: number
  bearingDeg: number
  vesselType: string
  source: string
}

type OpenShipDataResponse = {
  reports: OpenShipDataReport[]
}

type BoundingBox = {
  north: number
  south: number
  east: number
  west: number
}

export class OpenShipDataService {
  private static instance: OpenShipDataService
  private baseUrl = 'http://ais.marineplan.com/location/v1'
  private pollInterval = 60000 // 1 minute
  private intervalId: NodeJS.Timeout | null = null
  
  static getInstance() {
    if (!OpenShipDataService.instance) {
      OpenShipDataService.instance = new OpenShipDataService()
    }
    return OpenShipDataService.instance
  }
  
  /**
   * Check if bounding box covers European waters
   */
  private isEuropeanWaters(bbox: BoundingBox): boolean {
    // European waters: roughly 35°N-70°N, 15°W-45°E
    const europeBounds = {
      north: 70,
      south: 35,
      west: -15,
      east: 45
    }
    
    // Check if there's any overlap
    return !(
      bbox.south > europeBounds.north ||
      bbox.north < europeBounds.south ||
      bbox.east < europeBounds.west ||
      bbox.west > europeBounds.east
    )
  }
  
  /**
   * Start polling for vessel data in European waters
   */
  async startPolling(boundingBoxes: BoundingBox[]) {
    if (this.intervalId) {
      console.log('⚠️ OpenShipData polling already running')
      return
    }
    
    // Filter for European bounding boxes only
    const europeanBoxes = boundingBoxes.filter(bbox => 
      this.isEuropeanWaters(bbox)
    )
    
    if (europeanBoxes.length === 0) {
      console.log('ℹ️ No European waters to monitor, skipping OpenShipData')
      return
    }
    
    console.log(`📡 Starting OpenShipData polling for ${europeanBoxes.length} European regions`)
    
    // Initial fetch
    await this.fetchAllRegions(europeanBoxes)
    
    // Set up polling
    this.intervalId = setInterval(async () => {
      await this.fetchAllRegions(europeanBoxes)
    }, this.pollInterval)
  }
  
  /**
   * Stop polling
   */
  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('🛑 OpenShipData polling stopped')
    }
  }
  
  /**
   * Fetch vessels from all regions
   */
  private async fetchAllRegions(boundingBoxes: BoundingBox[]) {
    const results = await Promise.allSettled(
      boundingBoxes.map(bbox => this.fetchVesselsInBounds(bbox))
    )
    
    let totalVessels = 0
    let errors = 0
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalVessels += result.value
      } else {
        errors++
        console.error('OpenShipData fetch error:', result.reason)
      }
    }
    
    if (totalVessels > 0) {
      console.log(`🚢 OpenShipData: Updated ${totalVessels} vessels (${errors} errors)`)
    }
  }
  
  /**
   * Fetch vessels within a bounding box
   */
  async fetchVesselsInBounds(bbox: BoundingBox): Promise<number> {
    try {
      const params = new URLSearchParams({
        topLeft: `${bbox.north},${bbox.west}`,
        bottomRight: `${bbox.south},${bbox.east}`,
        source: 'AIS' // AIS only, not mobile app data (more reliable)
      })
      
      const url = `${this.baseUrl}/locations.json?${params}`
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Emergency-Alert-System/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10s timeout
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data: OpenShipDataResponse = await response.json()
      
      if (!data.reports || data.reports.length === 0) {
        return 0
      }
      
      // Process vessels
      let processed = 0
      for (const report of data.reports) {
        try {
          await this.processVesselReport(report)
          processed++
        } catch (error) {
          console.error(`Error processing vessel ${report.mmsi}:`, error)
        }
      }
      
      return processed
    } catch (error) {
      console.error('OpenShipData API error:', error)
      return 0
    }
  }
  
  /**
   * Process a single vessel report
   */
  private async processVesselReport(report: OpenShipDataReport) {
    if (!report.mmsi) {
      return // Skip vessels without MMSI
    }
    
    // Upsert vessel
    const vessel = await prisma.vessel.upsert({
      where: { mmsi: report.mmsi },
      update: {
        name: report.boatName || `Vessel ${report.mmsi}`,
        callsign: report.callSign,
        vesselType: this.mapVesselType(report.vesselType),
        length: report.lengthMeters,
        width: report.widthMeters,
        lastSeen: new Date(report.timeSecUtc * 1000),
        updatedAt: new Date()
      },
      create: {
        mmsi: report.mmsi,
        name: report.boatName || `Vessel ${report.mmsi}`,
        callsign: report.callSign,
        vesselType: this.mapVesselType(report.vesselType),
        length: report.lengthMeters,
        width: report.widthMeters,
        active: true,
        lastSeen: new Date(report.timeSecUtc * 1000)
      }
    })
    
    // Create position record
    await prisma.vesselPosition.create({
      data: {
        vesselId: vessel.id,
        latitude: report.point.latitude,
        longitude: report.point.longitude,
        speed: this.kmhToKnots(report.speedKmh),
        course: report.bearingDeg,
        timestamp: new Date(report.timeSecUtc * 1000),
        dataSource: 'openshipdata'
      }
    })
  }
  
  /**
   * Map OpenShipData vessel types to our schema
   */
  private mapVesselType(type: string): string {
    const typeMap: Record<string, string> = {
      'YACHT': 'sailing',
      'SAILBOAT': 'sailing',
      'SAILING': 'sailing',
      'MOTOR_YACHT': 'pleasure',
      'PLEASURE': 'pleasure',
      'CONSOLE_BOAT': 'pleasure',
      'FISHING': 'fishing',
      'CARGO': 'cargo',
      'CONTAINER': 'cargo',
      'TANKER': 'tanker',
      'PASSENGER': 'passenger',
      'TUG': 'tug',
      'PILOT': 'pilot',
      'DREDGER': 'dredging',
      'MILITARY': 'military',
      'HIGH_SPEED': 'high_speed'
    }
    
    return typeMap[type.toUpperCase()] || 'other'
  }
  
  /**
   * Convert km/h to knots
   */
  private kmhToKnots(kmh: number): number {
    return kmh * 0.539957
  }
  
  /**
   * Lookup specific vessel by MMSI
   */
  async lookupVessel(mmsi: string): Promise<OpenShipDataReport | null> {
    try {
      const params = new URLSearchParams({
        mmsi,
        source: 'AIS'
      })
      
      const url = `${this.baseUrl}/ship.json?${params}`
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000)
      })
      
      if (!response.ok) {
        return null
      }
      
      const data: OpenShipDataResponse = await response.json()
      return data.reports[0] || null
    } catch (error) {
      console.error(`Error looking up vessel ${mmsi}:`, error)
      return null
    }
  }
  
  /**
   * Search for vessels by name
   */
  async searchVessels(query: string, bbox?: BoundingBox): Promise<OpenShipDataReport[]> {
    try {
      const params = new URLSearchParams({
        query,
        source: 'AIS'
      })
      
      if (bbox) {
        params.append('topLeft', `${bbox.north},${bbox.west}`)
        params.append('bottomRight', `${bbox.south},${bbox.east}`)
      }
      
      const url = `${this.baseUrl}/ships.json?${params}`
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000)
      })
      
      if (!response.ok) {
        return []
      }
      
      const data: OpenShipDataResponse = await response.json()
      return data.reports || []
    } catch (error) {
      console.error('Error searching vessels:', error)
      return []
    }
  }
}
