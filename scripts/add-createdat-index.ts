#!/usr/bin/env tsx
// Add index on createdAt to speed up real-time queries
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addIndex() {
  console.log('Creating index on vessel_positions(createdAt)...')
  console.log('This will take ~30 seconds for 3M records...\n')
  
  try {
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_positions_created_at 
      ON "vessel_positions" ("createdAt" DESC) 
      WHERE "createdAt" IS NOT NULL
    `
    console.log('✅ Index created successfully!')
    console.log('Real-time queries should now be <100ms')
  } catch (error: any) {
    console.error('❌ Failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

addIndex()
