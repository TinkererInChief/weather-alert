#!/usr/bin/env tsx

/**
 * Standalone Vessel Ingestion Worker
 * 
 * Run this script to start continuous vessel data ingestion:
 * 
 *   npm run worker:vessels
 * 
 * Or directly with tsx:
 * 
 *   npx tsx scripts/start-vessel-worker.ts
 * 
 * This runs independently from the Next.js server and can be:
 * - Run locally for development
 * - Deployed as a separate Railway service
 * - Run in a Docker container
 * - Managed by PM2 or systemd
 */

import { vesselIngestionWorker } from '../lib/workers/vessel-ingestion-worker'

async function main() {
  console.log('╔══════════════════════════════════════╗')
  console.log('║   Vessel Ingestion Worker v1.0      ║')
  console.log('║   Emergency Alert System             ║')
  console.log('╚══════════════════════════════════════╝\n')
  
  // Check for required environment variables
  if (!process.env.AISSTREAM_API_KEY) {
    console.error('❌ ERROR: AISSTREAM_API_KEY not set in environment')
    console.error('   Please add to .env or .env.local:\n')
    console.error('   AISSTREAM_API_KEY=your_api_key_here\n')
    process.exit(1)
  }
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL not set in environment')
    console.error('   Please add to .env or .env.local:\n')
    console.error('   DATABASE_URL=your_database_connection_string\n')
    process.exit(1)
  }
  
  console.log('✅ Environment variables validated')
  console.log(`📦 Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'configured'}`)
  console.log(`🔑 AISStream API Key: ${process.env.AISSTREAM_API_KEY?.substring(0, 10)}...`)
  console.log('')
  
  try {
    await vesselIngestionWorker.start()
  } catch (error) {
    console.error('❌ Fatal error starting worker:', error)
    process.exit(1)
  }
}

main()
