import { prisma } from '../prisma'
import WebSocket from 'ws'
import { getFlagFromMMSI } from '../utils/mmsi-to-country'

type AISStreamMessage = {
  MessageType: string
  MetaData: {
    MMSI: string | number  // AISStream sends as number, we convert to string
    ShipName?: string
    latitude?: number
    longitude?: number
    time_utc?: string
  }
  Message?: {
    PositionReport?: {
      Latitude: number
      Longitude: number
      Cog?: number
      Sog?: number
      TrueHeading?: number
      NavigationalStatus?: number
      RateOfTurn?: number
      PositionAccuracy?: boolean
    }
    ShipStaticData?: {
      Name?: string
      Type?: number
      Destination?: string
      Eta?: string
      CallSign?: string
      ImoNumber?: number
      MaximumStaticDraught?: number
      Dimension?: {
        A?: number
        B?: number
        C?: number
        D?: number
      }
    }
  }
}

export class AISStreamService {
  private static instance: AISStreamService
  private ws: WebSocket | null = null
  private apiKey: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 5000
  private isShuttingDown = false
  
  static getInstance() {
    if (!AISStreamService.instance) {
      AISStreamService.instance = new AISStreamService()
    }
    return AISStreamService.instance
  }
  
  constructor() {
    this.apiKey = process.env.AISSTREAM_API_KEY || ''
  }
  
  connect(boundingBoxes: number[][][]) {
    if (!this.apiKey) {
      console.error('AISSTREAM_API_KEY not configured')
      return
    }
    
    this.ws = new WebSocket('wss://stream.aisstream.io/v0/stream')
    
    this.ws.on('open', () => {
      console.log('✅ Connected to AISStream.io')
      this.reconnectAttempts = 0
      
      const subscriptionMessage = {
        APIKey: this.apiKey,
        BoundingBoxes: boundingBoxes,
        FilterMessageTypes: ['PositionReport', 'ShipStaticData']
      }
      
      this.ws?.send(JSON.stringify(subscriptionMessage))
      console.log(`📡 Subscribed to ${boundingBoxes.length} bounding boxes`)
    })
    
    this.ws.on('message', async (data: WebSocket.Data) => {
      // Skip processing if shutting down
      if (this.isShuttingDown) return
      
      try {
        const message: AISStreamMessage = JSON.parse(data.toString())
        
        // Log non-vessel messages for debugging (errors, control messages)
        if (!message.MetaData?.MMSI) {
          console.log('📨 AISStream message:', JSON.stringify(message).substring(0, 200))
        }
        
        await this.processMessage(message)
      } catch (error) {
        console.error('Error processing AIS message:', error)
      }
    })
    
    this.ws.on('error', (error: Error) => {
      console.error('AISStream WebSocket error:', error)
    })
    
    this.ws.on('close', (code: number, reason: Buffer) => {
      const reasonStr = reason.toString() || 'No reason provided'
      console.log(`⚠️ Disconnected from AISStream.io (code: ${code}, reason: ${reasonStr})`)
      this.attemptReconnect(boundingBoxes)
    })
  }
  
  private attemptReconnect(boundingBoxes: number[][][]) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Reconnecting to AISStream.io (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      setTimeout(() => this.connect(boundingBoxes), this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.error('Max reconnection attempts reached. Please restart the service.')
    }
  }
  
  private isAISStreamVesselMessage(msg: unknown): msg is AISStreamMessage {
    if (!msg || typeof msg !== 'object') return false
    const m = msg as { MetaData?: { MMSI?: string | number }, MessageType?: unknown, Message?: unknown }
    if (!m.MetaData || typeof m.MetaData.MMSI === 'undefined') return false
    if (typeof m.MessageType !== 'string') return false
    return true
  }

  private async processMessage(message: unknown) {
    if (!this.isAISStreamVesselMessage(message)) return
    const mmsi = message.MetaData.MMSI?.toString()
    if (!mmsi) return
    
    if (message.MessageType === 'PositionReport' && message.Message?.PositionReport) {
      const pos = message.Message.PositionReport
      const flag = getFlagFromMMSI(mmsi)
      
      const vessel = await prisma.vessel.upsert({
        where: { mmsi },
        update: {
          lastSeen: new Date(message.MetaData.time_utc || Date.now()),
          updatedAt: new Date()
        },
        create: {
          mmsi,
          name: message.MetaData.ShipName || `Vessel ${mmsi}`,
          vesselType: 'other',
          flag: flag || undefined,
          active: true,
          lastSeen: new Date(message.MetaData.time_utc || Date.now())
        }
      })
      
      await prisma.vesselPosition.create({
        data: {
          vesselId: vessel.id,
          latitude: pos.Latitude,
          longitude: pos.Longitude,
          speed: pos.Sog,
          course: pos.Cog,
          heading: pos.TrueHeading,
          navStatus: this.mapNavStatus(pos.NavigationalStatus),
          rateOfTurn: pos.RateOfTurn !== -128 ? pos.RateOfTurn : undefined, // -128 = not available
          positionAccuracy: pos.PositionAccuracy,
          timestamp: new Date(message.MetaData.time_utc || Date.now()),
          dataSource: 'aisstream'
        }
      })
      
      console.log(`📍 Updated position for ${vessel.name} (${mmsi})`)
    }
    
    if (message.MessageType === 'ShipStaticData' && message.Message?.ShipStaticData) {
      const staticData = message.Message.ShipStaticData
      
      const flag = getFlagFromMMSI(mmsi)
      const totalLength = staticData.Dimension ? (staticData.Dimension.A || 0) + (staticData.Dimension.B || 0) : undefined
      const totalWidth = staticData.Dimension ? (staticData.Dimension.C || 0) + (staticData.Dimension.D || 0) : undefined
      const totalHeight = staticData.Dimension ? Math.max(staticData.Dimension.C || 0, staticData.Dimension.D || 0) : undefined
      
      // Filter invalid IMO numbers (0, null, or < 1000000 are invalid)
      const validImo = staticData.ImoNumber && staticData.ImoNumber >= 1000000 
        ? staticData.ImoNumber.toString() 
        : undefined
      
      // Parse ETA if provided (format: "MM-DD HH:MM")
      let etaDate: Date | undefined
      if (staticData.Eta) {
        try {
          const currentYear = new Date().getFullYear()
          const etaStr = `${currentYear}-${staticData.Eta.replace(' ', 'T')}:00Z`
          etaDate = new Date(etaStr)
          if (isNaN(etaDate.getTime())) etaDate = undefined
        } catch {
          etaDate = undefined
        }
      }
      
      const vessel = await prisma.vessel.upsert({
        where: { mmsi },
        update: {
          name: staticData.Name || `Vessel ${mmsi}`,
          callsign: staticData.CallSign,
          imo: validImo,
          vesselType: this.mapVesselType(staticData.Type),
          flag: flag || undefined,
          length: totalLength || undefined,
          width: totalWidth || undefined,
          height: totalHeight || undefined,
          draught: staticData.MaximumStaticDraught || undefined,
          lastSeen: new Date(message.MetaData.time_utc || Date.now()),
          updatedAt: new Date()
        },
        create: {
          mmsi,
          name: staticData.Name || `Vessel ${mmsi}`,
          callsign: staticData.CallSign,
          imo: validImo,
          vesselType: this.mapVesselType(staticData.Type),
          flag: flag || undefined,
          length: totalLength || undefined,
          width: totalWidth || undefined,
          height: totalHeight || undefined,
          draught: staticData.MaximumStaticDraught || undefined,
          active: true,
          lastSeen: new Date(message.MetaData.time_utc || Date.now())
        }
      })
      
      // Create a VesselPosition record with voyage-specific data (destination, eta, draught)
      // Only create if we have at least one of these voyage fields
      if (staticData.Destination || etaDate || staticData.MaximumStaticDraught) {
        // Get the last known position coordinates for this vessel
        const lastPosition = await prisma.vesselPosition.findFirst({
          where: { vesselId: vessel.id },
          orderBy: { timestamp: 'desc' },
          select: { latitude: true, longitude: true }
        })
        
        // Only create position if we have coordinates
        if (lastPosition) {
          await prisma.vesselPosition.create({
            data: {
              vesselId: vessel.id,
              latitude: lastPosition.latitude,
              longitude: lastPosition.longitude,
              destination: staticData.Destination || undefined,
              eta: etaDate,
              draught: staticData.MaximumStaticDraught || undefined,
              timestamp: new Date(message.MetaData.time_utc || Date.now()),
              dataSource: 'aisstream'
            }
          })
        }
      }
      
      console.log(`📝 Updated static data for ${staticData.Name} (${mmsi})`)
    }
  }
  
  private mapVesselType(typeCode?: number): string {
    if (!typeCode) return 'other'
    
    // Exact type codes (more specific)
    const exactTypeMap: Record<number, string> = {
      // Fishing
      30: 'fishing',
      // Towing/Tug
      31: 'tug',
      32: 'tug',
      52: 'tug',
      // Specialized
      33: 'dredging',
      34: 'diving',
      35: 'military',
      36: 'sailing',
      37: 'pleasure',
      // High speed
      40: 'high_speed',
      41: 'high_speed',
      42: 'high_speed',
      43: 'high_speed',
      44: 'high_speed',
      45: 'high_speed',
      46: 'high_speed',
      47: 'high_speed',
      48: 'high_speed',
      49: 'high_speed',
      // Pilot/Harbor
      50: 'pilot',
      51: 'search_rescue',
      53: 'port_tender',
      54: 'port_tender',
      55: 'law_enforcement',
      // Passenger
      60: 'passenger',
      61: 'passenger',
      62: 'passenger',
      63: 'passenger',
      64: 'passenger',
      65: 'passenger',
      66: 'passenger',
      67: 'passenger',
      68: 'passenger',
      69: 'passenger',
      // Cargo
      70: 'cargo',
      71: 'cargo',
      72: 'cargo',
      73: 'cargo',
      74: 'cargo',
      75: 'cargo',
      76: 'cargo',
      77: 'cargo',
      78: 'cargo',
      79: 'cargo',
      // Tanker
      80: 'tanker',
      81: 'tanker',
      82: 'tanker',
      83: 'tanker',
      84: 'tanker',
      85: 'tanker',
      86: 'tanker',
      87: 'tanker',
      88: 'tanker',
      89: 'tanker',
    }
    
    // Try exact match first
    if (exactTypeMap[typeCode]) {
      return exactTypeMap[typeCode]
    }
    
    // Fall back to category (10s)
    const category = Math.floor(typeCode / 10) * 10
    return exactTypeMap[category] || 'other'
  }
  
  private mapNavStatus(status?: number): string {
    const statusMap: Record<number, string> = {
      0: 'Under way using engine',
      1: 'At anchor',
      2: 'Not under command',
      3: 'Restricted maneuverability',
      4: 'Constrained by draught',
      5: 'Moored',
      6: 'Aground',
      7: 'Engaged in fishing',
      8: 'Under way sailing',
      15: 'Not defined'
    }
    return status !== undefined ? statusMap[status] || 'Unknown' : 'Unknown'
  }
  
  disconnect() {
    // Set shutdown flag to stop processing incoming messages
    this.isShuttingDown = true
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
      console.log('Disconnected from AISStream.io')
    }
  }
  
  async getTrackedRegions(): Promise<number[][][]> {
    const trackedVessels = await prisma.vesselContact.findMany({
      include: {
        vessel: {
          include: {
            positions: {
              orderBy: { timestamp: 'desc' },
              take: 1
            }
          }
        }
      }
    })
    
    const boundingBoxes: number[][][] = []
    
    for (const { vessel } of trackedVessels) {
      const lastPos = vessel.positions[0]
      if (lastPos) {
        const radius = 2
        boundingBoxes.push([
          [lastPos.latitude - radius, lastPos.longitude - radius],
          [lastPos.latitude + radius, lastPos.longitude + radius]
        ])
      }
    }
    
    if (boundingBoxes.length === 0) {
      boundingBoxes.push([[-90, -180], [90, 180]])
    }
    
    return boundingBoxes
  }
}
