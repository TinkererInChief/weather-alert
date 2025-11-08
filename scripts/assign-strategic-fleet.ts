import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Assigning Strategic Test Fleet to current user...\n')

  // Find the Test Contact user
  const testUser = await prisma.contact.findFirst({
    where: {
      name: 'Test Contact'
    }
  })

  if (!testUser) {
    console.error('❌ Test Contact user not found!')
    return
  }

  // Find the Strategic Test Fleet
  const fleet = await prisma.fleet.findFirst({
    where: {
      name: 'Strategic Test Fleet'
    }
  })

  if (!fleet) {
    console.error('❌ Strategic Test Fleet not found!')
    return
  }

  // Update fleet owner
  await prisma.fleet.update({
    where: { id: fleet.id },
    data: { ownerId: testUser.id }
  })

  console.log(`✅ Fleet "${fleet.name}" assigned to ${testUser.name}`)
  console.log(`📊 ${12} strategic vessels ready for testing`)
  console.log('\n🌊 Go to /dashboard/simulate-tsunami and run any preset scenario!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
