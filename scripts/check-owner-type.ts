import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking Fleet owner types...\n')

  // Get a fleet
  const fleet = await prisma.fleet.findFirst({
    where: {
      name: 'Strategic Test Fleet'
    }
  })

  if (!fleet) {
    console.error('❌ Fleet not found!')
    return
  }

  console.log(`📋 Fleet: ${fleet.name}`)
  console.log(`   ownerId: ${fleet.ownerId}\n`)

  // Check if ownerId matches a User
  const user = await prisma.user.findUnique({
    where: { id: fleet.ownerId }
  })

  // Check if ownerId matches a Contact
  const contact = await prisma.contact.findUnique({
    where: { id: fleet.ownerId }
  })

  console.log(`👤 User match:`, user ? `✅ ${user.name} (${user.email || user.phone})` : '❌ No match')
  console.log(`📇 Contact match:`, contact ? `✅ ${contact.name} (${contact.email})` : '❌ No match')

  // Get the session user
  const sessionUser = await prisma.user.findFirst({
    where: { email: 'test@example.com' }
  })

  console.log(`\n🔐 Session User (test@example.com):`, sessionUser ? `✅ ID: ${sessionUser.id}` : '❌ Not found')

  if (sessionUser && fleet) {
    console.log(`\n📊 Comparison:`)
    console.log(`   Fleet ownerId: ${fleet.ownerId}`)
    console.log(`   Session User ID: ${sessionUser.id}`)
    console.log(`   Match: ${fleet.ownerId === sessionUser.id ? '✅ YES' : '❌ NO'}`)
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
