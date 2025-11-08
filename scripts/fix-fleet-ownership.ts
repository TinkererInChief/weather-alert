import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixOwnership() {
  console.log('🔧 Fixing fleet ownership...\n')
  
  // Get the first real user (not test-owner)
  const realUser = await prisma.user.findFirst({
    where: {
      email: { not: 'test-owner@maritime.test' }
    },
    orderBy: { createdAt: 'asc' }
  })
  
  if (!realUser) {
    console.log('❌ No real user found')
    return
  }
  
  console.log(`✅ Using user: ${realUser.email} (${realUser.id})\n`)
  
  // First, clean up duplicate test fleets
  console.log('🧹 Removing duplicate test fleets...')
  const allTestFleets = await prisma.fleet.findMany({
    where: { name: { contains: '[TEST]' } },
    include: { vessels: true },
    orderBy: { createdAt: 'desc' }
  })
  
  // Keep only the latest 3 test fleets, delete the rest
  const fleetsToKeep = allTestFleets.slice(0, 3)
  const fleetsToDelete = allTestFleets.slice(3)
  
  for (const fleet of fleetsToDelete) {
    console.log(`  🗑️  Deleting duplicate: ${fleet.name}`)
    await prisma.fleet.delete({ where: { id: fleet.id } })
  }
  
  console.log(`\n✅ Kept ${fleetsToKeep.length} test fleets\n`)
  
  // Update ALL fleets to be owned by the real user
  console.log('👤 Updating fleet ownership...')
  const allFleets = await prisma.fleet.findMany()
  
  for (const fleet of allFleets) {
    await prisma.fleet.update({
      where: { id: fleet.id },
      data: { ownerId: realUser.id }
    })
    console.log(`  ✅ ${fleet.name} → ${realUser.email}`)
  }
  
  // Clean up duplicate policies
  console.log('\n🧹 Cleaning duplicate policies...')
  const allPolicies = await prisma.escalationPolicy.findMany({
    orderBy: { createdAt: 'desc' }
  })
  
  const policyNames = new Set()
  const policiesToDelete = []
  
  for (const policy of allPolicies) {
    if (policyNames.has(policy.name)) {
      policiesToDelete.push(policy)
    } else {
      policyNames.add(policy.name)
    }
  }
  
  for (const policy of policiesToDelete) {
    console.log(`  🗑️  Deleting duplicate: ${policy.name}`)
    await prisma.escalationPolicy.delete({ where: { id: policy.id } })
  }
  
  console.log('\n✅ Ownership fixed! Refresh your browser.\n')
  
  await prisma.$disconnect()
}

fixOwnership().catch(console.error)
