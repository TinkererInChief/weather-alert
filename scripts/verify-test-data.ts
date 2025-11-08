import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
  console.log('🔍 Verifying test data...\n')
  
  // Check users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true }
  })
  console.log('👥 Users:')
  users.forEach(u => console.log(`   ${u.email} (${u.id})`))
  
  // Check fleets
  const fleets = await prisma.fleet.findMany({
    include: {
      vessels: { include: { vessel: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  console.log(`\n🚢 Fleets: ${fleets.length} total`)
  fleets.forEach(f => {
    console.log(`   ${f.name}`)
    console.log(`     Owner ID: ${f.ownerId}`)
    console.log(`     Active: ${f.active}`)
    console.log(`     Vessels: ${f.vessels.length}`)
  })
  
  // Check contacts
  const contacts = await prisma.contact.findMany({
    where: { name: { contains: '[TEST]' } }
  })
  console.log(`\n📞 Test Contacts: ${contacts.length}`)
  
  // Check escalation policies
  const policies = await prisma.escalationPolicy.findMany()
  console.log(`\n📋 Escalation Policies: ${policies.length}`)
  policies.forEach(p => {
    console.log(`   ${p.name} - ${p.active ? 'Active' : 'Inactive'}`)
  })
  
  await prisma.$disconnect()
}

verify().catch(console.error)
