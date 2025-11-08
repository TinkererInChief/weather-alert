import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

async function main() {
  console.log('🧪 Testing Tohoku simulation logic...\n')

  // Tohoku preset
  const epicenterLat = 38.3
  const epicenterLon = 142.4
  const magnitude = 9.0

  console.log(`📍 Epicenter: ${epicenterLat}°N, ${epicenterLon}°E`)
  console.log(`📊 Magnitude: ${magnitude}\n`)

  // Find user
  const user = await prisma.contact.findFirst({
    where: { email: 'test@example.com' }
  })

  if (!user) {
    console.error('❌ User not found!')
    return
  }

  console.log(`👤 User: ${user.name} (${user.id})\n`)

  // Get vessels exactly as the API does
  const fleetVessels = await prisma.fleetVessel.findMany({
    where: {
      fleet: {
        ownerId: user.id
      }
    },
    include: {
      vessel: {
        include: {
          contacts: {
            include: { contact: true },
            orderBy: { priority: 'asc' }
          },
          positions: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      }
    }
  })

  console.log(`🚢 Found ${fleetVessels.length} vessels in fleet\n`)

  let vesselsWithPositions = 0
  let vesselsInRange = 0

  for (const fv of fleetVessels) {
    const vessel = fv.vessel
    const latestPosition = vessel.positions && vessel.positions[0]
    
    if (!latestPosition) {
      continue
    }
    
    vesselsWithPositions++
    
    const vesselLat = latestPosition.latitude
    const vesselLon = latestPosition.longitude
    
    const distance = calculateDistance(epicenterLat, epicenterLon, vesselLat, vesselLon)
    
    if (distance < 1000) {
      vesselsInRange++
      console.log(`✅ ${vessel.name || vessel.mmsi}`)
      console.log(`   Position: ${vesselLat.toFixed(2)}°N, ${vesselLon.toFixed(2)}°E`)
      console.log(`   Distance: ${distance.toFixed(2)} km`)
      console.log(`   Contacts: ${vessel.contacts.length}`)
      console.log()
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Total fleet vessels: ${fleetVessels.length}`)
  console.log(`   Vessels with positions: ${vesselsWithPositions}`)
  console.log(`   Vessels in range (<1000km): ${vesselsInRange}`)
  
  if (vesselsInRange === 0) {
    console.log(`\n❌ PROBLEM: No vessels found in range!`)
    console.log(`   This should find at least the 3 strategic vessels near Tohoku`)
  } else {
    console.log(`\n✅ SUCCESS: Vessels found in danger zone`)
  }
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
