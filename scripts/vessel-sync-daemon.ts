#!/usr/bin/env tsx
/**
 * Vessel Sync Daemon
 * 
 * Production-ready service combining:
 * 1. AISStream - Real-time enrichment from AIS broadcasts
 * 2. Marinesia API - Periodic discovery and backfill
 * 
 * Features:
 * - Continuous real-time enrichment (AISStream)
 * - Periodic regional scans (Marinesia)
 * - Automatic vessel discovery
 * - Backfill missing data
 * - Rate limit handling
 * - Graceful shutdown
 * 
 * Usage:
 *   npm run vessel:sync              - Start with default settings
 *   npm run vessel:sync -- --no-ais  - Marinesia only
 *   npm run vessel:sync -- --no-marinesia - AISStream only
 *   npm run vessel:sync -- --interval=30 - Marinesia scan every 30 min
 */

import { vesselSyncService } from '../lib/services/vessel-sync-service'

async function main() {
  const args = process.argv.slice(2)
  
  // Parse arguments
  const enableAISStream = !args.includes('--no-ais')
  const enableMarinesia = !args.includes('--no-marinesia')
  const enablePositionTracking = !args.includes('--no-pos')
  
  const intervalArg = args.find(arg => arg.startsWith('--interval'))
  const marinesiaInterval = intervalArg ? parseInt(intervalArg.split('=')[1]) : 60
  
  const regionArg = args.find(arg => arg.startsWith('--region'))
  const region = regionArg ? regionArg.split('=')[1] : 'global'
  
  console.log('🔄 Vessel Sync Daemon')
  console.log('=' .repeat(60))
  console.log('\n📋 Configuration:')
  console.log(`   AISStream: ${enableAISStream ? '✅ ENABLED' : '❌ DISABLED'}`)
  console.log(`   Marinesia: ${enableMarinesia ? '✅ ENABLED' : '❌ DISABLED'}`)
  console.log(`   Position tracking: ${enablePositionTracking ? '✅ ENABLED' : '❌ DISABLED'}`)
  console.log(`   Marinesia scan interval: ${marinesiaInterval} minutes`)
  console.log(`   Region: ${region}`)
  
  console.log('\n🎯 This service will:')
  if (enableAISStream) {
    console.log('   ✅ Listen to AIS broadcasts 24/7 (real-time enrichment)')
    if (enablePositionTracking) {
      console.log('   ✅ Track vessel positions in real-time')
    }
  }
  if (enableMarinesia) {
    console.log(`   ✅ Scan regions every ${marinesiaInterval} minutes (discovery)`)
    console.log('   ✅ Discover new vessels in active shipping lanes')
    console.log('   ✅ Backfill missing vessel data')
  }
  
  console.log('\n💡 Benefits:')
  console.log('   - Dual-source enrichment (AIS + Marinesia)')
  console.log('   - Automatic vessel discovery')
  console.log('   - Comprehensive coverage')
  console.log('   - Handles rate limits gracefully')
  
  console.log('\n💡 Tip: Run this in tmux/screen for 24/7 operation')
  console.log('Press Ctrl+C to stop gracefully\n')
  console.log('=' .repeat(60))
  console.log()
  
  // Define regions for Marinesia scanning
  const marinesiaRegions = [
    {
      name: 'Singapore Strait',
      bounds: { lat_min: 1.0, lat_max: 1.5, long_min: 103.5, long_max: 104.5 }
    },
    {
      name: 'Malacca Strait',
      bounds: { lat_min: 1.5, lat_max: 6.0, long_min: 98.0, long_max: 104.0 }
    },
    {
      name: 'English Channel',
      bounds: { lat_min: 49.0, lat_max: 51.5, long_min: -5.0, long_max: 2.0 }
    },
    {
      name: 'Suez Canal Approaches',
      bounds: { lat_min: 29.0, lat_max: 32.0, long_min: 32.0, long_max: 35.0 }
    },
    {
      name: 'Panama Canal Approaches',
      bounds: { lat_min: 8.0, lat_max: 10.0, long_min: -80.0, long_max: -78.0 }
    },
    {
      name: 'Gibraltar Strait',
      bounds: { lat_min: 35.5, lat_max: 36.5, long_min: -6.0, long_max: -5.0 }
    }
  ]
  
  // AIS bounding boxes (global or regional)
  const aisBoundingBoxes = region === 'global' 
    ? [[[-90, -180], [90, 180]] as [[number, number], [number, number]]]
    : undefined
  
  // Start the sync service
  await vesselSyncService.startSync({
    enableAISStream,
    aisBoundingBoxes,
    enablePositionTracking,
    enableMarinesia,
    marinesiaRegions,
    marinesiaInterval,
    
    onProgress: (stats) => {
      // Log progress every 5 minutes
      const uptimeMinutes = Math.floor(stats.duration / 60000)
      if (uptimeMinutes > 0 && uptimeMinutes % 5 === 0) {
        console.log('\n📊 Progress Update:')
        console.log(`   Runtime: ${uptimeMinutes} minutes`)
        console.log(`   Total enriched: ${stats.total.enrichedVessels}`)
        console.log(`   New vessels: ${stats.total.newVessels}`)
        console.log(`   Marinesia API calls: ${stats.marinesia.apiCalls}`)
        console.log(`   AIS static messages: ${stats.aisstream.staticDataMessages}`)
      }
    }
  })
  
  // Show statistics every 10 minutes
  setInterval(() => {
    const stats = vesselSyncService.getStats()
    const uptimeMinutes = Math.floor(stats.duration / 60000)
    
    console.log('\n📊 Vessel Sync Statistics:')
    console.log('=' .repeat(60))
    console.log(`   Uptime: ${uptimeMinutes} minutes`)
    console.log('\n🗺️  Marinesia:')
    console.log(`   Vessels enriched: ${stats.marinesia.vesselsEnriched}`)
    console.log(`   Vessels discovered: ${stats.marinesia.vesselsDiscovered}`)
    console.log(`   API calls: ${stats.marinesia.apiCalls}`)
    console.log(`   Errors: ${stats.marinesia.errors}`)
    console.log('\n🌊 AISStream:')
    console.log(`   Vessels enriched: ${stats.aisstream.vesselsEnriched}`)
    console.log(`   Vessels created: ${stats.aisstream.vesselsCreated}`)
    console.log(`   Static data messages: ${stats.aisstream.staticDataMessages}`)
    if (enablePositionTracking) {
      console.log(`   Positions recorded: ${stats.aisstream.positionsRecorded}`)
    }
    console.log('\n📈 Combined Total:')
    console.log(`   Vessels processed: ${stats.total.vesselsProcessed}`)
    console.log(`   New vessels: ${stats.total.newVessels}`)
    console.log('=' .repeat(60))
  }, 10 * 60 * 1000) // Every 10 minutes
  
  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n\n🛑 Shutting down gracefully...')
    vesselSyncService.stop()
    
    setTimeout(() => {
      console.log('\n✅ Shutdown complete')
      process.exit(0)
    }, 2000)
  }
  
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  
  // Keep process alive
  process.stdin.resume()
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Vessel Sync Daemon - Dual-source vessel enrichment and discovery')
  console.log('\nUsage:')
  console.log('  npm run vessel:sync                    - Start with both sources')
  console.log('  npm run vessel:sync -- --no-ais        - Marinesia only')
  console.log('  npm run vessel:sync -- --no-marinesia  - AISStream only')
  console.log('  npm run vessel:sync -- --no-pos        - Disable position tracking')
  console.log('  npm run vessel:sync -- --interval=30   - Marinesia scan every 30 min')
  console.log('  npm run vessel:sync -- --region=global - Global AIS coverage')
  console.log('\nExamples:')
  console.log('  npm run vessel:sync')
  console.log('  npm run vessel:sync -- --interval=120')
  console.log('  npm run vessel:sync -- --no-pos --interval=30')
  console.log('\nData Sources:')
  console.log('  AISStream  - Real-time AIS broadcasts (free, unlimited)')
  console.log('  Marinesia  - Regional vessel discovery (rate limited)')
  console.log('\nRecommended:')
  console.log('  Run both sources for maximum coverage')
  console.log('  AISStream handles real-time enrichment')
  console.log('  Marinesia discovers vessels in busy shipping lanes')
  process.exit(0)
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
