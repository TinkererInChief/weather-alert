import { PrismaClient } from '@prisma/client'
import { marinesiaService } from './marinesia.service'

const prisma = new PrismaClient()

type EnrichmentResult = {
  processed: number
  enriched: number
  failed: number
  skipped: number
  errors: string[]
  duration: number
}

type EnrichmentStats = {
  totalVessels: number
  enrichedVessels: number
  missingIMO: number
  missingType: number
  missingDimensions: number
  averageEnrichmentScore: number
}

export class VesselEnrichmentService {
  /**
   * Enrich vessels with Marinesia data
   */
  async enrichVessels(options: {
    batchSize?: number
    limit?: number
    onlyMissing?: boolean
    mmsiList?: number[]
  } = {}): Promise<EnrichmentResult> {
    const startTime = Date.now()
    const result: EnrichmentResult = {
      processed: 0,
      enriched: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      duration: 0
    }

    const batchSize = options.batchSize || 50
    const limit = options.limit || 1000

    try {
      console.log('🚢 Starting vessel enrichment...')
      
      // Get vessels to enrich
      const where: any = {}
      
      if (options.mmsiList && options.mmsiList.length > 0) {
        where.mmsi = { in: options.mmsiList }
      } else if (options.onlyMissing) {
        // Only enrich vessels missing key data
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
          imo: true,
          name: true,
          vesselType: true,
          length: true,
          width: true,
          draught: true
        }
      })

      console.log(`📊 Found ${vessels.length} vessels to enrich`)

      // Process in batches to avoid rate limits
      for (let i = 0; i < vessels.length; i += batchSize) {
        const batch = vessels.slice(i, i + batchSize)
        console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vessels.length / batchSize)}`)

        await Promise.all(
          batch.map(async (vessel) => {
            try {
              result.processed++

              // Fetch vessel profile from Marinesia
              const profile = await marinesiaService.getVesselProfile(parseInt(vessel.mmsi))

              if (!profile) {
                result.skipped++
                if (result.processed % 100 === 0) {
                  console.log(`⚠️  No data found for MMSI ${vessel.mmsi}`)
                }
                return
              }

              // Determine what needs updating
              const updates: any = {}
              let hasUpdates = false

              if (!vessel.imo && profile.imo) {
                updates.imo = profile.imo.toString()
                hasUpdates = true
              }

              if (!vessel.vesselType && profile.ship_type) {
                updates.vesselType = profile.ship_type
                hasUpdates = true
              }

              if (!vessel.length && profile.length) {
                updates.length = profile.length
                hasUpdates = true
              }

              if (!vessel.width && profile.width) {
                updates.width = profile.width
                hasUpdates = true
              }

              // Add additional fields
              if (profile.callsign) {
                updates.callsign = profile.callsign
                hasUpdates = true
              }

              if (profile.country) {
                updates.flag = profile.country
                hasUpdates = true
              }

              // Calculate dimensions from dimension_a, b, c, d if length/width not available
              if (!updates.length && profile.dimension_a && profile.dimension_b) {
                updates.length = profile.dimension_a + profile.dimension_b
                hasUpdates = true
              }

              if (!updates.width && profile.dimension_c && profile.dimension_d) {
                updates.width = profile.dimension_c + profile.dimension_d
                hasUpdates = true
              }

              if (hasUpdates) {
                await prisma.vessel.update({
                  where: { id: vessel.id },
                  data: updates
                })

                result.enriched++

                if (result.enriched % 50 === 0) {
                  console.log(`✅ Enriched ${result.enriched} vessels...`)
                }
              } else {
                result.skipped++
              }

            } catch (error) {
              result.failed++
              const errorMsg = error instanceof Error ? error.message : 'Unknown error'
              result.errors.push(`MMSI ${vessel.mmsi}: ${errorMsg}`)
              
              if (result.failed <= 5) {
                console.error(`❌ Failed to enrich MMSI ${vessel.mmsi}:`, errorMsg)
              }
            }
          })
        )

        // Rate limiting: wait between batches
        if (i + batchSize < vessels.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      result.duration = Date.now() - startTime

      console.log('\n✅ Vessel enrichment complete!')
      console.log(`📊 Results:`)
      console.log(`   - Processed: ${result.processed}`)
      console.log(`   - Enriched: ${result.enriched}`)
      console.log(`   - Skipped: ${result.skipped}`)
      console.log(`   - Failed: ${result.failed}`)
      console.log(`   - Duration: ${(result.duration / 1000).toFixed(2)}s`)

      if (result.errors.length > 0) {
        console.log(`\n⚠️  Errors (${result.errors.length}):`)
        result.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`))
        if (result.errors.length > 10) {
          console.log(`   ... and ${result.errors.length - 10} more`)
        }
      }

      return result

    } catch (error) {
      console.error('❌ Vessel enrichment failed:', error)
      throw error
    }
  }

  /**
   * Enrich a single vessel by MMSI
   */
  async enrichVessel(mmsi: number): Promise<boolean> {
    try {
      const vessel = await prisma.vessel.findFirst({
        where: { mmsi: mmsi.toString() }
      })

      if (!vessel) {
        console.log(`⚠️  Vessel with MMSI ${mmsi} not found in database`)
        return false
      }

      const profile = await marinesiaService.getVesselProfile(mmsi)

      if (!profile) {
        console.log(`⚠️  No Marinesia data found for MMSI ${mmsi}`)
        return false
      }

      const updates: any = {}

      if (profile.imo) updates.imo = profile.imo
      if (profile.ship_type) updates.vesselType = profile.ship_type
      if (profile.callsign) updates.callsign = profile.callsign
      if (profile.country) updates.flag = profile.country
      if (profile.length) updates.length = profile.length
      if (profile.width) updates.width = profile.width

      // Calculate dimensions from dimension_a, b, c, d
      if (!updates.length && profile.dimension_a && profile.dimension_b) {
        updates.length = profile.dimension_a + profile.dimension_b
      }
      if (!updates.width && profile.dimension_c && profile.dimension_d) {
        updates.width = profile.dimension_c + profile.dimension_d
      }

      if (Object.keys(updates).length > 0) {
        await prisma.vessel.update({
          where: { id: vessel.id },
          data: updates
        })

        console.log(`✅ Enriched vessel ${vessel.name || mmsi}`)
        console.log(`   Updates:`, updates)
        return true
      } else {
        console.log(`⚠️  No new data to add for vessel ${vessel.name || mmsi}`)
        return false
      }

    } catch (error) {
      console.error(`❌ Failed to enrich vessel ${mmsi}:`, error)
      return false
    }
  }

  /**
   * Get enrichment statistics
   */
  async getEnrichmentStats(): Promise<EnrichmentStats> {
    const [
      totalVessels,
      enrichedVessels,
      missingIMO,
      missingType,
      missingDimensions
    ] = await Promise.all([
      prisma.vessel.count(),
      prisma.vessel.count({
        where: {
          AND: [
            { imo: { not: null } },
            { vesselType: { not: '' } }
          ]
        }
      }),
      prisma.vessel.count({ where: { imo: null } }),
      prisma.vessel.count({ where: { vesselType: '' } }),
      prisma.vessel.count({
        where: {
          OR: [
            { length: null },
            { width: null }
          ]
        }
      })
    ])

    const averageEnrichmentScore = totalVessels > 0
      ? Math.round((enrichedVessels / totalVessels) * 100)
      : 0

    return {
      totalVessels,
      enrichedVessels,
      missingIMO,
      missingType,
      missingDimensions,
      averageEnrichmentScore
    }
  }

  /**
   * Get vessels needing enrichment
   */
  async getVesselsNeedingEnrichment(limit: number = 100) {
    return prisma.vessel.findMany({
      where: {
        OR: [
          { imo: null },
          { length: null }
        ]
      },
      take: limit,
      select: {
        id: true,
        mmsi: true,
        name: true,
        imo: true,
        vesselType: true,
        length: true,
        width: true
      }
    })
  }
}

export const vesselEnrichmentService = new VesselEnrichmentService()
