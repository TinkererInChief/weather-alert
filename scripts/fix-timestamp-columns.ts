#!/usr/bin/env tsx
// Fix timestamp columns to use timestamptz instead of timestamp
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function fixTimestampColumns() {
  console.log('=== Fixing Timestamp Column Types ===\n')

  try {
    // Check current types
    console.log('Current column types:')
    const before = await prisma.$queryRaw<Array<{
      column_name: string
      data_type: string
    }>>(Prisma.sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'vessel_positions'
        AND column_name IN ('createdAt', 'timestamp', 'eta')
      ORDER BY column_name
    `)
    before.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`))
    console.log()

    // Convert createdAt
    console.log('Converting createdAt to timestamptz...')
    await prisma.$executeRaw`
      ALTER TABLE "vessel_positions" 
      ALTER COLUMN "createdAt" TYPE timestamptz 
      USING "createdAt" AT TIME ZONE 'UTC'
    `
    console.log('✓ createdAt converted')

    // Convert timestamp
    console.log('Converting timestamp to timestamptz...')
    await prisma.$executeRaw`
      ALTER TABLE "vessel_positions" 
      ALTER COLUMN "timestamp" TYPE timestamptz 
      USING "timestamp" AT TIME ZONE 'UTC'
    `
    console.log('✓ timestamp converted')

    // Convert eta
    console.log('Converting eta to timestamptz...')
    await prisma.$executeRaw`
      ALTER TABLE "vessel_positions" 
      ALTER COLUMN "eta" TYPE timestamptz 
      USING "eta" AT TIME ZONE 'UTC'
    `
    console.log('✓ eta converted')

    console.log()
    console.log('Verifying new column types:')
    const after = await prisma.$queryRaw<Array<{
      column_name: string
      data_type: string
    }>>(Prisma.sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'vessel_positions'
        AND column_name IN ('createdAt', 'timestamp', 'eta')
      ORDER BY column_name
    `)
    after.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`))

    console.log()
    console.log('✅ Migration completed successfully!')
    console.log()
    console.log('Next steps:')
    console.log('1. Wait 1 minute for new data to be ingested')
    console.log('2. Refresh the dashboard')
    console.log('3. Real-time counters should now show non-zero values')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixTimestampColumns()
