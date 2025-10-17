import { prisma } from '@/lib/prisma'
import WebSocket from 'ws'

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
    }
    ShipStaticData?: {
      Name?: string
      Type?: number
      Destination?: string
      Eta?: string
      CallSign?: string
      ImoNumber?: string
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
      try {
        const message: AISStreamMessage = JSON.parse(data.toString())
        await this.processMessage(message)
      } catch (error) {
        console.error('Error processing AIS message:', error)
      }
    })
    
    this.ws.on('error', (error: Error) => {
      console.error('AISStream WebSocket error:', error)
    })
    
    this.ws.on('close', () => {
      console.log('⚠️ Disconnected from AISStream.io')
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
  
  private async processMessage(message: AISStreamMessage) {
    const mmsi = message.MetaData.MMSI?.toString()
    if (!mmsi) return
    
    if (message.MessageType === 'PositionReport' && message.Message?.PositionReport) {
      const pos = message.Message.PositionReport
      
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
          timestamp: new Date(message.MetaData.time_utc || Date.now()),
          dataSource: 'aisstream'
        }
      })
      
      console.log(`📍 Updated position for ${vessel.name} (${mmsi})`)
    }
    
    if (message.MessageType === 'ShipStaticData' && message.Message?.ShipStaticData) {
      const staticData = message.Message.ShipStaticData
      
      await prisma.vessel.upsert({
        where: { mmsi },
        update: {
          name: staticData.Name || `Vessel ${mmsi}`,
          callsign: staticData.CallSign,
          imo: staticData.ImoNumber,
          vesselType: this.mapVesselType(staticData.Type),
          length: staticData.Dimension ? 
            (staticData.Dimension.A || 0) + (staticData.Dimension.B || 0) : undefined,
          width: staticData.Dimension ?
            (staticData.Dimension.C || 0) + (staticData.Dimension.D || 0) : undefined,
          updatedAt: new Date()
        },
        create: {
          mmsi,
          name: staticData.Name || `Vessel ${mmsi}`,
          callsign: staticData.CallSign,
          imo: staticData.ImoNumber,
          vesselType: this.mapVesselType(staticData.Type),
          length: staticData.Dimension ?
            (staticData.Dimension.A || 0) + (staticData.Dimension.B || 0) : undefined,
          width: staticData.Dimension ?
            (staticData.Dimension.C || 0) + (staticData.Dimension.D || 0) : undefined,
          active: true
        }
      })
      
      console.log(`📝 Updated static data for ${staticData.Name} (${mmsi})`)
    }
  }
  
  private mapVesselType(typeCode?: number): string {
    if (!typeCode) return 'other'
    
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
