import { prisma } from '@/lib/prisma'

type AISPosition = {
  mmsi: string
  latitude: number
  longitude: number
  heading?: number
  speed?: number
  course?: number
  navStatus?: string
  timestamp: Date
  vesselName?: string
  vesselType?: string
  destination?: string
  eta?: Date
}

type BoundingBox = {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

export class AISService {
  private static instance: AISService
  private aishubApiKey: string
  
  static getInstance() {
    if (!AISService.instance) {
      AISService.instance = new AISService()
    }
    return AISService.instance
  }
  
  constructor() {
    this.aishubApiKey = process.env.AISHUB_API_KEY || ''
  }
  
  async fetchAISHub(bounds: BoundingBox): Promise<AISPosition[]> {
    if (!this.aishubApiKey) {
      console.warn('AISHUB_API_KEY not configured')
      return []
    }
    
    try {
      const url = `https://data.aishub.net/ws.php?username=${this.aishubApiKey}&format=1&output=json&compress=0&latmin=${bounds.minLat}&latmax=${bounds.maxLat}&lonmin=${bounds.minLon}&lonmax=${bounds.maxLon}`
      
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'EmergencyAlertSystem/1.0' }
      })
      
      if (!response.ok) {
        throw new Error(`AISHub API error: ${response.status}`)
      }
      
      const data = await response.json()
      const vessels = data[0]?.DATA || []
      
      return vessels.map((item: any) => ({
        mmsi: String(item.MMSI),
        latitude: parseFloat(item.LATITUDE),
        longitude: parseFloat(item.LONGITUDE),
        heading: item.HEADING ? parseFloat(item.HEADING) : undefined,
        speed: item.SPEED ? parseFloat(item.SPEED) : undefined,
        course: item.COURSE ? parseFloat(item.COURSE) : undefined,
        navStatus: item.NAVSTAT,
        timestamp: new Date(item.TIME * 1000),
        vesselName: item.NAME,
        vesselType: this.mapVesselType(item.TYPE),
        destination: item.DESTINATION,
        eta: item.ETA ? this.parseETA(item.ETA) : undefined
      }))
    } catch (error) {
      console.error('AISHub fetch error:', error)
      return []
    }
  }
  
  private mapVesselType(typeCode: number): string {
    const typeMap: Record<number, string> = {
      30: 'fishing',
      31: 'towing',
      32: 'towing',
      33: 'dredging',
      34: 'diving',
      35: 'military',
      36: 'sailing',
      37: 'pleasure',
      40: 'high_speed',
      50: 'pilot',
      51: 'search_rescue',
      52: 'tug',
      53: 'port_tender',
      55: 'law_enforcement',
      60: 'passenger',
      70: 'cargo',
      80: 'tanker',
      90: 'other'
    }
    
    const category = Math.floor(typeCode / 10) * 10
    return typeMap[category] || 'other'
  }
  
  private parseETA(etaString: string): Date | undefined {
    try {
      return new Date(etaString)
    } catch {
      return undefined
    }
  }
  
  async updateVesselPositions(positions: AISPosition[]) {
    for (const pos of positions) {
      if (!pos.mmsi || isNaN(pos.latitude) || isNaN(pos.longitude)) continue
      
      const vessel = await prisma.vessel.upsert({
        where: { mmsi: pos.mmsi },
        update: {
          lastSeen: pos.timestamp,
          updatedAt: new Date()
        },
        create: {
          mmsi: pos.mmsi,
          name: pos.vesselName || `Vessel ${pos.mmsi}`,
          vesselType: pos.vesselType || 'other',
          active: true,
          lastSeen: pos.timestamp
        }
      })
      
      await prisma.vesselPosition.create({
        data: {
          vesselId: vessel.id,
          latitude: pos.latitude,
          longitude: pos.longitude,
          heading: pos.heading,
          speed: pos.speed,
          course: pos.course,
          navStatus: pos.navStatus,
          destination: pos.destination,
          eta: pos.eta,
          timestamp: pos.timestamp,
          dataSource: 'aishub'
        }
      })
    }
    
    return positions.length
  }
  
  async getTrackedVessels(): Promise<string[]> {
    const tracked = await prisma.vesselContact.findMany({
      select: { vessel: { select: { mmsi: true } } },
      distinct: ['vesselId']
    })
    return tracked.map(t => t.vessel.mmsi)
  }
  
  async fetchTrackedVesselsPositions(): Promise<AISPosition[]> {
    const mmsiList = await this.getTrackedVessels()
    if (mmsiList.length === 0) return []
    
    const regions: BoundingBox[] = [
      { minLat: 20, maxLat: 60, minLon: -180, maxLon: -120 },
      { minLat: 0, maxLat: 60, minLon: -80, maxLon: 0 },
      { minLat: -40, maxLat: 40, minLon: 80, maxLon: 180 }
    ]
    
    const allPositions: AISPosition[] = []
    
    for (const region of regions) {
      const positions = await this.fetchAISHub(region)
      allPositions.push(...positions.filter(p => mmsiList.includes(p.mmsi)))
    }
    
    return allPositions
  }
}
