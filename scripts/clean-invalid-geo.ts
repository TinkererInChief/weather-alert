import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const TOKYO_LAT = 35.6895
const TOKYO_LON = 139.6917

function getArg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.findIndex(a => a === name || a.startsWith(`${name}=`))
  if (idx === -1) return fallback
  const val = process.argv[idx]
  if (val.includes('=')) return val.split('=')[1]
  const next = process.argv[idx + 1]
  return next && !next.startsWith('-') ? next : fallback
}

async function main() {
  const apply = process.argv.includes('--apply')
  const epsStr = getArg('--epsilon', '0.0001')
  const limitStr = getArg('--limit', '10')

  const epsilon = Math.max(0, parseFloat(epsStr || '0.0001'))
  const sampleLimit = Math.max(1, parseInt(limitStr || '10', 10))

  const nearTokyoWhere: Prisma.AlertLogWhereInput = {
    primarySource: 'JMA',
    latitude: { gte: TOKYO_LAT - epsilon, lte: TOKYO_LAT + epsilon },
    longitude: { gte: TOKYO_LON - epsilon, lte: TOKYO_LON + epsilon },
  }

  const zeroZeroWhere: Prisma.AlertLogWhereInput = {
    latitude: 0,
    longitude: 0,
  }

  const whereClause: Prisma.AlertLogWhereInput = { OR: [nearTokyoWhere, zeroZeroWhere] }

  const totalAffected = await prisma.alertLog.count({ where: whereClause })

  console.log(`Found ${totalAffected} alert_logs with invalid/default coordinates.`)
  console.log(`Criteria: JMA near Tokyo ±${epsilon} deg OR exactly (0,0).`)

  if (totalAffected > 0) {
    const samples = await prisma.alertLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: sampleLimit,
      select: {
        id: true,
        earthquakeId: true,
        location: true,
        latitude: true,
        longitude: true,
        primarySource: true,
        timestamp: true,
      },
    })

    console.log(`\nSample (${Math.min(sampleLimit, totalAffected)}):`)
    for (const s of samples) {
      console.log(
        `- ${s.id} | ${s.earthquakeId} | ${s.primarySource} | ${s.location} | (${s.latitude}, ${s.longitude}) | ${s.timestamp.toISOString()}`
      )
    }
  }

  if (!apply) {
    console.log('\nDry-run mode. Pass --apply to perform cleanup.')
    return
  }

  const result = await prisma.alertLog.updateMany({
    where: whereClause,
    data: {
      latitude: null,
      longitude: null,
    },
  })

  console.log(`\nUpdated ${result.count} rows: set latitude/longitude to NULL.`)

  const remaining = await prisma.alertLog.count({ where: whereClause })
  console.log(`Remaining matching rows after cleanup: ${remaining}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
