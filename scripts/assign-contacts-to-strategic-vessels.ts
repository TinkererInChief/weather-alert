import { PrismaClient, VesselContactRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('👥 Assigning contacts to strategic vessels...\n')

  // Get all strategic vessels
  const strategicVessels = await prisma.vessel.findMany({
    where: {
      mmsi: {
        in: [
          // Tokyo Bay
          '431001001', '431001002', '431001003',
          // Tohoku
          '431002001', '431002002', '431002003',
          // Indonesia
          '525001001', '525001002', '525001003',
          // California
          '367001001', '367001002', '367001003'
        ]
      }
    }
  })

  // Get test contacts (any contacts with phone numbers)
  const contacts = await prisma.contact.findMany({
    where: {
      phone: { not: null }
    },
    take: 5
  })

  if (contacts.length === 0) {
    console.error('❌ No test contacts found!')
    return
  }

  console.log(`📋 Found ${contacts.length} contacts to assign\n`)

  for (const vessel of strategicVessels) {
    // Assign 3-5 contacts per vessel with different roles
    const roles: Array<{ contact: any; role: VesselContactRole; priority: number }> = [
      { contact: contacts[0], role: VesselContactRole.CAPTAIN, priority: 1 },
      { contact: contacts[1], role: VesselContactRole.CHIEF_OFFICER, priority: 2 },
      { contact: contacts[2], role: VesselContactRole.MANAGER, priority: 3 },
      { contact: contacts[3], role: VesselContactRole.OWNER, priority: 4 },
      { contact: contacts[4], role: VesselContactRole.EMERGENCY_CONTACT, priority: 5 }
    ]

    for (const assignment of roles) {
      if (!assignment.contact) continue

      // Check if already exists
      const existing = await prisma.vesselContact.findFirst({
        where: {
          vesselId: vessel.id,
          contactId: assignment.contact.id
        }
      })

      if (!existing) {
        await prisma.vesselContact.create({
          data: {
            vesselId: vessel.id,
            contactId: assignment.contact.id,
            role: assignment.role,
            priority: assignment.priority
          }
        })
      }
    }

    console.log(`✅ ${vessel.name}: Assigned ${roles.length} contacts`)
  }

  console.log('\n✅ All contacts assigned!')
  console.log('🚀 Ready for end-to-end escalation testing!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
