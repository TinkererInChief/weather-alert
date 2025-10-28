#!/usr/bin/env tsx
// Fix timestamp columns with timeout and better error handling
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function fix() {
  console.log('=== Fixing Timestamp Columns ===\n')
  
  try {
    // Set statement timeout to 10 seconds
    await prisma.$executeRaw`SET statement_timeout = '10s'`
    
    // Convert timestamp
    console.log('Converting timestamp column...')
    await prisma.$executeRaw`
      ALTER TABLE "vessel_positions" 
      ALTER COLUMN "timestamp" TYPE timestamptz 
      USING "timestamp" AT TIME ZONE 'UTC'
    `
    console.log('✓ timestamp → timestamptz')

    // Convert eta  
    console.log('Converting eta column...')
    await prisma.$executeRaw`
      ALTER TABLE "vessel_positions" 
      ALTER COLUMN "eta" TYPE timestamptz 
      USING "eta" AT TIME ZONE 'UTC'
    `
    console.log('✓ eta → timestamptz')

    console.log('\n✅ Migration completed!')
    console.log('\nNow restart your services:')
    console.log('  1. pnpm dev')
    console.log('  2. pnpm ais:start')
    console.log('\nThen refresh the dashboard in ~30 seconds.')

  } catch (error: any) {
    console.error('\n❌ Migration failed!')
    if (error.message) {
      console.error('Error:', error.message)
    }
    if (error.code) {
      console.error('Code:', error.code)
    }
    console.error('\nFull error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

fix()
