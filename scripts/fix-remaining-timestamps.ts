#!/usr/bin/env tsx
// Fix only timestamp and eta columns (createdAt is already correct)
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function fix() {
  console.log('⚠️  This will lock the vessel_positions table briefly.')
  console.log('Please ensure AIS ingestion is stopped!\n')
  
  try {
    // Convert timestamp (this is the important one for queries)
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

    console.log('\n✅ Done! Restart AIS service now.')

  } catch (error) {
    console.error('❌ Failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fix()
