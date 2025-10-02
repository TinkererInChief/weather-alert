/**
 * Resolve Failed Migration
 * 
 * Marks the add_data_source_traceability migration as applied
 * since the columns already exist (applied via db push)
 */

import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Resolving failed migration...\n')
  
  try {
    const migrationName = 'add_data_source_traceability'
    const migrationPath = path.join(
      process.cwd(),
      'prisma',
      'migrations',
      migrationName,
      'migration.sql'
    )
    
    // Read migration file
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8')
    
    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(migrationSql).digest('hex')
    
    // Check if migration already exists
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM "_prisma_migrations" 
      WHERE migration_name = ${migrationName}
    `
    
    if (existing.length > 0) {
      console.log(`✅ Migration "${migrationName}" is already marked as applied`)
      console.log(`   Status: ${existing[0].finished_at ? 'Completed' : 'Pending'}`)
      
      if (!existing[0].finished_at) {
        console.log('\n🔄 Updating migration status to completed...')
        await prisma.$executeRaw`
          UPDATE "_prisma_migrations"
          SET 
            finished_at = NOW(),
            logs = NULL
          WHERE migration_name = ${migrationName}
        `
        console.log('✅ Migration status updated')
      }
    } else {
      console.log(`📝 Marking migration "${migrationName}" as applied...`)
      
      await prisma.$executeRaw`
        INSERT INTO "_prisma_migrations" (
          id,
          checksum,
          finished_at,
          migration_name,
          logs,
          rolled_back_at,
          started_at,
          applied_steps_count
        )
        VALUES (
          gen_random_uuid()::text,
          ${checksum},
          NOW(),
          ${migrationName},
          NULL,
          NULL,
          NOW(),
          1
        )
      `
      
      console.log('✅ Migration marked as applied')
    }
    
    // Verify columns exist
    console.log('\n🔍 Verifying columns...')
    const columns = await prisma.$queryRaw<any[]>`
      SELECT 
        column_name, 
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'alert_logs' 
        AND column_name IN ('dataSources', 'primarySource', 'sourceMetadata')
      ORDER BY column_name
    `
    
    console.log('\n📊 Column Status:')
    columns.forEach(col => {
      console.log(`   ✅ ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })
    
    if (columns.length === 3) {
      console.log('\n✅ All columns exist and are properly configured')
    } else {
      console.log(`\n⚠️  Expected 3 columns, found ${columns.length}`)
    }
    
    // Verify indexes
    console.log('\n🔍 Verifying indexes...')
    const indexes = await prisma.$queryRaw<any[]>`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'alert_logs'
        AND indexname IN ('alert_logs_primarySource_idx', 'alert_logs_dataSources_idx')
      ORDER BY indexname
    `
    
    console.log('\n📊 Index Status:')
    indexes.forEach(idx => {
      console.log(`   ✅ ${idx.indexname}`)
    })
    
    console.log('\n✅ Migration resolution complete!')
    console.log('\n💡 Next steps:')
    console.log('   1. Redeploy your application')
    console.log('   2. Migration should now apply successfully')
    
  } catch (error) {
    console.error('❌ Error resolving migration:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
