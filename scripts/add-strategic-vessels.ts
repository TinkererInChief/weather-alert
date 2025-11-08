import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Add vessels strategically positioned to be caught by preset tsunami scenarios
 */

const strategicVessels = [
  // Tokyo Bay Scenario (35.5°N, 139.8°E, Mag 7.5)
  { name: 'TOKYO EXPRESS', mmsi: '431001001', lat: 35.6, lon: 139.9, region: 'Tokyo Bay - 30km from epicenter' },
  { name: 'HANEDA TRADER', mmsi: '431001002', lat: 35.3, lon: 139.5, region: 'Tokyo Bay - 50km from epicenter' },
  { name: 'YOKOHAMA STAR', mmsi: '431001003', lat: 35.8, lon: 140.2, region: 'Tokyo Bay - 70km from epicenter' },
  
  // Tohoku Scenario (38.3°N, 142.4°E, Mag 9.0) - Historical 2011 location
  { name: 'SENDAI PRINCESS', mmsi: '431002001', lat: 38.5, lon: 142.0, region: 'Tohoku - 50km from epicenter' },
  { name: 'MIYAGI FORTUNE', mmsi: '431002002', lat: 38.0, lon: 142.8, region: 'Tohoku - 60km from epicenter' },
  { name: 'PACIFIC GUARDIAN', mmsi: '431002003', lat: 38.7, lon: 141.9, region: 'Tohoku - 80km from epicenter' },
  
  // Indonesia Scenario (-8.5°N, 119.5°E, Mag 7.0)
  { name: 'JAKARTA PROMISE', mmsi: '525001001', lat: -8.3, lon: 119.3, region: 'Indonesia - 35km from epicenter' },
  { name: 'BALI SPIRIT', mmsi: '525001002', lat: -8.7, lon: 119.8, region: 'Indonesia - 40km from epicenter' },
  { name: 'LOMBOK TRADER', mmsi: '525001003', lat: -8.2, lon: 120.0, region: 'Indonesia - 75km from epicenter' },
  
  // California Scenario (36.1°N, -121.9°E, Mag 6.5)
  { name: 'MONTEREY BAY', mmsi: '367001001', lat: 36.3, lon: -122.1, region: 'California - 40km from epicenter' },
  { name: 'SANTA CRUZ WAVE', mmsi: '367001002', lat: 36.0, lon: -121.7, region: 'California - 25km from epicenter' },
  { name: 'PACIFIC GROVE', mmsi: '367001003', lat: 35.9, lon: -122.2, region: 'California - 50km from epicenter' },
]

async function main() {
  console.log('🎯 Adding strategically positioned vessels for tsunami scenarios...\n')

  // Get the first user to assign fleets
  const user = await prisma.contact.findFirst({
    where: {
      email: { not: null }
    }
  })

  if (!user) {
    console.error('❌ No user found!')
    return
  }

  // Get or create a test fleet
  let fleet = await prisma.fleet.findFirst({
    where: {
      name: 'Strategic Test Fleet'
    }
  })

  if (!fleet) {
    fleet = await prisma.fleet.create({
      data: {
        name: 'Strategic Test Fleet',
        description: 'Vessels positioned to test tsunami scenarios',
        ownerId: user.id,
        active: true
      }
    })
    console.log(`✅ Created fleet: ${fleet.name}`)
  }

  for (const vesselData of strategicVessels) {
    // Check if vessel already exists
    let vessel = await prisma.vessel.findUnique({
      where: { mmsi: vesselData.mmsi }
    })

    if (!vessel) {
      // Create the vessel
      vessel = await prisma.vessel.create({
        data: {
          mmsi: vesselData.mmsi,
          name: vesselData.name,
          vesselType: 'CARGO',
          flag: vesselData.mmsi.startsWith('431') ? 'JP' : 
                vesselData.mmsi.startsWith('525') ? 'ID' : 
                vesselData.mmsi.startsWith('367') ? 'US' : 'XX',
          active: true
        }
      })

      // Add to fleet
      await prisma.fleetVessel.create({
        data: {
          fleetId: fleet.id,
          vesselId: vessel.id
        }
      })

      console.log(`🚢 Created vessel: ${vessel.name}`)
    }

    // Create current position
    await prisma.vesselPosition.create({
      data: {
        vesselId: vessel.id,
        latitude: vesselData.lat,
        longitude: vesselData.lon,
        speed: 10 + Math.random() * 10,
        course: Math.random() * 360,
        timestamp: new Date(),
        dataSource: 'AIS'
      }
    })

    console.log(`   📍 Position: ${vesselData.lat.toFixed(2)}°N, ${vesselData.lon.toFixed(2)}°E`)
    console.log(`   📊 ${vesselData.region}`)
    console.log()
  }

  console.log('✅ All strategic vessels added successfully!')
  console.log('\n🌊 Ready to test tsunami scenarios:')
  console.log('   1️⃣  Tokyo Bay (Mag 7.5) → 3 vessels affected')
  console.log('   2️⃣  Tohoku (Mag 9.0) → 3 vessels affected (CRITICAL)')
  console.log('   3️⃣  Indonesia (Mag 7.0) → 3 vessels affected')
  console.log('   4️⃣  California (Mag 6.5) → 3 vessels affected')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
