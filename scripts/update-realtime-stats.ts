#!/usr/bin/env tsx
// Background job to update realtime_stats table every 30 seconds
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
let isRunning = true

process.on('SIGINT', () => {
  console.log('\n🛑 Stopping realtime stats updater...')
  isRunning = false
})

async function updateStats() {
  try {
    console.log(`[${new Date().toISOString()}] Updating realtime stats...`)
    
    // Run all queries in parallel with 5s timeout each
    const results = await Promise.allSettled([
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
      `),
      prisma.vessel.count(),
      prisma.$queryRaw<Array<{ estimate: bigint }>>(Prisma.sql`
        SELECT reltuples::bigint AS estimate
        FROM pg_class WHERE relname = 'vessel_positions'
      `),
      prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM "vessel_positions"
        WHERE "createdAt" >= date_trunc('day', now())
      `),
      prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM "vessels"
        WHERE "createdAt" >= date_trunc('day', now())
      `),
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

    // Extract values, use 0 if query failed
    const pos1h = results[0].status === 'fulfilled' ? Number(results[0].value[0]?.c || 0) : 0
    const pos15m = results[1].status === 'fulfilled' ? Number(results[1].value[0]?.c || 0) : 0
    const vessels1h = results[2].status === 'fulfilled' ? Number(results[2].value[0]?.c || 0) : 0
    const totalVessels = results[3].status === 'fulfilled' ? results[3].value : 0
    const totalPos = results[4].status === 'fulfilled' ? Number(results[4].value[0]?.estimate || 0) : 0
    const posToday = results[5].status === 'fulfilled' ? Number(results[5].value[0]?.c || 0) : 0
    const vesselsToday = results[6].status === 'fulfilled' ? Number(results[6].value[0]?.c || 0) : 0
    const dbSize = results[7].status === 'fulfilled' ? results[7].value[0] : { bytes: BigInt(0), pretty: 'N/A' }
    const tableCount = results[8].status === 'fulfilled' ? Number(results[8].value[0]?.c || 0) : 0

    await prisma.$executeRaw`
      UPDATE "realtime_stats"
      SET 
        "positions_last_hour" = ${pos1h},
        "positions_last_15min" = ${pos15m},
        "positions_today" = ${posToday},
        "vessels_active_last_hour" = ${vessels1h},
        "vessels_new_today" = ${vesselsToday},
        "total_vessels" = ${totalVessels},
        "total_positions_estimate" = ${totalPos},
        "db_size_bytes" = ${Number(dbSize.bytes)},
        "db_size_pretty" = ${dbSize.pretty},
        "table_count" = ${tableCount},
        "updated_at" = now()
      WHERE id = 'singleton'
    `

    console.log(`✅ Stats updated: ${pos15m} pos (15m), ${pos1h} pos (1h), ${posToday} today, ${vesselsToday} new vessels, ${dbSize.pretty} DB, ${tableCount} tables`)
    
    // Log any failures
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        const names = ['pos_1h', 'pos_15m', 'vessels_1h', 'total_vessels', 'total_pos', 'pos_today', 'vessels_today', 'db_size', 'table_count']
        console.error(`⚠️  Query ${names[i]} failed:`, result.reason.message)
      }
    })
  } catch (error) {
    console.error('❌ Failed to update stats:', error)
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
