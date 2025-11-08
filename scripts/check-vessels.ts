import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkVessels() {
  try {
    console.log('🔍 Checking database for vessels...\n')
    
    // Check total vessels
    const totalVessels = await prisma.vessel.count()
    console.log(`📊 Total vessels in database: ${totalVessels}`)
    
    // Check vessels with positions
    const vesselsWithPositions = await prisma.vessel.findMany({
      include: {
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    })
    
    const hasPosition = vesselsWithPositions.filter(v => v.positions.length > 0)
    console.log(`📍 Vessels with positions: ${hasPosition.length}`)
    
    if (hasPosition.length > 0) {
      console.log('\n✅ Sample vessels with positions:')
      hasPosition.slice(0, 5).forEach(v => {
        const pos = v.positions[0]
        console.log(`  - ${v.name || v.mmsi}: ${pos.latitude.toFixed(2)}°, ${pos.longitude.toFixed(2)}°`)
      })
    } else {
      console.log('\n⚠️  No vessels have positions!')
      console.log('   Run: pnpm run db:seed')
    }
    
    // Check fleets
    const totalFleets = await prisma.fleet.count()
    console.log(`\n🚢 Total fleets: ${totalFleets}`)
    
    // Check contacts
    const totalContacts = await prisma.contact.count()
    console.log(`👥 Total contacts: ${totalContacts}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkVessels()
