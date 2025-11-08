import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Assigning ALL fleets to the first available user...\n')

  // Find the first user (any user)
  const user = await prisma.contact.findFirst({
    where: {
      email: { not: null }
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  if (!user) {
    console.error('❌ No user found!')
    return
  }

  console.log(`👤 Found user: ${user.name || user.email}`)
  console.log(`📧 Email: ${user.email}\n`)

  // Get all fleets
  const fleets = await prisma.fleet.findMany()

  console.log(`📋 Found ${fleets.length} fleet(s)\n`)

  // Assign all fleets to this user
  for (const fleet of fleets) {
    await prisma.fleet.update({
      where: { id: fleet.id },
      data: { ownerId: user.id }
    })

    console.log(`✅ Assigned fleet: ${fleet.name}`)
  }

  // Count vessels across all fleets
  const vesselCount = await prisma.fleetVessel.count({
    where: {
      fleet: {
        ownerId: user.id
      }
    }
  })

  console.log(`\n📊 Total vessels in user's fleets: ${vesselCount}`)
  console.log(`\n✅ All fleets assigned to ${user.name || user.email}`)
  console.log(`\n🌊 Now refresh the page and run the tsunami simulation!`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
