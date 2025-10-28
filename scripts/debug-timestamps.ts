// Debug timestamp storage issue
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function debug() {
  console.log('=== Raw Timestamp Debug ===\n')

  // Get raw timestamp data with explicit casting
  const raw = await prisma.$queryRaw<Array<{
    id: string
    createdAt: Date
    timestamp: Date
    created_raw: string
    db_now: Date
    age_calc: string
  }>>(Prisma.sql`
    SELECT 
      "id",
      "createdAt",
      "timestamp",
      "createdAt"::text AS created_raw,
      now() AS db_now,
      (now() - "createdAt")::text AS age_calc
    FROM "vessel_positions"
    WHERE "createdAt" IS NOT NULL
    ORDER BY "createdAt" DESC
    LIMIT 5
  `)

  console.log('Most recent 5 records with raw values:')
  raw.forEach((r, i) => {
    console.log(`\n${i+1}.`)
    console.log('  ID:', r.id)
    console.log('  createdAt (Date obj):', r.createdAt)
    console.log('  createdAt (raw SQL):', r.created_raw)
    console.log('  DB now():', r.db_now)
    console.log('  Age (raw SQL):', r.age_calc)
  })

  console.log('\n=== Count by createdAt range ===')
  
  // Count using different time windows
  const counts = await prisma.$queryRaw<Array<{
    within_5min: bigint
    within_1hr: bigint
    within_1hr_nn: bigint
  }>>(Prisma.sql`
    SELECT
      COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '5 minutes') AS within_5min,
      COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '1 hour') AS within_1hr,
      COUNT(*) FILTER (WHERE "createdAt" IS NOT NULL AND "createdAt" >= now() - interval '1 hour') AS within_1hr_nn
    FROM "vessel_positions"
  `)
  
  console.log('Last 5 minutes:', Number(counts[0].within_5min))
  console.log('Last 1 hour:', Number(counts[0].within_1hr))
  console.log('Last 1 hour (NOT NULL):', Number(counts[0].within_1hr_nn))

  await prisma.$disconnect()
}

debug().catch(console.error)
