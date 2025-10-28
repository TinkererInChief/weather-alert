// Check PostgreSQL column types
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
  const columns = await prisma.$queryRaw<Array<{
    column_name: string
    data_type: string
    datetime_precision: number | null
  }>>(Prisma.sql`
    SELECT column_name, data_type, datetime_precision
    FROM information_schema.columns
    WHERE table_name = 'vessel_positions'
      AND column_name IN ('createdAt', 'timestamp', 'eta')
    ORDER BY column_name
  `)

  console.log('=== vessel_positions Timestamp Columns ===\n')
  columns.forEach(col => {
    console.log(`${col.column_name}:`)
    console.log(`  Type: ${col.data_type}`)
    console.log(`  Precision: ${col.datetime_precision}`)
    console.log()
  })

  await prisma.$disconnect()
}

check().catch(console.error)
