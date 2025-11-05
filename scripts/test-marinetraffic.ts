import { marineTrafficService } from '../lib/services/marinetraffic.service'

async function main() {
  console.log('🚢 Testing MarineTraffic API...\n')
  
  // Check if configured
  if (!marineTrafficService.isConfigured()) {
    console.error('❌ MarineTraffic API key not configured')
    console.log('Please set MARINETRAFFIC_API_KEY in your .env file')
    process.exit(1)
  }
  
  console.log('✅ API key found\n')
  
  // Test connection
  console.log('📡 Testing API connection...')
  const testResult = await marineTrafficService.testConnection()
  
  if (testResult.success) {
    console.log(`✅ ${testResult.message}`)
    
    if (testResult.data?.sampleVessel) {
      console.log('\n📍 Sample vessel:')
      const vessel = testResult.data.sampleVessel
      console.log(`   Name: ${vessel.shipName}`)
      console.log(`   MMSI: ${vessel.mmsi}`)
      console.log(`   Position: ${vessel.latitude.toFixed(4)}°N, ${vessel.longitude.toFixed(4)}°E`)
      console.log(`   Speed: ${vessel.speed} knots`)
      console.log(`   Course: ${vessel.course}°`)
      if (vessel.destination) {
        console.log(`   Destination: ${vessel.destination}`)
      }
    }
    
    console.log('\n🎉 MarineTraffic API is working!')
  } else {
    console.error(`❌ API test failed: ${testResult.message}`)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
