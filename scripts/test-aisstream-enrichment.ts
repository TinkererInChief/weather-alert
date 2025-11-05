import { aisstreamEnrichmentService } from '../lib/services/aisstream-enrichment.service'

async function main() {
  console.log('🌊 AISStream Ship Static Data Enrichment Test\n')
  
  if (!aisstreamEnrichmentService.isConfigured()) {
    console.error('❌ AISStream API key not configured')
    console.log('Please set AISSTREAM_API_KEY in your .env file')
    process.exit(1)
  }
  
  console.log('✅ AISStream API key found')
  console.log('📡 Connecting to AISStream WebSocket...')
  console.log('🎯 Listening for Ship Static Data messages (Type 5)\n')
  console.log('This will:')
  console.log('  - Receive real-time ship static data from AIS')
  console.log('  - Extract vessel name, IMO, callsign, type, dimensions')
  console.log('  - Automatically enrich vessels in database')
  console.log('  - Create new vessels if not found\n')
  console.log('Press Ctrl+C to stop\n')
  
  // Start listening
  await aisstreamEnrichmentService.start({
    // Optional: Limit to specific regions
    // boundingBoxes: [
    //   [[1.0, 103.5], [1.5, 104.0]] // Singapore Strait
    // ],
    
    onStaticData: (data) => {
      console.log(`\n📍 Ship Static Data received:`)
      console.log(`   MMSI: ${data.UserID}`)
      console.log(`   Name: ${data.Name.replace(/@+$/, '')}`)
      if (data.ImoNumber) console.log(`   IMO: ${data.ImoNumber}`)
      console.log(`   Callsign: ${data.CallSign}`)
      console.log(`   Type: ${data.Type}`)
      if (data.Dimension) {
        const length = data.Dimension.A + data.Dimension.B
        const width = data.Dimension.C + data.Dimension.D
        console.log(`   Dimensions: ${length}m x ${width}m`)
      }
      if (data.MaximumStaticDraught) {
        console.log(`   Draught: ${data.MaximumStaticDraught}m`)
      }
      if (data.Destination) {
        console.log(`   Destination: ${data.Destination.replace(/@+$/, '')}`)
      }
    },
    
    onError: (error) => {
      console.error('❌ Error:', error.message)
    }
  })
  
  // Show stats every 30 seconds
  setInterval(() => {
    const stats = aisstreamEnrichmentService.getStats()
    console.log(`\n📊 Statistics:`)
    console.log(`   Messages received: ${stats.messagesReceived}`)
    console.log(`   Static data messages: ${stats.staticDataMessages}`)
    console.log(`   Vessels enriched: ${stats.vesselsEnriched}`)
    console.log(`   Vessels created: ${stats.vesselsCreated}`)
    console.log(`   Errors: ${stats.errors}`)
    console.log(`   Uptime: ${Math.floor(stats.uptime / 1000)}s`)
    console.log(`   Connected: ${aisstreamEnrichmentService.isConnected() ? '✅' : '❌'}`)
  }, 30000)
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...')
    const stats = aisstreamEnrichmentService.getStats()
    console.log('\n📊 Final Statistics:')
    console.log(`   Messages received: ${stats.messagesReceived}`)
    console.log(`   Static data messages: ${stats.staticDataMessages}`)
    console.log(`   Vessels enriched: ${stats.vesselsEnriched}`)
    console.log(`   Vessels created: ${stats.vesselsCreated}`)
    console.log(`   Errors: ${stats.errors}`)
    console.log(`   Total uptime: ${Math.floor(stats.uptime / 1000)}s`)
    
    aisstreamEnrichmentService.stop()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
