/**
 * Manual Migration Runner
 * 
 * Runs SQL migrations that can't be handled by Prisma db push
 * due to TimescaleDB compression constraints.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { prisma } from '../lib/prisma'

async function runMigration() {
  const migrationPath = join(__dirname, '../migrations/add-enrichment-fields.sql')
  
  console.log('🔄 Running manual migration for enrichment fields...\n')
  
  try {
    const sql = readFileSync(migrationPath, 'utf-8')
    
    // Split SQL into individual statements and execute one by one
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`Executing ${statements.length} SQL statements...\n`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement) {
        console.log(`[${i + 1}/${statements.length}] ${statement.substring(0, 60)}...`)
        await prisma.$executeRawUnsafe(statement)
      }
    }
    
    console.log('\n✅ Migration completed successfully!\n')
    
    // Verify the changes
    console.log('🔍 Verifying new columns...\n')
    
    const vesselColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vessels' 
      AND column_name IN ('height', 'build_year', 'manager', 'enriched_at', 'enrichment_source')
      ORDER BY column_name
    `
    
    const positionColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vessel_positions' 
      AND column_name IN ('captain', 'rate_of_turn', 'position_accuracy')
      ORDER BY column_name
    `
    
    console.log('Vessel table columns added:')
    console.table(vesselColumns)
    
    console.log('\nVessel Position table columns added:')
    console.table(positionColumns)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

runMigration().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
