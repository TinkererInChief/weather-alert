// Quick diagnostic script to test real-time position counts
// Run with: npx tsx scripts/test-realtime-counts.ts

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function testRealtimeCounts() {
  console.log('=== Real-time Position Counts Diagnostic ===\n')

  // Current time info
  const nowResult = await prisma.$queryRaw<Array<{ 
    now_tz: Date
    now_utc: Date
    hour_ago: Date
    hour_ago_utc: Date
  }>>(Prisma.sql`
    SELECT 
      now() AS now_tz,
      timezone('UTC', now()) AS now_utc,
      now() - interval '1 hour' AS hour_ago,
      timezone('UTC', now()) - interval '1 hour' AS hour_ago_utc
  `)
  console.log('Database time info:')
  console.log(nowResult[0])
  console.log()

  // Max timestamps
  const maxTimes = await prisma.$queryRaw<Array<{
    max_timestamp: Date | null
    max_createdAt: Date | null
    total: bigint
  }>>(Prisma.sql`
    SELECT 
      MAX("timestamp") AS max_timestamp,
      MAX("createdAt") AS max_createdAt,
      COUNT(*) AS total
    FROM "vessel_positions"
  `)
  console.log('Max timestamps in vessel_positions:')
  console.log({
    max_timestamp: maxTimes[0]?.max_timestamp,
    max_createdAt: maxTimes[0]?.max_createdAt,
    total: Number(maxTimes[0]?.total || 0)
  })
  console.log()

  // Last hour by timestamp (event time)
  const hourByTimestamp = await prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS c
    FROM "vessel_positions"
    WHERE "timestamp" >= (timezone('UTC', now()) - interval '1 hour')
  `)
  console.log('Last hour by timestamp (event time):', Number(hourByTimestamp[0]?.c || 0))

  // Last hour by createdAt (ingest time)
  const hourByCreatedAt = await prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS c
    FROM "vessel_positions"
    WHERE "createdAt" >= (now() - interval '1 hour')
  `)
  console.log('Last hour by createdAt (ingest time):', Number(hourByCreatedAt[0]?.c || 0))

  // With IS NOT NULL
  const hourByCreatedAtNN = await prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS c
    FROM "vessel_positions"
    WHERE "createdAt" IS NOT NULL
      AND "createdAt" >= (now() - interval '1 hour')
  `)
  console.log('Last hour by createdAt with IS NOT NULL:', Number(hourByCreatedAtNN[0]?.c || 0))

  // Last 5 minutes
  const min5ByCreatedAt = await prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS c
    FROM "vessel_positions"
    WHERE "createdAt" IS NOT NULL
      AND "createdAt" >= (now() - interval '5 minutes')
  `)
  console.log('Last 5 minutes by createdAt with IS NOT NULL:', Number(min5ByCreatedAt[0]?.c || 0))

  // Last hour using OR logic (what API uses)
  const hourByOR = await prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS c
    FROM "vessel_positions"
    WHERE ("timestamp" >= (timezone('UTC', now()) - interval '1 hour')
           OR "createdAt" >= (now() - interval '1 hour'))
  `)
  console.log('Last hour using OR logic:', Number(hourByOR[0]?.c || 0))
  console.log()

  // Last 15 minutes
  const min15ByOR = await prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS c
    FROM "vessel_positions"
    WHERE ("timestamp" >= (timezone('UTC', now()) - interval '15 minutes')
           OR "createdAt" >= (now() - interval '15 minutes'))
  `)
  console.log('Last 15 minutes using OR logic:', Number(min15ByOR[0]?.c || 0))

  // Recently active vessels
  const activeVessels = await prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
    SELECT COUNT(DISTINCT "vesselId")::bigint AS c
    FROM "vessel_positions"
    WHERE ("timestamp" >= (timezone('UTC', now()) - interval '1 hour')
           OR "createdAt" >= (now() - interval '1 hour'))
  `)
  console.log('Recently active vessels:', Number(activeVessels[0]?.c || 0))
  console.log()

  // Sample recent positions with raw SQL comparison
  const samples = await prisma.$queryRaw<Array<{
    id: string
    vesselId: string
    timestamp: Date
    createdAt: Date
    age_seconds: number
  }>>(Prisma.sql`
    SELECT "id", "vesselId", "timestamp", "createdAt",
           EXTRACT(EPOCH FROM (now() - "createdAt"))::int AS age_seconds
    FROM "vessel_positions"
    WHERE "createdAt" IS NOT NULL
    ORDER BY "createdAt" DESC NULLS LAST
    LIMIT 5
  `)
  console.log('Sample of 5 most recent positions:')
  samples.forEach((pos, idx) => {
    const ageMinutes = pos.age_seconds / 60
    console.log(`  ${idx + 1}. Vessel ${pos.vesselId}`)
    console.log(`      createdAt: ${pos.createdAt} (${ageMinutes.toFixed(1)} min ago by DB)`)
    console.log(`      timestamp: ${pos.timestamp}`)
  })

  await prisma.$disconnect()
}

testRealtimeCounts().catch(console.error)
