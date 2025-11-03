#!/usr/bin/env tsx
// Background job to update realtime_stats table every 30 seconds
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'

let isRunning = true

process.on('SIGINT', () => {
  console.log('\n🛑 Stopping realtime stats updater...')
  isRunning = false
})

async function updateStats() {
  try {
    console.log(`[${new Date().toISOString()}] Updating realtime stats...`)
    
    // Batch queries in smaller groups to reduce connection pool pressure
    // Group 1: Critical position stats (run together for consistency)
    const [posResults] = await Promise.allSettled([
      Promise.all([
        prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
          SELECT COUNT(*)::bigint AS c
          FROM "vessel_positions"
          WHERE "createdAt" >= (now() - interval '1 hour')
        `),
        prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
          SELECT COUNT(*)::bigint AS c
          FROM "vessel_positions"
          WHERE "createdAt" >= (now() - interval '15 minutes')
        `),
        prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
          SELECT COUNT(DISTINCT "vesselId")::bigint AS c
          FROM "vessel_positions"
          WHERE "createdAt" >= (now() - interval '1 hour')
        `)
      ])
    ])

    // Group 2: Vessel counts and estimates
    const [vesselResults] = await Promise.allSettled([
      Promise.all([
        prisma.vessel.count(),
        prisma.$queryRaw<Array<{ estimate: bigint }>>(Prisma.sql`
          SELECT reltuples::bigint AS estimate
          FROM pg_class WHERE relname = 'vessel_positions'
        `)
      ])
    ])

    // Group 3: Today's stats (less critical, can skip on failure)
    const [todayResults] = await Promise.allSettled([
      Promise.all([
        prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
          SELECT COUNT(*)::bigint AS c
          FROM "vessel_positions"
          WHERE "createdAt" >= date_trunc('day', now())
        `),
        prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
          SELECT COUNT(*)::bigint AS c
          FROM "vessels"
          WHERE "createdAt" >= date_trunc('day', now())
        `)
      ])
    ])

    // Group 4: DB metadata (least critical, run separately)
    const [metaResults] = await Promise.allSettled([
      Promise.all([
        prisma.$queryRaw<Array<{ 
          bytes: bigint
          pretty: string 
        }>>(Prisma.sql`
          SELECT 
            pg_database_size(current_database()) AS bytes,
            pg_size_pretty(pg_database_size(current_database())) AS pretty
        `),
        prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
          SELECT COUNT(*)::bigint AS c
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
        `)
      ])
    ])

    // Extract values directly from each group with type-safe handling
    const pos1h = posResults.status === 'fulfilled' ? Number(posResults.value[0][0]?.c || 0) : 0
    const pos15m = posResults.status === 'fulfilled' ? Number(posResults.value[0][1]?.c || 0) : 0
    const vessels1h = posResults.status === 'fulfilled' ? Number(posResults.value[0][2]?.c || 0) : 0
    
    const totalVessels = vesselResults.status === 'fulfilled' ? vesselResults.value[0] : 0
    const totalPos = vesselResults.status === 'fulfilled' ? Number(vesselResults.value[1][0]?.estimate || 0) : 0
    
    const posToday = todayResults.status === 'fulfilled' ? Number(todayResults.value[0][0]?.c || 0) : 0
    const vesselsToday = todayResults.status === 'fulfilled' ? Number(todayResults.value[0][1]?.c || 0) : 0
    
    const dbSize = metaResults.status === 'fulfilled' && metaResults.value[0] && metaResults.value[0][0]
      ? metaResults.value[0][0]
      : { bytes: BigInt(0), pretty: 'N/A' }
    const tableCount = metaResults.status === 'fulfilled' && metaResults.value[1]
      ? Number(metaResults.value[1][0]?.c || 0) 
      : 0

    await prisma.$executeRaw`
      UPDATE "realtime_stats"
      SET 
        "positions_last_hour" = ${pos1h},
        "positions_last_15min" = ${pos15m},
        "vessels_active_last_hour" = ${vessels1h},
        "total_vessels" = ${totalVessels},
        "total_positions_estimate" = ${totalPos},
        "updated_at" = now()
      WHERE id = 'singleton'
    `

    console.log(`✅ Stats updated: ${pos15m} pos (15m), ${pos1h} pos (1h), ${posToday} today, ${vesselsToday} new vessels, ${dbSize.pretty} DB, ${tableCount} tables`)
    
    // Log any failures
    if (posResults.status === 'rejected') console.error('⚠️  Position stats failed:', posResults.reason?.message || posResults.reason)
    if (vesselResults.status === 'rejected') console.error('⚠️  Vessel stats failed:', vesselResults.reason?.message || vesselResults.reason)
    if (todayResults.status === 'rejected') console.error('⚠️  Today stats failed:', todayResults.reason?.message || todayResults.reason)
    if (metaResults.status === 'rejected') console.error('⚠️  DB metadata failed:', metaResults.reason?.message || metaResults.reason)
  } catch (error: any) {
    // Check if it's a connection pool exhaustion error
    if (error?.message?.includes('too many clients')) {
      console.error('⚠️  Connection pool exhausted - waiting 10s before retry...')
      await new Promise(resolve => setTimeout(resolve, 10000))
    } else {
      console.error('❌ Failed to update stats:', error?.message || error)
    }
  }
}

async function run() {
  console.log('🚀 Starting realtime stats updater (updates every 30s)')
  console.log('Press Ctrl+C to stop\n')

  while (isRunning) {
    await updateStats()
    
    if (isRunning) {
      // Wait 30 seconds before next update
      await new Promise(resolve => setTimeout(resolve, 30000))
    }
  }

  await prisma.$disconnect()
  console.log('✅ Stopped')
  process.exit(0)
}

run()
