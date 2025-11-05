#!/usr/bin/env tsx
/**
 * AIS Vessel Daemon
 * 
 * Production service for continuous AIS data ingestion and vessel enrichment.
 * 
 * Features:
 * - Real-time position tracking
 * - Automatic vessel enrichment
 * - New vessel discovery
 * - Position history recording
 * - Graceful shutdown
 * - Auto-reconnect
 * 
 * Usage:
 *   npm run ais:start              - Start with default settings
 *   npm run ais:start -- --no-pos  - Disable position tracking
 *   npm run ais:start -- --region singapore - Singapore region only
 */

import { aisVesselService } from '../lib/services/ais-vessel-service'

// Predefined regions
const REGIONS = {
  global: [
    [[-90, -180], [90, 180]]
  ],
  singapore: [
    [[1.0, 103.5], [1.5, 104.5]]
  ],
  'north-atlantic': [
    [[30, -80], [60, 0]]
  ],
  'mediterranean': [
    [[30, -6], [46, 37]]
  ],
  'indian-ocean': [
    [[-40, 40], [30, 100]]
  ],
  'pacific': [
    [[-60, 120], [60, -70]]
  ]
}

async function main() {
  const args = process.argv.slice(2)
  
  // Parse arguments
  const enablePositionTracking = !args.includes('--no-pos')
  const regionArg = args.find(arg => arg.startsWith('--region'))
  const region = regionArg ? regionArg.split('=')[1] : 'global'
  const sampleRateArg = args.find(arg => arg.startsWith('--sample'))
  const sampleRate = sampleRateArg ? parseInt(sampleRateArg.split('=')[1]) : 10
  
  console.log('🌊 AIS Vessel Daemon')
  console.log('=' .repeat(60))
  
  if (!aisVesselService.isConfigured()) {
    console.error('❌ AISStream API key not configured')
    console.log('Please set AISSTREAM_API_KEY in your .env file')
    process.exit(1)
  }
  
  console.log('✅ AISStream API key found')
  console.log('\n📋 Configuration:')
  console.log(`   Region: ${region}`)
  console.log(`   Position tracking: ${enablePositionTracking ? 'ENABLED' : 'DISABLED'}`)
  if (enablePositionTracking) {
    console.log(`   Position sample rate: 1/${sampleRate}`)
  }
  console.log(`   Stats interval: 60 seconds`)
  console.log('\n🎯 Capabilities:')
  console.log('   ✅ Real-time vessel enrichment (AIS Type 5)')
  if (enablePositionTracking) {
    console.log('   ✅ Position tracking (AIS Type 1-3, 18-19)')
    console.log('   ✅ Position history recording')
  }
  console.log('   ✅ Automatic vessel creation')
  console.log('   ✅ Auto-reconnect on disconnect')
  console.log('\n📊 This service will:')
  console.log('   1. Listen to AIS broadcasts 24/7')
  console.log('   2. Enrich existing vessels with static data')
  console.log('   3. Create new vessels as they appear')
  if (enablePositionTracking) {
    console.log('   4. Track vessel positions in real-time')
    console.log('   5. Build position history for tracking')
  }
  console.log('\n💡 Tip: Run this in tmux/screen for 24/7 operation')
  console.log('Press Ctrl+C to stop gracefully\n')
  console.log('=' .repeat(60))
  console.log()
  
  // Get bounding boxes for region
  const boundingBoxes = REGIONS[region as keyof typeof REGIONS] || REGIONS.global
  
  // Start the service
  await aisVesselService.start({
    boundingBoxes,
    enablePositionTracking,
    positionSampleRate: sampleRate,
    statsIntervalSeconds: 60,
    
    onMessage: (message) => {
      // Optional: Log interesting messages
      if (message.MessageType === 'ShipStaticData' && message.Message.ShipStaticData) {
        const data = message.Message.ShipStaticData
        if (data.ImoNumber && data.ImoNumber > 0) {
          console.log(`📍 Enriched: ${data.Name.replace(/@+$/, '')} (IMO: ${data.ImoNumber})`)
        }
      }
    },
    
    onError: (error) => {
      console.error('❌ Error:', error.message)
    }
  })
  
  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n\n🛑 Shutting down gracefully...')
    const stats = aisVesselService.getStats()
    
    console.log('\n📊 Final Statistics:')
    console.log('=' .repeat(60))
    console.log(`   Total runtime: ${Math.floor(stats.uptime / 60000)} minutes`)
    console.log(`   Messages received: ${stats.messagesReceived.toLocaleString()}`)
    console.log(`   Position reports: ${stats.positionReports.toLocaleString()}`)
    console.log(`   Static data messages: ${stats.staticDataMessages.toLocaleString()}`)
    console.log(`   Vessels created: ${stats.vesselsCreated.toLocaleString()}`)
    console.log(`   Vessels updated: ${stats.vesselsUpdated.toLocaleString()}`)
    if (enablePositionTracking) {
      console.log(`   Positions recorded: ${stats.positionsRecorded.toLocaleString()}`)
    }
    console.log(`   Errors: ${stats.errors}`)
    console.log('=' .repeat(60))
    
    aisVesselService.stop()
    
    setTimeout(() => {
      console.log('\n✅ Shutdown complete')
      process.exit(0)
    }, 1000)
  }
  
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  
  // Keep process alive
  process.stdin.resume()
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('AIS Vessel Daemon - Real-time AIS data ingestion and enrichment')
  console.log('\nUsage:')
  console.log('  npm run ais:start                    - Start with global coverage')
  console.log('  npm run ais:start -- --no-pos        - Disable position tracking')
  console.log('  npm run ais:start -- --region=singapore - Singapore region only')
  console.log('  npm run ais:start -- --sample=20     - Record 1 in 20 positions')
  console.log('\nAvailable regions:')
  console.log('  - global (default)')
  console.log('  - singapore')
  console.log('  - north-atlantic')
  console.log('  - mediterranean')
  console.log('  - indian-ocean')
  console.log('  - pacific')
  console.log('\nExamples:')
  console.log('  npm run ais:start')
  console.log('  npm run ais:start -- --region=singapore')
  console.log('  npm run ais:start -- --no-pos --region=mediterranean')
  console.log('  npm run ais:start -- --sample=5 --region=pacific')
  process.exit(0)
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
