/**
 * Add missing height and captain columns
 */

import { prisma } from '../lib/prisma'

async function addMissingColumns() {
  console.log('🔍 Checking and adding missing columns...\n')
  
  try {
    // Add height to vessels
    console.log('Adding height column to vessels...')
    await prisma.$executeRaw`
      ALTER TABLE vessels ADD COLUMN IF NOT EXISTS height DOUBLE PRECISION
    `
    console.log('✅ Height column added/verified\n')
    
    // Add captain to vessel_positions
    console.log('Adding captain column to vessel_positions...')
    await prisma.$executeRaw`
      ALTER TABLE vessel_positions ADD COLUMN IF NOT EXISTS captain TEXT
    `
    console.log('✅ Captain column added/verified\n')
    
    // Verify
    const vesselCols = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vessels' 
      AND column_name IN ('height', 'captain')
    `
    
    const positionCols = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vessel_positions' 
      AND column_name IN ('captain')
    `
    
    console.log('Vessel table columns:')
    console.table(vesselCols)
    
    console.log('\nVessel Position table columns:')
    console.table(positionCols)
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

addMissingColumns().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
