/**
 * Backfill Historical Events
 * 
 * Fetches real earthquake and tsunami data from all integrated sources
 * and populates the database with historical events (last 30 days).
 * 
 * Data Sources:
 * - USGS: Global earthquake data with coordinates
 * - EMSC: European-Mediterranean earthquakes
 * - JMA: Japan earthquakes  
 * - PTWC: Pacific tsunami warnings
 * 
 * Usage: npx tsx scripts/backfill-historical-events.ts
 */

import { PrismaClient } from '@prisma/client'
import { dataAggregator } from '@/lib/data-sources'

const prisma = new PrismaClient()

async function main() {
  console.log('🌍 Starting historical event backfill...\n')
  
  try {
    // Fetch last 30 days of earthquakes from all sources
    console.log('📡 Fetching earthquakes from all sources (last 30 days)...')
    
    const earthquakes = await dataAggregator.fetchAggregatedEarthquakes({
      timeWindowHours: 30 * 24, // 30 days
      minMagnitude: 4.0, // Only significant earthquakes
      limit: 100 // Limit to 100 most significant
    })
    
    console.log(`✅ Retrieved ${earthquakes.length} unique earthquakes (after deduplication)`)
    
    // Show source breakdown
    const sourceBreakdown: Record<string, number> = {}
    earthquakes.forEach(eq => {
      const sources = eq.properties.sources?.split(',') || ['unknown']
      sources.forEach(source => {
        sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1
      })
    })
    
    console.log('\n📊 Events by source:')
    Object.entries(sourceBreakdown).forEach(([source, count]) => {
      console.log(`   ${source.toUpperCase()}: ${count}`)
    })
    
    // Convert to AlertLog format and insert
    console.log('\n💾 Saving to database...')
    
    let inserted = 0
    let skipped = 0
    
    for (const eq of earthquakes) {
      const [longitude, latitude, depth] = eq.geometry.coordinates
      
      // Check if already exists
      const existing = await prisma.alertLog.findFirst({
        where: {
          earthquakeId: eq.id
        }
      })
      
      if (existing) {
        skipped++
        continue
      }
      
      // Determine primary source
      const sources = eq.properties.sources?.split(',').filter(s => s) || []
      const primarySource = sources[0]?.toUpperCase() || 'USGS'
      
      // Create alert log entry
      await prisma.alertLog.create({
        data: {
          earthquakeId: eq.id,
          magnitude: eq.properties.mag,
          location: eq.properties.place || 'Unknown location',
          latitude,
          longitude,
          depth: depth || null,
          timestamp: new Date(eq.properties.time),
          contactsNotified: 0, // Historical data, not actually sent
          success: true,
          dataSources: sources.map(s => s.toUpperCase()),
          primarySource,
          sourceMetadata: {
            usgs: eq.properties.net === 'us' ? {
              eventId: eq.id,
              significance: eq.properties.sig,
              tsunami: eq.properties.tsunami,
              felt: eq.properties.felt,
              cdi: eq.properties.cdi,
              mmi: eq.properties.mmi,
              alert: eq.properties.alert,
              status: eq.properties.status,
              type: eq.properties.type,
              url: eq.properties.url
            } : undefined
          }
        }
      })
      
      inserted++
      
      if (inserted % 10 === 0) {
        console.log(`   Processed ${inserted}/${earthquakes.length}...`)
      }
    }
    
    console.log(`\n✅ Backfill complete!`)
    console.log(`   Inserted: ${inserted} new events`)
    console.log(`   Skipped: ${skipped} existing events`)
    
    // Show summary
    const totalAlerts = await prisma.alertLog.count()
    const withCoordinates = await prisma.alertLog.count({
      where: {
        AND: [
          { latitude: { not: null } },
          { longitude: { not: null } }
        ]
      }
    })
    
    console.log(`\n📊 Database Summary:`)
    console.log(`   Total alerts: ${totalAlerts}`)
    console.log(`   With coordinates (mappable): ${withCoordinates}`)
    console.log(`   Coverage: ${((withCoordinates / totalAlerts) * 100).toFixed(1)}%`)
    
    // Show recent events
    console.log(`\n📋 Sample of backfilled events:`)
    const recent = await prisma.alertLog.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null }
      },
      orderBy: { timestamp: 'desc' },
      take: 5,
      select: {
        magnitude: true,
        location: true,
        latitude: true,
        longitude: true,
        timestamp: true,
        primarySource: true,
        dataSources: true
      }
    })
    
    recent.forEach((alert, i) => {
      console.log(`   ${i + 1}. M${alert.magnitude} - ${alert.location}`)
      console.log(`      ${alert.timestamp.toLocaleString()}`)
      console.log(`      📍 ${alert.latitude?.toFixed(2)}°, ${alert.longitude?.toFixed(2)}°`)
      console.log(`      📡 Sources: ${alert.dataSources.join(', ')} (Primary: ${alert.primarySource})`)
    })
    
    console.log(`\n🗺️  Your map should now display ${withCoordinates} events!`)
    console.log(`\n💡 Next steps:`)
    console.log(`   1. Refresh your dashboard to see the events on the map`)
    console.log(`   2. Use the time filters (24h/7d/30d) to explore different periods`)
    console.log(`   3. Enable monitoring to get real-time updates going forward`)
    
  } catch (error) {
    console.error('❌ Error during backfill:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
