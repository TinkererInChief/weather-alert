#!/usr/bin/env tsx

/**
 * Start AIS Streaming Service
 * 
 * This script starts the vessel ingestion worker which:
 * - Connects to AISStream.io for real-time global vessel tracking
 * - Polls OpenShipData for European waters
 * - Automatically stores vessel positions in the database
 * 
 * Usage:
 *   pnpm run ais:start
 *   or
 *   npx tsx scripts/start-ais-streaming.ts
 */

import { vesselIngestionWorker } from '../lib/workers/vessel-ingestion-worker'

console.log('🚀 Starting AIS Streaming Service...')
console.log('Press Ctrl+C to stop\n')

vesselIngestionWorker.start().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
