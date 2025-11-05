/**
 * AIS Vessel Service
 * 
 * Comprehensive service for:
 * 1. Real-time AIS data ingestion (positions + static data)
 * 2. Vessel enrichment from AIS broadcasts
 * 3. Automatic vessel creation
 * 4. Position tracking and history
 * 
 * Listens to AISStream WebSocket for:
 * - Message Type 1-3: Position Reports
 * - Message Type 5: Ship Static Data
 * - Message Type 18-19: Class B Position Reports
 */

import { PrismaClient } from '@prisma/client'
import WebSocket from 'ws'

const prisma = new PrismaClient()

const AISSTREAM_API_KEY = process.env.AISSTREAM_API_KEY
const AISSTREAM_URL = 'wss://stream.aisstream.io/v0/stream'

type PositionReport = {
  MessageID: number
  UserID: number // MMSI
  Latitude: number
  Longitude: number
  Sog: number // Speed over ground
  Cog: number // Course over ground
  TrueHeading: number
  NavigationalStatus: number
  RateOfTurn: number
  Valid: boolean
}

type ShipStaticData = {
  MessageID: number
  UserID: number // MMSI
  Valid: boolean
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
  MaximumStaticDraught: number
  Destination: string
  Eta: {
    Month: number
    Day: number
    Hour: number
    Minute: number
  }
}

type AISMessage = {
  MessageType: string
  Message: {
    PositionReport?: PositionReport
    ShipStaticData?: ShipStaticData
  }
  MetaData: {
    MMSI: number
    ShipName?: string
    latitude?: number
    longitude?: number
    time_utc: string
  }
}

type ServiceStats = {
  startTime: Date
  uptime: number
  messagesReceived: number
  positionReports: number
  staticDataMessages: number
  vesselsCreated: number
  vesselsUpdated: number
  positionsRecorded: number
  errors: number
  lastMessage?: Date
  isConnected: boolean
}

export class AISVesselService {
  private ws: WebSocket | null = null
  private stats: ServiceStats = {
    startTime: new Date(),
    uptime: 0,
    messagesReceived: 0,
    positionReports: 0,
    staticDataMessages: 0,
    vesselsCreated: 0,
    vesselsUpdated: 0,
    positionsRecorded: 0,
    errors: 0,
    isConnected: false
  }
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 5000
  private statsInterval: NodeJS.Timeout | null = null

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!AISSTREAM_API_KEY
  }

  /**
   * Start the AIS vessel service
   */
  async start(options: {
    boundingBoxes?: Array<[[number, number], [number, number]]>
    enablePositionTracking?: boolean
    positionSampleRate?: number // Only record 1 in N positions
    statsIntervalSeconds?: number
    onMessage?: (message: AISMessage) => void
    onError?: (error: Error) => void
  } = {}): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('AISStream API key not configured')
    }

    if (this.ws) {
      console.log('⚠️  AIS Vessel Service already running')
      return
    }

    const enablePositionTracking = options.enablePositionTracking ?? true
    const positionSampleRate = options.positionSampleRate ?? 10 // Record 1 in 10 positions
    const statsIntervalSeconds = options.statsIntervalSeconds ?? 60

    console.log('🌊 Starting AIS Vessel Service...')
    console.log(`📍 Position tracking: ${enablePositionTracking ? 'ENABLED' : 'DISABLED'}`)
    if (enablePositionTracking) {
      console.log(`📊 Position sample rate: 1/${positionSampleRate}`)
    }

    this.ws = new WebSocket(AISSTREAM_URL)

    this.ws.on('open', () => {
      console.log('✅ Connected to AISStream')
      this.stats.isConnected = true
      this.reconnectAttempts = 0

      // Subscribe to both position reports and static data
      const subscribeMessage = {
        APIKey: AISSTREAM_API_KEY,
        BoundingBoxes: options.boundingBoxes || [
          [[-90, -180], [90, 180]] // Global coverage
        ],
        FilterMessageTypes: enablePositionTracking 
          ? ['PositionReport', 'ShipStaticData']
          : ['ShipStaticData']
      }

      this.ws?.send(JSON.stringify(subscribeMessage))
      console.log('📡 Subscribed to AIS messages')
      console.log(`   - Position Reports: ${enablePositionTracking ? 'YES' : 'NO'}`)
      console.log(`   - Ship Static Data: YES`)
    })

    this.ws.on('message', async (data: WebSocket.Data) => {
      try {
        this.stats.messagesReceived++
        this.stats.lastMessage = new Date()

        const message: AISMessage = JSON.parse(data.toString())

        // Call custom handler if provided
        if (options.onMessage) {
          options.onMessage(message)
        }

        // Handle position reports
        if (message.MessageType === 'PositionReport' && message.Message.PositionReport) {
          this.stats.positionReports++
          
          if (enablePositionTracking && this.stats.positionReports % positionSampleRate === 0) {
            await this.handlePositionReport(message.Message.PositionReport, message.MetaData)
          }
        }

        // Handle ship static data
        if (message.MessageType === 'ShipStaticData' && message.Message.ShipStaticData) {
          this.stats.staticDataMessages++
          await this.handleShipStaticData(message.Message.ShipStaticData)
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
      this.stats.isConnected = false
      if (options.onError) {
        options.onError(error)
      }
    })

    this.ws.on('close', () => {
      console.log('⚠️  AISStream connection closed')
      this.stats.isConnected = false
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

    // Start stats reporting
    if (statsIntervalSeconds > 0) {
      this.statsInterval = setInterval(() => {
        this.logStats()
      }, statsIntervalSeconds * 1000)
    }
  }

  /**
   * Stop the service
   */
  stop(): void {
    console.log('🛑 Stopping AIS Vessel Service...')
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.stats.isConnected = false
    this.logStats()
  }

  /**
   * Handle position report - update vessel position
   */
  private async handlePositionReport(position: PositionReport, metadata: any): Promise<void> {
    try {
      const mmsi = position.UserID.toString()

      // Find or create vessel
      let vessel = await prisma.vessel.findFirst({
        where: { mmsi }
      })

      if (!vessel) {
        // Create new vessel from position report
        vessel = await prisma.vessel.create({
          data: {
            mmsi,
            name: metadata.ShipName || `Vessel ${mmsi}`,
            vesselType: this.getVesselTypeFromStatus(position.NavigationalStatus),
            active: true,
            lastSeen: new Date(metadata.time_utc)
          }
        })
        this.stats.vesselsCreated++
      } else {
        // Update last seen
        await prisma.vessel.update({
          where: { id: vessel.id },
          data: {
            lastSeen: new Date(metadata.time_utc),
            active: true
          }
        })
        this.stats.vesselsUpdated++
      }

      // Record position
      await prisma.vesselPosition.create({
        data: {
          vesselId: vessel.id,
          latitude: position.Latitude,
          longitude: position.Longitude,
          speed: position.Sog,
          course: position.Cog,
          heading: position.TrueHeading,
          status: this.getNavigationalStatus(position.NavigationalStatus),
          timestamp: new Date(metadata.time_utc)
        }
      })
      this.stats.positionsRecorded++

    } catch (error) {
      console.error(`❌ Failed to handle position report for MMSI ${position.UserID}:`, error)
      this.stats.errors++
    }
  }

  /**
   * Handle ship static data - enrich vessel
   */
  private async handleShipStaticData(data: ShipStaticData): Promise<void> {
    try {
      const mmsi = data.UserID.toString()

      // Prepare vessel data
      const vesselData: any = {
        name: data.Name.trim().replace(/@+$/, ''),
        callsign: data.CallSign?.trim() || null,
        vesselType: this.getVesselType(data.Type),
        enrichedAt: new Date(),
        enrichmentSource: 'aisstream'
      }

      // Add IMO if available
      if (data.ImoNumber && data.ImoNumber > 0) {
        vesselData.imo = data.ImoNumber.toString()
      }

      // Calculate dimensions
      if (data.Dimension) {
        const length = data.Dimension.A + data.Dimension.B
        const width = data.Dimension.C + data.Dimension.D
        if (length > 0) vesselData.length = length
        if (width > 0) vesselData.width = width
      }

      // Add draught
      if (data.MaximumStaticDraught > 0) {
        vesselData.draught = data.MaximumStaticDraught
      }

      // Upsert vessel
      await prisma.vessel.upsert({
        where: { mmsi },
        create: {
          mmsi,
          ...vesselData,
          active: true
        },
        update: vesselData
      })

      this.stats.vesselsUpdated++

    } catch (error) {
      console.error(`❌ Failed to handle static data for MMSI ${data.UserID}:`, error)
      this.stats.errors++
    }
  }

  /**
   * Get navigational status string
   */
  private getNavigationalStatus(status: number): string {
    const statuses: Record<number, string> = {
      0: 'Under way using engine',
      1: 'At anchor',
      2: 'Not under command',
      3: 'Restricted manoeuvrability',
      4: 'Constrained by her draught',
      5: 'Moored',
      6: 'Aground',
      7: 'Engaged in fishing',
      8: 'Under way sailing',
      9: 'Reserved for future use',
      10: 'Reserved for future use',
      11: 'Power-driven vessel towing astern',
      12: 'Power-driven vessel pushing ahead',
      13: 'Reserved for future use',
      14: 'AIS-SART',
      15: 'Not defined'
    }
    return statuses[status] || 'Unknown'
  }

  /**
   * Get vessel type from navigational status (fallback)
   */
  private getVesselTypeFromStatus(status: number): string {
    if (status === 7) return 'Fishing'
    if (status === 8) return 'Sailing'
    return 'Unknown'
  }

  /**
   * Convert AIS vessel type code to readable string
   */
  private getVesselType(typeCode: number): string {
    const types: Record<number, string> = {
      0: 'Not available',
      20: 'Wing in ground',
      30: 'Fishing',
      31: 'Towing',
      32: 'Towing (large)',
      33: 'Dredging',
      34: 'Diving ops',
      35: 'Military ops',
      36: 'Sailing',
      37: 'Pleasure Craft',
      40: 'High speed craft',
      50: 'Pilot Vessel',
      51: 'Search and Rescue',
      52: 'Tug',
      53: 'Port Tender',
      54: 'Anti-pollution',
      55: 'Law Enforcement',
      58: 'Medical Transport',
      59: 'Noncombatant',
      60: 'Passenger',
      70: 'Cargo',
      80: 'Tanker',
      90: 'Other Type'
    }

    // Handle hazardous category variants (e.g., 71-74, 81-84)
    const baseType = Math.floor(typeCode / 10) * 10
    if (types[baseType]) {
      const category = typeCode % 10
      if (category > 0 && category <= 4) {
        return `${types[baseType]} (hazardous category ${String.fromCharCode(64 + category)})`
      }
      return types[baseType]
    }

    return types[typeCode] || `Unknown (${typeCode})`
  }

  /**
   * Get service statistics
   */
  getStats(): ServiceStats {
    this.stats.uptime = Date.now() - this.stats.startTime.getTime()
    return { ...this.stats }
  }

  /**
   * Log statistics
   */
  private logStats(): void {
    const stats = this.getStats()
    const uptimeMinutes = Math.floor(stats.uptime / 60000)
    
    console.log('\n📊 AIS Vessel Service Statistics:')
    console.log(`   Uptime: ${uptimeMinutes} minutes`)
    console.log(`   Connected: ${stats.isConnected ? '✅' : '❌'}`)
    console.log(`   Messages received: ${stats.messagesReceived.toLocaleString()}`)
    console.log(`   Position reports: ${stats.positionReports.toLocaleString()}`)
    console.log(`   Static data messages: ${stats.staticDataMessages.toLocaleString()}`)
    console.log(`   Vessels created: ${stats.vesselsCreated.toLocaleString()}`)
    console.log(`   Vessels updated: ${stats.vesselsUpdated.toLocaleString()}`)
    console.log(`   Positions recorded: ${stats.positionsRecorded.toLocaleString()}`)
    console.log(`   Errors: ${stats.errors}`)
    if (stats.lastMessage) {
      const secondsAgo = Math.floor((Date.now() - stats.lastMessage.getTime()) / 1000)
      console.log(`   Last message: ${secondsAgo}s ago`)
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.stats.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

export const aisVesselService = new AISVesselService()
