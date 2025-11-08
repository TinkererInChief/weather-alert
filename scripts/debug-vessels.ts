import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Debugging vessel availability...\n')

  // Find the user
  const user = await prisma.contact.findFirst({
    where: {
      email: 'test@example.com'
    }
  })

  if (!user) {
    console.error('❌ User not found!')
    return
  }

  console.log(`👤 User: ${user.name} (${user.email})\n`)

  // Get user's fleets
  const fleets = await prisma.fleet.findMany({
    where: {
      ownerId: user.id
    },
    include: {
      _count: {
        select: { vessels: true }
      }
    }
  })

  console.log(`📋 User has ${fleets.length} fleet(s):`)
  fleets.forEach(f => {
    console.log(`   - ${f.name}: ${f._count.vessels} vessels`)
  })
  console.log()

  // Get all vessels in user's fleets WITH positions
  const fleetVessels = await prisma.fleetVessel.findMany({
    where: {
      fleet: {
        ownerId: user.id
      }
    },
    include: {
      vessel: {
        include: {
          positions: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      }
    }
  })

  console.log(`🚢 Total FleetVessel records: ${fleetVessels.length}`)
  
  const vesselsWithPositions = fleetVessels.filter(fv => fv.vessel.positions.length > 0)
  const vesselsWithoutPositions = fleetVessels.filter(fv => fv.vessel.positions.length === 0)

  console.log(`✅ Vessels WITH positions: ${vesselsWithPositions.length}`)
  console.log(`❌ Vessels WITHOUT positions: ${vesselsWithoutPositions.length}\n`)

  if (vesselsWithPositions.length > 0) {
    console.log('📍 Vessels with positions:')
    vesselsWithPositions.slice(0, 10).forEach(fv => {
      const pos = fv.vessel.positions[0]
      console.log(`   ${fv.vessel.name} (${fv.vessel.mmsi}): ${pos.latitude.toFixed(2)}°N, ${pos.longitude.toFixed(2)}°E`)
    })
    if (vesselsWithPositions.length > 10) {
      console.log(`   ... and ${vesselsWithPositions.length - 10} more`)
    }
  }

  if (vesselsWithoutPositions.length > 0) {
    console.log('\n⚠️  Vessels WITHOUT positions:')
    vesselsWithoutPositions.slice(0, 10).forEach(fv => {
      console.log(`   ${fv.vessel.name} (${fv.vessel.mmsi})`)
    })
    if (vesselsWithoutPositions.length > 10) {
      console.log(`   ... and ${vesselsWithoutPositions.length - 10} more`)
    }
  }

  // Check strategic vessels specifically
  console.log('\n🎯 Strategic Test Fleet vessels:')
  const strategicFleet = fleets.find(f => f.name === 'Strategic Test Fleet')
  
  if (strategicFleet) {
    const strategicVessels = await prisma.fleetVessel.findMany({
      where: {
        fleetId: strategicFleet.id
      },
      include: {
        vessel: {
          include: {
            positions: {
              orderBy: { timestamp: 'desc' },
              take: 1
            }
          }
        }
      }
    })

    console.log(`   Total: ${strategicVessels.length}`)
    strategicVessels.forEach(fv => {
      const pos = fv.vessel.positions[0]
      if (pos) {
        console.log(`   ✅ ${fv.vessel.name}: ${pos.latitude.toFixed(2)}°N, ${pos.longitude.toFixed(2)}°E`)
      } else {
        console.log(`   ❌ ${fv.vessel.name}: NO POSITION DATA`)
      }
    })
  } else {
    console.log('   ❌ Strategic Test Fleet not found!')
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
