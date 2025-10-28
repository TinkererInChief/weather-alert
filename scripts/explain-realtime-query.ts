// Check if the index is being used
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function explain() {
  console.log('=== Query Plan Analysis ===\n')
  
  const plan = await prisma.$queryRaw<Array<{ 'QUERY PLAN': string }>>(Prisma.sql`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT COUNT(*)
    FROM "vessel_positions"
    WHERE "createdAt" IS NOT NULL 
      AND "createdAt" >= (now() - interval '1 hour')
  `)

  console.log('Query plan:')
  plan.forEach(row => console.log(row['QUERY PLAN']))
  
  await prisma.$disconnect()
}

explain().catch(console.error)
