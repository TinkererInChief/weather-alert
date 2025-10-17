/**
 * Batch Vessel Enrichment Script
 * 
 * Enriches vessel metadata (gross tonnage, owner, operator) from external sources.
 * Prioritizes high-value vessels (large commercial ships) for enrichment.
 * 
 * Usage:
 *   tsx scripts/enrich-vessels-batch.ts
 *   tsx scripts/enrich-vessels-batch.ts --limit 100
 *   tsx scripts/enrich-vessels-batch.ts --force  # Re-enrich even if already enriched
 */

import { prisma } from '../lib/prisma'
import { EquasisEnricher } from '../lib/enrichment/equasis-enricher'

type EnrichmentPriority = 'high' | 'medium' | 'low'

interface VesselToEnrich {
  id: string
  mmsi: string
  imo: string | null
  name: string
  vesselType: string
  length: number | null
  priority: EnrichmentPriority
}

async function getVesselsNeedingEnrichment(
  limit: number = 100,
  force: boolean = false
): Promise<VesselToEnrich[]> {
  const enrichmentFilter = force
    ? {} // Re-enrich all vessels
    : {
        enrichedAt: null, // Only vessels never enriched
      }

  // Get vessels that need enrichment
  const vessels = await prisma.vessel.findMany({
    where: {
      imo: { not: null }, // Must have IMO number for enrichment
      active: true,
      ...enrichmentFilter,
    },
    select: {
      id: true,
      mmsi: true,
      imo: true,
      name: true,
      vesselType: true,
      length: true,
      enrichedAt: true,
    },
    take: limit * 3, // Get more than we need for priority filtering
  })

  // Assign priority based on vessel characteristics
  const prioritized = vessels.map((vessel) => {
    let priority: EnrichmentPriority = 'low'

    // High priority: Large commercial vessels
    if (
      vessel.length &&
      vessel.length >= 100 &&
      ['cargo', 'tanker', 'passenger'].includes(vessel.vesselType)
    ) {
      priority = 'high'
    }
    // Medium priority: Mid-size commercial or any large vessel
    else if (
      (vessel.length && vessel.length >= 50) ||
      ['cargo', 'tanker', 'passenger', 'tug'].includes(vessel.vesselType)
    ) {
      priority = 'medium'
    }

    return {
      ...vessel,
      priority,
    }
  })

  // Sort by priority (high first)
  const sorted = prioritized.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  // Return requested limit
  return sorted.slice(0, limit) as VesselToEnrich[]
}

async function enrichVessel(vessel: VesselToEnrich): Promise<boolean> {
  if (!vessel.imo) {
    console.log(`❌ ${vessel.mmsi}: No IMO number`)
    return false
  }

  try {
    const enricher = EquasisEnricher.getInstance()
    const data = await enricher.enrichVessel(vessel.imo)

    if (!data) {
      console.log(`ℹ️  ${vessel.mmsi}: No enrichment data available`)
      return false
    }

    // Validate data
    if (!enricher.validateData(data)) {
      console.log(`⚠️  ${vessel.mmsi}: Data validation failed`)
      return false
    }

    // Update vessel with enriched data
    await prisma.vessel.update({
      where: { id: vessel.id },
      data: {
        grossTonnage: data.grossTonnage,
        owner: data.owner,
        operator: data.operator,
        manager: data.manager,
        buildYear: data.buildYear,
        enrichedAt: new Date(),
        enrichmentSource: 'equasis',
      },
    })

    console.log(`✅ ${vessel.mmsi}: Enriched (${vessel.name})`)
    return true

  } catch (error) {
    console.error(`❌ ${vessel.mmsi}: Enrichment failed -`, error)
    return false
  }
}

async function enrichBatch() {
  const args = process.argv.slice(2)
  const limitArg = args.find((arg) => arg.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100
  const force = args.includes('--force')

  console.log('🚀 Batch Vessel Enrichment')
  console.log(`📊 Limit: ${limit} vessels`)
  console.log(`🔄 Force re-enrichment: ${force ? 'YES' : 'NO'}`)
  console.log()

  // Get vessels to enrich
  console.log('🔍 Finding vessels to enrich...')
  const vessels = await getVesselsNeedingEnrichment(limit, force)

  if (vessels.length === 0) {
    console.log('✨ No vessels need enrichment!')
    return
  }

  console.log(`📋 Found ${vessels.length} vessels to enrich`)
  console.log()

  // Group by priority
  const byPriority = {
    high: vessels.filter((v) => v.priority === 'high'),
    medium: vessels.filter((v) => v.priority === 'medium'),
    low: vessels.filter((v) => v.priority === 'low'),
  }

  console.log(`  High priority: ${byPriority.high.length}`)
  console.log(`  Medium priority: ${byPriority.medium.length}`)
  console.log(`  Low priority: ${byPriority.low.length}`)
  console.log()

  // Enrich vessels
  let successCount = 0
  let failCount = 0
  let skipCount = 0

  for (let i = 0; i < vessels.length; i++) {
    const vessel = vessels[i]
    const progress = `[${i + 1}/${vessels.length}]`

    console.log(`${progress} ${vessel.priority.toUpperCase().padEnd(6)} ${vessel.mmsi} - ${vessel.name}`)

    const success = await enrichVessel(vessel)

    if (success) {
      successCount++
    } else if (vessel.imo) {
      skipCount++
    } else {
      failCount++
    }

    // Rate limit: 1 request per second
    if (i < vessels.length - 1) {
      await sleep(1000)
    }
  }

  // Summary
  console.log()
  console.log('📊 Enrichment Summary')
  console.log(`  ✅ Success: ${successCount}`)
  console.log(`  ℹ️  Skipped (no data): ${skipCount}`)
  console.log(`  ❌ Failed: ${failCount}`)
  console.log(`  📈 Success rate: ${((successCount / vessels.length) * 100).toFixed(1)}%`)
}

async function showStats() {
  console.log('📊 Current Enrichment Status\n')

  const total = await prisma.vessel.count({
    where: { active: true, imo: { not: null } },
  })

  const enriched = await prisma.vessel.count({
    where: {
      active: true,
      imo: { not: null },
      enrichedAt: { not: null },
    },
  })

  const withGrossTonnage = await prisma.vessel.count({
    where: {
      active: true,
      grossTonnage: { not: null },
    },
  })

  const withOwner = await prisma.vessel.count({
    where: {
      active: true,
      owner: { not: null },
    },
  })

  const bySource = await prisma.vessel.groupBy({
    by: ['enrichmentSource'],
    _count: true,
    where: {
      enrichmentSource: { not: null },
    },
  })

  console.log(`Total active vessels with IMO: ${total}`)
  console.log(`Enriched vessels: ${enriched} (${((enriched / total) * 100).toFixed(1)}%)`)
  console.log()
  console.log(`Vessels with gross tonnage: ${withGrossTonnage} (${((withGrossTonnage / total) * 100).toFixed(1)}%)`)
  console.log(`Vessels with owner: ${withOwner} (${((withOwner / total) * 100).toFixed(1)}%)`)
  console.log()

  if (bySource.length > 0) {
    console.log('Enrichment sources:')
    bySource.forEach((source) => {
      console.log(`  ${source.enrichmentSource}: ${source._count}`)
    })
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Main
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--stats')) {
    await showStats()
  } else {
    await enrichBatch()
  }

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
