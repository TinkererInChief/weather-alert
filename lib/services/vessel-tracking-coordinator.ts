import { AISStreamService } from './aisstream-service'
import { OpenShipDataService } from './openshipdata-service'

type Region = {
  name: string
  boundingBox: BoundingBox
  priority: 'high' | 'medium' | 'low'
}

type BoundingBox = {
  north: number
  south: number
  east: number
  west: number
}

/**
 * Coordinates multiple vessel tracking services
 * - AISStream.io: Global coverage (WebSocket streaming)
 * - OpenShipData: European waters (REST API polling)
 */
export class VesselTrackingCoordinator {
  private static instance: VesselTrackingCoordinator
  private aisStream: AISStreamService
  private openShipData: OpenShipDataService
  private isRunning = false
  
  static getInstance() {
    if (!VesselTrackingCoordinator.instance) {
      VesselTrackingCoordinator.instance = new VesselTrackingCoordinator()
    }
    return VesselTrackingCoordinator.instance
  }
  
  constructor() {
    this.aisStream = AISStreamService.getInstance()
    this.openShipData = OpenShipDataService.getInstance()
  }
  
  /**
   * Start all vessel tracking services
   */
  async start(regions?: Region[]) {
    if (this.isRunning) {
      console.log('⚠️ Vessel tracking already running')
      return
    }
    
    const monitoredRegions = regions || this.getDefaultHighRiskRegions()
    
    console.log('🚀 Starting vessel tracking services...')
    console.log(`📍 Monitoring ${monitoredRegions.length} regions`)
    
    // Convert regions to bounding boxes
    const boundingBoxes = monitoredRegions.map(r => r.boundingBox)
    
    // Start AISStream (global coverage via WebSocket)
    const aisBoundingBoxes = boundingBoxes.map(bbox => [
      [bbox.south, bbox.west],
      [bbox.north, bbox.east]
    ])
    this.aisStream.connect(aisBoundingBoxes)
    
    // Start OpenShipData (European coverage via polling)
    await this.openShipData.startPolling(boundingBoxes)
    
    this.isRunning = true
    console.log('✅ Vessel tracking services started')
    
    // Log coverage summary
    this.logCoverageSummary(monitoredRegions)
  }
  
  /**
   * Stop all vessel tracking services
   */
  stop() {
    if (!this.isRunning) {
      return
    }
    
    console.log('🛑 Stopping vessel tracking services...')
    
    this.aisStream.disconnect()
    this.openShipData.stopPolling()
    
    this.isRunning = false
    console.log('✅ Vessel tracking services stopped')
  }
  
  /**
   * Get default high-risk seismic/tsunami regions
   */
  private getDefaultHighRiskRegions(): Region[] {
    return [
      // Pacific Ring of Fire - Japan
      {
        name: 'Japan & Korean Peninsula',
        boundingBox: { north: 45, south: 30, west: 125, east: 145 },
        priority: 'high'
      },
      
      // Pacific Ring of Fire - Indonesia & Philippines
      {
        name: 'Southeast Asia',
        boundingBox: { north: 20, south: -10, west: 95, east: 135 },
        priority: 'high'
      },
      
      // Pacific Ring of Fire - US West Coast
      {
        name: 'US West Coast',
        boundingBox: { north: 50, south: 30, west: -130, east: -115 },
        priority: 'high'
      },
      
      // Pacific Ring of Fire - Chile
      {
        name: 'Chile & Peru Coast',
        boundingBox: { north: -10, south: -45, west: -80, east: -65 },
        priority: 'high'
      },
      
      // Pacific Ring of Fire - Alaska
      {
        name: 'Alaska & Aleutian Islands',
        boundingBox: { north: 65, south: 50, west: -180, east: -130 },
        priority: 'high'
      },
      
      // Mediterranean Seismic Zone
      {
        name: 'Mediterranean Sea',
        boundingBox: { north: 45, south: 30, west: -6, east: 37 },
        priority: 'high'
      },
      
      // Caribbean Seismic Zone
      {
        name: 'Caribbean & Central America',
        boundingBox: { north: 25, south: 5, west: -90, east: -60 },
        priority: 'medium'
      },
      
      // Indian Ocean - Bay of Bengal
      {
        name: 'Bay of Bengal',
        boundingBox: { north: 25, south: 5, west: 80, east: 100 },
        priority: 'medium'
      },
      
      // North Sea (moderate seismic activity)
      {
        name: 'North Sea & English Channel',
        boundingBox: { north: 60, south: 48, west: -5, east: 10 },
        priority: 'medium'
      }
    ]
  }
  
  /**
   * Log coverage summary showing which service covers which region
   */
  private logCoverageSummary(regions: Region[]) {
    console.log('\n📊 Coverage Summary:')
    console.log('─────────────────────────────────────────────────')
    
    for (const region of regions) {
      const isEuropean = this.isEuropeanRegion(region.boundingBox)
      const services = ['AISStream']
      
      if (isEuropean) {
        services.push('OpenShipData')
      }
      
      console.log(`${region.name}:`)
      console.log(`  Sources: ${services.join(' + ')}`)
      console.log(`  Priority: ${region.priority}`)
    }
    
    console.log('─────────────────────────────────────────────────\n')
  }
  
  /**
   * Check if region includes European waters
   */
  private isEuropeanRegion(bbox: BoundingBox): boolean {
    const europeBounds = {
      north: 70,
      south: 35,
      west: -15,
      east: 45
    }
    
    return !(
      bbox.south > europeBounds.north ||
      bbox.north < europeBounds.south ||
      bbox.east < europeBounds.west ||
      bbox.west > europeBounds.east
    )
  }
  
  /**
   * Add a new region to monitor
   */
  async addRegion(region: Region) {
    console.log(`➕ Adding region: ${region.name}`)
    
    const bbox = region.boundingBox
    
    // Add to AISStream
    const aisBBox = [[bbox.south, bbox.west], [bbox.north, bbox.east]]
    // Note: AISStream requires reconnection to update bounding boxes
    // For production, implement dynamic subscription updates
    
    // Add to OpenShipData (if European)
    if (this.isEuropeanRegion(bbox)) {
      await this.openShipData.startPolling([bbox])
    }
  }
  
  /**
   * Get service health status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      services: {
        aisstream: {
          name: 'AISStream.io',
          coverage: 'Global',
          method: 'WebSocket streaming',
          status: this.isRunning ? 'active' : 'stopped'
        },
        openshipdata: {
          name: 'OpenShipData',
          coverage: 'Europe/Mediterranean',
          method: 'REST API polling',
          status: this.isRunning ? 'active' : 'stopped'
        }
      }
    }
  }
}
