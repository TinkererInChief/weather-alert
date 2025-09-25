import { prisma } from '../lib/prisma'
import { TemplateService } from '../lib/services/template-service'

async function main() {
  console.log('🌱 Seeding production database...')

  try {
    // Create default contact groups
    const emergencyGroup = await prisma.contactGroup.upsert({
      where: { id: 'emergency-responders' },
      update: {},
      create: {
        id: 'emergency-responders',
        name: 'Emergency Responders',
        description: 'First responders and emergency personnel',
        metadata: { priority: 'high', channels: ['sms', 'voice', 'whatsapp'] }
      }
    })

    const publicGroup = await prisma.contactGroup.upsert({
      where: { id: 'public-alerts' },
      update: {},
      create: {
        id: 'public-alerts',
        name: 'Public Alerts',
        description: 'General public emergency notifications',
        metadata: { priority: 'medium', channels: ['sms', 'email'] }
      }
    })

    console.log('✅ Contact groups created')

    // Create default alert zones
    const zones = [
      {
        id: 'pacific-coast',
        name: 'Pacific Coast',
        type: 'tsunami_zone',
        zoneCode: 'US-PAC-001',
        priority: 1,
        metadata: { 
          coastline: 'pacific',
          population: 50000000,
          evacuationTime: '30min'
        }
      },
      {
        id: 'california-central',
        name: 'California Central Valley',
        type: 'earthquake_zone', 
        zoneCode: 'US-CA-CV',
        priority: 2,
        metadata: {
          seismicActivity: 'high',
          population: 4000000
        }
      },
      {
        id: 'bay-area',
        name: 'San Francisco Bay Area',
        type: 'earthquake_zone',
        zoneCode: 'US-CA-BAY',
        priority: 1,
        metadata: {
          seismicActivity: 'very-high',
          population: 7500000,
          faultLines: ['San Andreas', 'Hayward']
        }
      }
    ]

    for (const zone of zones) {
      await prisma.alertZone.upsert({
        where: { id: zone.id },
        update: zone,
        create: zone
      })
    }

    console.log('✅ Alert zones created')

    // Seed message templates
    const templateService = new TemplateService()
    await templateService.seedDefaultTemplates()

    console.log('✅ Message templates seeded')

    // Create sample emergency contacts (remove in production)
    if (process.env.NODE_ENV !== 'production') {
      const sampleContacts = [
        {
          name: 'Emergency Coordinator',
          email: 'emergency@example.com',
          phone: '+1234567890',
          notificationChannels: ['sms', 'email', 'voice'],
          isCoastalResident: true,
          elevationMeters: 15
        },
        {
          name: 'Public Safety Director', 
          email: 'safety@example.com',
          phone: '+1234567891',
          notificationChannels: ['sms', 'voice', 'whatsapp'],
          isCoastalResident: false,
          elevationMeters: 150
        }
      ]

      for (const contact of sampleContacts) {
        await prisma.contact.upsert({
          where: { phone: contact.phone },
          update: contact,
          create: contact
        })
      }

      console.log('✅ Sample contacts created (development only)')
    }

    // Verify database structure
    const counts = {
      contacts: await prisma.contact.count(),
      groups: await prisma.contactGroup.count(),
      zones: await prisma.alertZone.count(),
      templates: await prisma.messageTemplate.count()
    }

    console.log('📊 Database seed summary:', counts)
    console.log('🎉 Database seeding completed successfully!')

  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
