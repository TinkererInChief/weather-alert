/**
 * Vessel Sync Service
 * 
 * Comprehensive vessel data synchronization using multiple sources:
 * 1. Marinesia API - On-demand enrichment and discovery
 * 2. AISStream - Real-time enrichment from AIS broadcasts
 * 
 * Strategies:
 * - Backfill: Enrich existing vessels with missing data
 * - Discovery: Find new vessels in geographic areas
 * - Real-time: Continuous enrichment from AIS
 */

import { PrismaClient } from '@prisma/client'
import { marinesiaService } from './marinesia.service'
import { aisVesselService } from './ais-vessel-service'

const prisma = new PrismaClient()

type SyncStats = {
  startTime: Date
  duration: number
  marinesia: {
    vesselsEnriched: number
    vesselsDiscovered: number
    apiCalls: number
    errors: number
  }
  aisstream: {
    vesselsEnriched: number
    vesselsCreated: number
    positionsRecorded: number
    staticDataMessages: number
  }
  total: {
    vesselsProcessed: number
    newVessels: number
    enrichedVessels: number
  }
}

export class VesselSyncService {
  private syncStats: SyncStats = {
    startTime: new Date(),
    duration: 0,
    marinesia: {
      vesselsEnriched: 0,
      vesselsDiscovered: 0,
      apiCalls: 0,
      errors: 0
    },
    aisstream: {
      vesselsEnriched: 0,
      vesselsCreated: 0,
      positionsRecorded: 0,
      staticDataMessages: 0
    },
    total: {
      vesselsProcessed: 0,
      newVessels: 0,
      enrichedVessels: 0
    }
  }

  /**
   * Start comprehensive vessel sync
   * Combines AISStream real-time + Marinesia backfill
   */
  async startSync(options: {
    // AISStream options
    enableAISStream?: boolean
    aisBoundingBoxes?: Array<[[number, number], [number, number]]>
    enablePositionTracking?: boolean
    
    // Marinesia options
    enableMarinesia?: boolean
    marinesiaRegions?: Array<{
      name: string
      bounds: { lat_min: number; lat_max: number; long_min: number; long_max: number }
    }>
    marinesiaInterval?: number // Minutes between scans
    
    // General options
    onProgress?: (stats: SyncStats) => void
  } = {}): Promise<void> {
    const enableAISStream = options.enableAISStream ?? true
    const enableMarinesia = options.enableMarinesia ?? true
    const marinesiaInterval = options.marinesiaInterval ?? 60 // 1 hour default

    console.log('🔄 Starting Vessel Sync Service')
    console.log('=' .repeat(60))
    console.log(`   AISStream: ${enableAISStream ? '✅ ENABLED' : '❌ DISABLED'}`)
    console.log(`   Marinesia: ${enableMarinesia ? '✅ ENABLED' : '❌ DISABLED'}`)
    console.log('=' .repeat(60))

    // Start AISStream for real-time enrichment
    if (enableAISStream && aisVesselService.isConfigured()) {
      console.log('\n🌊 Starting AISStream real-time enrichment...')
      
      await aisVesselService.start({
        boundingBoxes: options.aisBoundingBoxes,
        enablePositionTracking: options.enablePositionTracking ?? true,
        statsIntervalSeconds: 300, // 5 minutes
        
        onMessage: () => {
          // Update stats from AISStream
          const aisStats = aisVesselService.getStats()
          this.syncStats.aisstream = {
            vesselsEnriched: aisStats.vesselsUpdated,
            vesselsCreated: aisStats.vesselsCreated,
            positionsRecorded: aisStats.positionsRecorded,
            staticDataMessages: aisStats.staticDataMessages
          }
          
          if (options.onProgress) {
            options.onProgress(this.getStats())
          }
        }
      })
    }

    // Start Marinesia periodic discovery and enrichment
    if (enableMarinesia && marinesiaService.isConfigured()) {
      console.log('\n🗺️  Starting Marinesia periodic sync...')
      
      // Initial scan
      await this.runMarinesiaScan(options.marinesiaRegions)
      
      // Schedule periodic scans
      setInterval(async () => {
        console.log('\n🔄 Running scheduled Marinesia scan...')
        await this.runMarinesiaScan(options.marinesiaRegions)
        
        if (options.onProgress) {
          options.onProgress(this.getStats())
        }
      }, marinesiaInterval * 60 * 1000)
    }

    console.log('\n✅ Vessel Sync Service started successfully')
    console.log('   Real-time enrichment: AISStream')
    console.log('   Periodic discovery: Marinesia')
  }

  /**
   * Run Marinesia scan for vessel discovery and enrichment
   */
  private async runMarinesiaScan(regions?: Array<{
    name: string
    bounds: { lat_min: number; lat_max: number; long_min: number; long_max: number }
  }>): Promise<void> {
    const defaultRegions = regions || [
      {
        name: 'Singapore Strait',
        bounds: { lat_min: 1.0, lat_max: 1.5, long_min: 103.5, long_max: 104.5 }
      },
      {
        name: 'North Atlantic',
        bounds: { lat_min: 30, lat_max: 60, long_min: -80, long_max: 0 }
      },
      {
        name: 'Mediterranean',
        bounds: { lat_min: 30, lat_max: 46, long_min: -6, long_max: 37 }
      }
    ]

    for (const region of defaultRegions) {
      console.log(`\n📍 Scanning ${region.name}...`)
      
      try {
        // Get vessels in this region from Marinesia
        const vessels = await marinesiaService.getVesselsNearby(region.bounds)
        this.syncStats.marinesia.apiCalls++

        console.log(`   Found ${vessels.length} vessels in ${region.name}`)

        // Limit vessels per region to avoid rate limits
        const limitedVessels = vessels.slice(0, 20) // Process max 20 vessels per region
        console.log(`   Processing ${limitedVessels.length} vessels...`)

        // Process each vessel
        for (const vessel of limitedVessels) {
          try {
            // Check if vessel exists in database
            const existing = await prisma.vessel.findFirst({
              where: { mmsi: vessel.mmsi.toString() }
            })

            if (existing) {
              // Enrich existing vessel if missing data
              if (!existing.imo || !existing.length) {
                const profile = await marinesiaService.getVesselProfile(vessel.mmsi)
                this.syncStats.marinesia.apiCalls++

                if (profile) {
                  const updates: any = {}
                  
                  if (!existing.imo && profile.imo) {
                    updates.imo = profile.imo.toString()
                  }
                  if (!existing.length && profile.length) {
                    updates.length = profile.length
                  }
                  if (!existing.width && profile.width) {
                    updates.width = profile.width
                  }
                  if (profile.callsign) {
                    updates.callsign = profile.callsign
                  }
                  if (profile.country) {
                    updates.flag = profile.country
                  }

                  if (Object.keys(updates).length > 0) {
                    updates.enrichedAt = new Date()
                    updates.enrichmentSource = 'marinesia'

                    await prisma.vessel.update({
                      where: { id: existing.id },
                      data: updates
                    })

                    this.syncStats.marinesia.vesselsEnriched++
                    console.log(`   ✅ Enriched: ${vessel.name} (MMSI: ${vessel.mmsi})`)
                  }
                }

                // Rate limiting - longer delay to avoid 429
                await this.delay(500)
              }
            } else {
              // Discover new vessel
              const profile = await marinesiaService.getVesselProfile(vessel.mmsi)
              this.syncStats.marinesia.apiCalls++

              if (profile) {
                await prisma.vessel.create({
                  data: {
                    mmsi: vessel.mmsi.toString(),
                    name: profile.name || vessel.name,
                    imo: profile.imo?.toString(),
                    callsign: profile.callsign,
                    vesselType: profile.ship_type || vessel.type,
                    flag: profile.country || vessel.flag,
                    length: profile.length,
                    width: profile.width,
                    active: true,
                    enrichedAt: new Date(),
                    enrichmentSource: 'marinesia'
                  }
                })

                this.syncStats.marinesia.vesselsDiscovered++
                console.log(`   🆕 Discovered: ${profile.name} (IMO: ${profile.imo})`)
              }

              // Rate limiting - longer delay to avoid 429
              await this.delay(500)
            }

          } catch (error) {
            this.syncStats.marinesia.errors++
            if (error instanceof Error && error.message.includes('429')) {
              console.log('   ⚠️  Rate limit hit, pausing...')
              await this.delay(5000)
            }
          }
        }

        // Delay between regions to avoid rate limits
        await this.delay(2000)

      } catch (error) {
        console.error(`   ❌ Error scanning ${region.name}:`, error)
        this.syncStats.marinesia.errors++
      }
    }

    console.log('\n📊 Marinesia scan complete')
    console.log(`   Vessels enriched: ${this.syncStats.marinesia.vesselsEnriched}`)
    console.log(`   Vessels discovered: ${this.syncStats.marinesia.vesselsDiscovered}`)
    console.log(`   API calls: ${this.syncStats.marinesia.apiCalls}`)
    console.log(`   Errors: ${this.syncStats.marinesia.errors}`)
  }

  /**
   * Backfill existing vessels with Marinesia data
   */
  async backfillVessels(options: {
    limit?: number
    batchSize?: number
    onlyMissing?: boolean
  } = {}): Promise<void> {
    const limit = options.limit || 1000
    const batchSize = options.batchSize || 10
    const onlyMissing = options.onlyMissing ?? true

    console.log('🔄 Starting Marinesia backfill...')
    console.log(`   Limit: ${limit} vessels`)
    console.log(`   Batch size: ${batchSize}`)
    console.log(`   Only missing data: ${onlyMissing}`)

    // Get vessels needing enrichment
    const where: any = {}
    if (onlyMissing) {
      where.OR = [
        { imo: null },
        { length: null }
      ]
    }

    const vessels = await prisma.vessel.findMany({
      where,
      take: limit,
      select: {
        id: true,
        mmsi: true,
        name: true,
        imo: true,
        length: true,
        width: true
      }
    })

    console.log(`📊 Found ${vessels.length} vessels to backfill\n`)

    // Process in batches
    for (let i = 0; i < vessels.length; i += batchSize) {
      const batch = vessels.slice(i, i + batchSize)
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vessels.length / batchSize)}`)

      await Promise.all(
        batch.map(async (vessel) => {
          try {
            const profile = await marinesiaService.getVesselProfile(parseInt(vessel.mmsi))
            this.syncStats.marinesia.apiCalls++

            if (profile) {
              const updates: any = {}

              if (!vessel.imo && profile.imo) {
                updates.imo = profile.imo.toString()
              }
              if (!vessel.length && profile.length) {
                updates.length = profile.length
              }
              if (!vessel.width && profile.width) {
                updates.width = profile.width
              }

              if (Object.keys(updates).length > 0) {
                updates.enrichedAt = new Date()
                updates.enrichmentSource = 'marinesia'

                await prisma.vessel.update({
                  where: { id: vessel.id },
                  data: updates
                })

                this.syncStats.marinesia.vesselsEnriched++
              }
            }
          } catch (error) {
            this.syncStats.marinesia.errors++
            if (error instanceof Error && error.message.includes('429')) {
              console.log('⚠️  Rate limit hit')
            }
          }
        })
      )

      // Rate limiting between batches
      await this.delay(1000)
    }

    console.log('\n✅ Backfill complete')
    console.log(`   Vessels enriched: ${this.syncStats.marinesia.vesselsEnriched}`)
    console.log(`   API calls: ${this.syncStats.marinesia.apiCalls}`)
    console.log(`   Errors: ${this.syncStats.marinesia.errors}`)
  }

  /**
   * Stop all sync services
   */
  stop(): void {
    console.log('🛑 Stopping Vessel Sync Service...')
    aisVesselService.stop()
    this.logFinalStats()
  }

  /**
   * Get current statistics
   */
  getStats(): SyncStats {
    this.syncStats.duration = Date.now() - this.syncStats.startTime.getTime()
    this.syncStats.total = {
      vesselsProcessed: this.syncStats.marinesia.vesselsEnriched + this.syncStats.aisstream.vesselsEnriched,
      newVessels: this.syncStats.marinesia.vesselsDiscovered + this.syncStats.aisstream.vesselsCreated,
      enrichedVessels: this.syncStats.marinesia.vesselsEnriched + this.syncStats.aisstream.vesselsEnriched
    }
    return { ...this.syncStats }
  }

  /**
   * Log final statistics
   */
  private logFinalStats(): void {
    const stats = this.getStats()
    const uptimeMinutes = Math.floor(stats.duration / 60000)

    console.log('\n📊 Final Vessel Sync Statistics')
    console.log('=' .repeat(60))
    console.log(`   Total runtime: ${uptimeMinutes} minutes`)
    console.log('\n🗺️  Marinesia:')
    console.log(`   Vessels enriched: ${stats.marinesia.vesselsEnriched}`)
    console.log(`   Vessels discovered: ${stats.marinesia.vesselsDiscovered}`)
    console.log(`   API calls: ${stats.marinesia.apiCalls}`)
    console.log(`   Errors: ${stats.marinesia.errors}`)
    console.log('\n🌊 AISStream:')
    console.log(`   Vessels enriched: ${stats.aisstream.vesselsEnriched}`)
    console.log(`   Vessels created: ${stats.aisstream.vesselsCreated}`)
    console.log(`   Static data messages: ${stats.aisstream.staticDataMessages}`)
    console.log(`   Positions recorded: ${stats.aisstream.positionsRecorded}`)
    console.log('\n📈 Total:')
    console.log(`   Vessels processed: ${stats.total.vesselsProcessed}`)
    console.log(`   New vessels: ${stats.total.newVessels}`)
    console.log(`   Enriched vessels: ${stats.total.enrichedVessels}`)
    console.log('=' .repeat(60))
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const vesselSyncService = new VesselSyncService()
