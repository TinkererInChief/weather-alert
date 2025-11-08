import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixFleets() {
  // The logged-in user
  const currentUserId = 'cmhccuj4r0001bs3f1bknzlhl'
  
  console.log('🔧 Assigning all fleets to Test Contact user...\n')
  
  const fleets = await prisma.fleet.findMany()
  
  for (const fleet of fleets) {
    await prisma.fleet.update({
      where: { id: fleet.id },
      data: { ownerId: currentUserId }
    })
    console.log(`  ✅ ${fleet.name}`)
  }
  
  console.log(`\n✅ Assigned ${fleets.length} fleets to your user!`)
  console.log('🔄 Refresh your browser now!\n')
  
  await prisma.$disconnect()
}

fixFleets().catch(console.error)
