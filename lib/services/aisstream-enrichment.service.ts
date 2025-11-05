import { PrismaClient } from '@prisma/client'
import WebSocket from 'ws'

const prisma = new PrismaClient()

const AISSTREAM_API_KEY = process.env.AISSTREAM_API_KEY
const AISSTREAM_URL = 'wss://stream.aisstream.io/v0/stream'

type ShipStaticData = {
  MessageID: number
  RepeatIndicator: number
  UserID: number // MMSI
  Valid: boolean
  AisVersion: number
  ImoNumber: number
  CallSign: string
  Name: string
  Type: number
  Dimension: {
    A: number
    B: number
    C: number
    D: number
  }
  FixType: number
  Eta: {
    Month: number
    Day: number
    Hour: number
    Minute: number
  }
  MaximumStaticDraught: number
  Destination: string
  Dte: boolean
  Spare: boolean
}

type AISMessage = {
  MessageType: string
  Message: {
    PositionReport?: any
    ShipStaticData?: ShipStaticData
  }
  MetaData: {
    MMSI: number
    ShipName?: string
    latitude?: number
    longitude?: number
    time_utc?: string
  }
}

type EnrichmentStats = {
  messagesReceived: number
  staticDataMessages: number
  vesselsEnriched: number
  vesselsCreated: number
  errors: number
  startTime: Date
  uptime: number
}

export class AISStreamEnrichmentService {
  private ws: WebSocket | null = null
  private stats: EnrichmentStats = {
    messagesReceived: 0,
    staticDataMessages: 0,
    vesselsEnriched: 0,
    vesselsCreated: 0,
    errors: 0,
    startTime: new Date(),
    uptime: 0
  }
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 5000

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!AISSTREAM_API_KEY
  }

  /**
   * Start listening to AISStream for ship static data
   */
  async start(options: {
    boundingBoxes?: Array<[[number, number], [number, number]]>
    onStaticData?: (data: ShipStaticData) => void
    onError?: (error: Error) => void
  } = {}): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('AISStream API key not configured')
    }

    if (this.ws) {
      console.log('⚠️  AISStream already connected')
      return
    }

    console.log('🌊 Connecting to AISStream...')

    this.ws = new WebSocket(AISSTREAM_URL)

    this.ws.on('open', () => {
      console.log('✅ Connected to AISStream')
      this.reconnectAttempts = 0

      // Subscribe to messages
      const subscribeMessage = {
        APIKey: AISSTREAM_API_KEY,
        BoundingBoxes: options.boundingBoxes || [
          [[-90, -180], [90, 180]] // Global coverage
        ],
        FilterMessageTypes: ['ShipStaticData'] // Only static data messages
      }

      this.ws?.send(JSON.stringify(subscribeMessage))
      console.log('📡 Subscribed to Ship Static Data messages')
    })

    this.ws.on('message', async (data: WebSocket.Data) => {
      try {
        this.stats.messagesReceived++

        const message: AISMessage = JSON.parse(data.toString())

        if (message.MessageType === 'ShipStaticData' && message.Message.ShipStaticData) {
          this.stats.staticDataMessages++

          const staticData = message.Message.ShipStaticData

          // Call custom handler if provided
          if (options.onStaticData) {
            options.onStaticData(staticData)
          }

          // Enrich vessel in database
          await this.enrichVesselFromStaticData(staticData)

          // Log progress every 100 messages
          if (this.stats.staticDataMessages % 100 === 0) {
            console.log(`📊 Processed ${this.stats.staticDataMessages} static data messages`)
            console.log(`   Enriched: ${this.stats.vesselsEnriched}, Created: ${this.stats.vesselsCreated}`)
          }
        }
      } catch (error) {
        this.stats.errors++
        console.error('❌ Error processing AIS message:', error)
        if (options.onError) {
          options.onError(error as Error)
        }
      }
    })

    this.ws.on('error', (error) => {
      console.error('❌ AISStream WebSocket error:', error)
      if (options.onError) {
        options.onError(error)
      }
    })

    this.ws.on('close', () => {
      console.log('⚠️  AISStream connection closed')
      this.ws = null

      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        console.log(`🔄 Reconnecting in ${this.reconnectDelay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        setTimeout(() => this.start(options), this.reconnectDelay)
      } else {
        console.error('❌ Max reconnection attempts reached')
      }
    })
  }

  /**
   * Stop listening to AISStream
   */
  stop(): void {
    if (this.ws) {
      console.log('🛑 Closing AISStream connection...')
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * Enrich vessel from AIS static data
   */
  private async enrichVesselFromStaticData(data: ShipStaticData): Promise<void> {
    try {
      const mmsi = data.UserID.toString()

      // Check if vessel exists
      let vessel = await prisma.vessel.findFirst({
        where: { mmsi }
      })

      const updates: any = {
        name: data.Name.trim().replace(/@+$/, ''), // Remove trailing @ characters
        callsign: data.CallSign?.trim() || null,
        vesselType: this.getVesselType(data.Type),
        enrichedAt: new Date(),
        enrichmentSource: 'aisstream'
      }

      // Add IMO if available
      if (data.ImoNumber && data.ImoNumber > 0) {
        updates.imo = data.ImoNumber.toString()
      }

      // Calculate dimensions from A, B, C, D
      if (data.Dimension) {
        const length = data.Dimension.A + data.Dimension.B
        const width = data.Dimension.C + data.Dimension.D

        if (length > 0) updates.length = length
        if (width > 0) updates.width = width
      }

      // Add draught
      if (data.MaximumStaticDraught > 0) {
        updates.draught = data.MaximumStaticDraught
      }

      if (vessel) {
        // Update existing vessel
        await prisma.vessel.update({
          where: { id: vessel.id },
          data: updates
        })
        this.stats.vesselsEnriched++
      } else {
        // Create new vessel
        await prisma.vessel.create({
          data: {
            mmsi,
            ...updates,
            active: true
          }
        })
        this.stats.vesselsCreated++
      }
    } catch (error) {
      console.error(`❌ Failed to enrich vessel MMSI ${data.UserID}:`, error)
      this.stats.errors++
    }
  }

  /**
   * Convert AIS vessel type code to readable string
   */
  private getVesselType(typeCode: number): string {
    const types: Record<number, string> = {
      0: 'Not available',
      20: 'Wing in ground',
      21: 'Wing in ground (hazardous category A)',
      22: 'Wing in ground (hazardous category B)',
      23: 'Wing in ground (hazardous category C)',
      24: 'Wing in ground (hazardous category D)',
      30: 'Fishing',
      31: 'Towing',
      32: 'Towing (length exceeds 200m or breadth exceeds 25m)',
      33: 'Dredging or underwater ops',
      34: 'Diving ops',
      35: 'Military ops',
      36: 'Sailing',
      37: 'Pleasure Craft',
      40: 'High speed craft',
      41: 'High speed craft (hazardous category A)',
      42: 'High speed craft (hazardous category B)',
      43: 'High speed craft (hazardous category C)',
      44: 'High speed craft (hazardous category D)',
      50: 'Pilot Vessel',
      51: 'Search and Rescue vessel',
      52: 'Tug',
      53: 'Port Tender',
      54: 'Anti-pollution equipment',
      55: 'Law Enforcement',
      56: 'Spare - Local Vessel',
      57: 'Spare - Local Vessel',
      58: 'Medical Transport',
      59: 'Noncombatant ship',
      60: 'Passenger',
      61: 'Passenger (hazardous category A)',
      62: 'Passenger (hazardous category B)',
      63: 'Passenger (hazardous category C)',
      64: 'Passenger (hazardous category D)',
      70: 'Cargo',
      71: 'Cargo (hazardous category A)',
      72: 'Cargo (hazardous category B)',
      73: 'Cargo (hazardous category C)',
      74: 'Cargo (hazardous category D)',
      80: 'Tanker',
      81: 'Tanker (hazardous category A)',
      82: 'Tanker (hazardous category B)',
      83: 'Tanker (hazardous category C)',
      84: 'Tanker (hazardous category D)',
      90: 'Other Type',
      91: 'Other Type (hazardous category A)',
      92: 'Other Type (hazardous category B)',
      93: 'Other Type (hazardous category C)',
      94: 'Other Type (hazardous category D)'
    }

    return types[typeCode] || `Unknown (${typeCode})`
  }

  /**
   * Get enrichment statistics
   */
  getStats(): EnrichmentStats {
    this.stats.uptime = Date.now() - this.stats.startTime.getTime()
    return { ...this.stats }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

export const aisstreamEnrichmentService = new AISStreamEnrichmentService()
