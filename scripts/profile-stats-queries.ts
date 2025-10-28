// Profile which queries in /api/database/stats are slow
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function profile() {
  console.log('=== Profiling Stats Endpoint Queries ===\n')

  // Test 1: Total vessels
  console.time('vessel.count()')
  const v1 = await prisma.vessel.count()
  console.timeEnd('vessel.count()')
  console.log('  Result:', v1, '\n')

  // Test 2: Vessels with positions (LIKELY SLOW - joins 2.5M records!)
  console.time('vessel.count with positions JOIN')
  const v2 = await prisma.vessel.count({ where: { positions: { some: {} } } })
  console.timeEnd('vessel.count with positions JOIN')
  console.log('  Result:', v2, '\n')

  // Test 3: Total positions (LIKELY SLOW - counts 2.5M records!)
  console.time('vesselPosition.count()')
  const v3 = await prisma.vesselPosition.count()
  console.timeEnd('vesselPosition.count()')
  console.log('  Result:', v3, '\n')

  console.log('✅ Done. Slow queries identified above.')

  await prisma.$disconnect()
}

profile().catch(console.error)
