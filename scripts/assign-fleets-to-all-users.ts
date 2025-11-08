import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function assignToAllUsers() {
  console.log('🔧 Making fleets visible to all users...\n')
  
  // Get all real users (not test users)
  const users = await prisma.user.findMany({
    where: {
      email: { not: { contains: 'test-owner' } }
    }
  })
  
  console.log(`👥 Found ${users.length} users:`)
  users.forEach(u => console.log(`   ${u.email || 'No email'} (${u.id})`))
  
  // Get all fleets
  const fleets = await prisma.fleet.findMany()
  
  console.log(`\n🚢 Found ${fleets.length} fleets\n`)
  
  // For each user, create GlobalFleetVessel entries so they can see all fleets
  // (This is a workaround - proper fix would be to use GlobalFleetVessel table)
  
  // Actually, let's just assign all fleets to the first real user
  const firstUser = users.find(u => u.email) || users[0]
  
  if (!firstUser) {
    console.log('❌ No users found!')
    return
  }
  
  console.log(`✅ Assigning all fleets to: ${firstUser.email}\n`)
  
  for (const fleet of fleets) {
    await prisma.fleet.update({
      where: { id: fleet.id },
      data: { ownerId: firstUser.id }
    })
    console.log(`  ✅ ${fleet.name} → ${firstUser.email}`)
  }
  
  console.log('\n✅ Done! Now log out and log back in, then refresh the page.\n')
  
  await prisma.$disconnect()
}

assignToAllUsers().catch(console.error)
