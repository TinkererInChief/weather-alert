// Check most recent records and server timezone
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
  console.log('=== Timezone Check ===')
  console.log('Node TZ env:', process.env.TZ)
  console.log('Node current time:', new Date().toISOString())
  console.log('Timezone offset (minutes):', new Date().getTimezoneOffset())
  console.log()

  // Get database time
  const dbTime = await prisma.$queryRaw<Array<{ now_utc: Date; now_tz: Date }>>(Prisma.sql`
    SELECT now() AS now_tz, timezone('UTC', now()) AS now_utc
  `)
  console.log('Database time:', dbTime[0])
  console.log()

  // Most recent 3 records with age
  const recent = await prisma.$queryRaw<Array<{
    id: string
    createdAt: Date
    timestamp: Date
    age_minutes: number
  }>>(Prisma.sql`
    SELECT 
      "id",
      "createdAt",
      "timestamp",
      EXTRACT(EPOCH FROM (now() - "createdAt")) / 60 AS age_minutes
    FROM "vessel_positions"
    WHERE "createdAt" IS NOT NULL
    ORDER BY "createdAt" DESC
    LIMIT 3
  `)

  console.log('Most recent 3 positions:')
  recent.forEach((r, i) => {
    console.log(`${i+1}. createdAt: ${r.createdAt} (${r.age_minutes.toFixed(1)} min ago by DB)`)
  })

  await prisma.$disconnect()
}

check().catch(console.error)
