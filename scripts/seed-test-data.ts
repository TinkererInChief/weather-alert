/**
 * Test Data Seeder for Maritime Alert System
 * 
 * Creates comprehensive test data with clear identification:
 * - All test data marked with [TEST] prefix
 * - Contacts use deliverable phone/email (REPLACE WITH YOUR NUMBERS)
 * - Metadata includes isTestData flag for easy filtering
 * 
 * Usage: pnpm tsx scripts/seed-test-data.ts
 * Clean: pnpm tsx scripts/seed-test-data.ts --clean
 */

import { PrismaClient, VesselContactRole } from '@prisma/client'

const prisma = new PrismaClient()

// ⚠️ IMPORTANT: Replace these with YOUR actual phone numbers for testing deliverability
// Use international format with country code (e.g., +1 for US, +91 for India)
const YOUR_TEST_PHONES = [
  '+919910490077',  // Replace with your phone #1
  '+919871486111',  // Replace with your phone #2
  '+919871486111',  // Replace with your phone #3
  '+919871486111',  // Replace with your phone #4
  '+919871486111',  // Replace with your phone #5
]

// ⚠️ IMPORTANT: Replace with YOUR actual email addresses for testing
const YOUR_TEST_EMAILS = [
  'yash@nurtr.com',
  'dy@nurtr.com',
  'support@nurtr.com',
  'dyashovardhan+1@gmail.com',
  'dyashovardhan+2@gmail.com',
]

// Test contact data with various roles (clearly marked as TEST)
const TEST_CONTACTS = [
  // Captains
  { 
    name: '[TEST] Captain John Smith', 
    email: YOUR_TEST_EMAILS[0], 
    phone: YOUR_TEST_PHONES[0], 
    whatsapp: YOUR_TEST_PHONES[0], 
    role: 'CAPTAIN', 
    location: 'San Francisco',
    vesselRole: VesselContactRole.CAPTAIN,
    priority: 1
  },
  { 
    name: '[TEST] Captain Maria Garcia', 
    email: YOUR_TEST_EMAILS[1], 
    phone: YOUR_TEST_PHONES[1], 
    whatsapp: YOUR_TEST_PHONES[1], 
    role: 'CAPTAIN', 
    location: 'Los Angeles',
    vesselRole: VesselContactRole.CAPTAIN,
    priority: 1
  },
  { 
    name: '[TEST] Captain James Chen', 
    email: YOUR_TEST_EMAILS[2], 
    phone: YOUR_TEST_PHONES[2], 
    whatsapp: YOUR_TEST_PHONES[2], 
    role: 'CAPTAIN', 
    location: 'Seattle',
    vesselRole: VesselContactRole.CAPTAIN,
    priority: 1
  },
  
  // Chief Officers
  { 
    name: '[TEST] Officer Sarah Johnson', 
    email: YOUR_TEST_EMAILS[3], 
    phone: YOUR_TEST_PHONES[3], 
    whatsapp: YOUR_TEST_PHONES[3], 
    role: 'CHIEF_OFFICER', 
    location: 'New York',
    vesselRole: VesselContactRole.CHIEF_OFFICER,
    priority: 2
  },
  { 
    name: '[TEST] Officer Ahmed Hassan', 
    email: YOUR_TEST_EMAILS[4], 
    phone: YOUR_TEST_PHONES[4], 
    whatsapp: YOUR_TEST_PHONES[4], 
    role: 'CHIEF_OFFICER', 
    location: 'Miami',
    vesselRole: VesselContactRole.CHIEF_OFFICER,
    priority: 2
  },
  { 
    name: '[TEST] Officer Emily Wong', 
    email: YOUR_TEST_EMAILS[0], // Reuse for more notifications
    phone: `${YOUR_TEST_PHONES[0].slice(0, -1)}5`, // Slight variation
    whatsapp: YOUR_TEST_PHONES[0], 
    role: 'CHIEF_OFFICER', 
    location: 'Singapore',
    vesselRole: VesselContactRole.CHIEF_OFFICER,
    priority: 2
  },
  
  // Engineering Officers
  { 
    name: '[TEST] Engineer Robert Lee', 
    email: YOUR_TEST_EMAILS[1], 
    phone: `${YOUR_TEST_PHONES[1].slice(0, -1)}6`, 
    whatsapp: YOUR_TEST_PHONES[1], 
    role: 'ENGINEERING_OFFICER', 
    location: 'Tokyo',
    vesselRole: VesselContactRole.CHIEF_ENGINEER,
    priority: 3
  },
  { 
    name: '[TEST] Engineer Lisa Rodriguez', 
    email: YOUR_TEST_EMAILS[2], 
    phone: `${YOUR_TEST_PHONES[2].slice(0, -1)}7`, 
    whatsapp: YOUR_TEST_PHONES[2], 
    role: 'ENGINEERING_OFFICER', 
    location: 'Singapore',
    vesselRole: VesselContactRole.CHIEF_ENGINEER,
    priority: 3
  },
  
  // Operations Managers
  { 
    name: '[TEST] Manager David Park', 
    email: YOUR_TEST_EMAILS[3], 
    phone: `${YOUR_TEST_PHONES[3].slice(0, -1)}8`, 
    whatsapp: YOUR_TEST_PHONES[3], 
    role: 'OPERATIONS_MANAGER', 
    location: 'Hong Kong',
    vesselRole: VesselContactRole.MANAGER,
    priority: 4
  },
  { 
    name: '[TEST] Manager Anna Kowalski', 
    email: YOUR_TEST_EMAILS[4], 
    phone: `${YOUR_TEST_PHONES[4].slice(0, -1)}9`, 
    whatsapp: YOUR_TEST_PHONES[4], 
    role: 'OPERATIONS_MANAGER', 
    location: 'Hamburg',
    vesselRole: VesselContactRole.MANAGER,
    priority: 4
  },
  { 
    name: '[TEST] Manager Raj Patel', 
    email: YOUR_TEST_EMAILS[0], 
    phone: `${YOUR_TEST_PHONES[0].slice(0, -2)}10`, 
    whatsapp: YOUR_TEST_PHONES[0], 
    role: 'OPERATIONS_MANAGER', 
    location: 'Mumbai',
    vesselRole: VesselContactRole.MANAGER,
    priority: 4
  },
  
  // Vessel Owners
  { 
    name: '[TEST] Owner Michael Chang', 
    email: YOUR_TEST_EMAILS[1], 
    phone: `${YOUR_TEST_PHONES[1].slice(0, -2)}11`, 
    whatsapp: YOUR_TEST_PHONES[1], 
    role: 'VESSEL_OWNER', 
    location: 'Singapore',
    vesselRole: VesselContactRole.OWNER,
    priority: 5
  },
  { 
    name: '[TEST] Owner Sofia Martinez', 
    email: YOUR_TEST_EMAILS[2], 
    phone: `${YOUR_TEST_PHONES[2].slice(0, -2)}12`, 
    whatsapp: YOUR_TEST_PHONES[2], 
    role: 'VESSEL_OWNER', 
    location: 'Barcelona',
    vesselRole: VesselContactRole.OWNER,
    priority: 5
  },
  { 
    name: '[TEST] Owner William Thompson', 
    email: YOUR_TEST_EMAILS[3], 
    phone: `${YOUR_TEST_PHONES[3].slice(0, -2)}13`, 
    whatsapp: YOUR_TEST_PHONES[3], 
    role: 'VESSEL_OWNER', 
    location: 'London',
    vesselRole: VesselContactRole.OWNER,
    priority: 5
  },
  
  // Emergency Contacts
  { 
    name: '[TEST] Emergency Contact Alex Kim', 
    email: YOUR_TEST_EMAILS[4], 
    phone: `${YOUR_TEST_PHONES[4].slice(0, -2)}14`, 
    whatsapp: YOUR_TEST_PHONES[4], 
    role: 'EMERGENCY_COORDINATOR', 
    location: 'Seoul',
    vesselRole: VesselContactRole.EMERGENCY_CONTACT,
    priority: 6
  },
]

// Fleet definitions
const TEST_FLEETS = [
  {
    name: '[TEST] Pacific Fleet',
    description: 'Test fleet for Pacific Ocean operations - earthquake and tsunami testing',
    metadata: { isTestData: true, region: 'Pacific', purpose: 'testing' }
  },
  {
    name: '[TEST] Atlantic Fleet',
    description: 'Test fleet for Atlantic Ocean operations - storm and earthquake testing',
    metadata: { isTestData: true, region: 'Atlantic', purpose: 'testing' }
  },
  {
    name: '[TEST] Indian Ocean Fleet',
    description: 'Test fleet for Indian Ocean operations - tsunami and cyclone testing',
    metadata: { isTestData: true, region: 'Indian Ocean', purpose: 'testing' }
  },
]

// Default escalation policies
const ESCALATION_POLICIES = [
  {
    name: '[TEST] Earthquake Escalation Policy',
    description: 'Standard escalation for earthquake alerts - 3 steps with increasing urgency',
    eventTypes: ['earthquake'],
    severityLevels: ['critical', 'high'],
    steps: [
      {
        stepNumber: 1,
        waitMinutes: 0,
        channels: ['SMS'],
        contactRoles: ['CAPTAIN'],
        requireAcknowledgment: true,
        timeoutMinutes: 5
      },
      {
        stepNumber: 2,
        waitMinutes: 5,
        channels: ['SMS', 'VOICE'],
        contactRoles: ['CAPTAIN', 'CHIEF_OFFICER'],
        requireAcknowledgment: true,
        timeoutMinutes: 10
      },
      {
        stepNumber: 3,
        waitMinutes: 15,
        channels: ['VOICE', 'WHATSAPP'],
        contactRoles: ['MANAGER', 'OWNER'],
        requireAcknowledgment: false,
        timeoutMinutes: 0
      }
    ],
    metadata: { isTestData: true, purpose: 'earthquake-alerts' }
  },
  {
    name: '[TEST] Tsunami Escalation Policy',
    description: 'Urgent escalation for tsunami alerts - faster response, all channels',
    eventTypes: ['tsunami'],
    severityLevels: ['critical', 'high', 'moderate'],
    steps: [
      {
        stepNumber: 1,
        waitMinutes: 0,
        channels: ['SMS', 'WHATSAPP'],
        contactRoles: ['CAPTAIN', 'CHIEF_OFFICER'],
        requireAcknowledgment: true,
        timeoutMinutes: 2
      },
      {
        stepNumber: 2,
        waitMinutes: 2,
        channels: ['VOICE', 'SMS', 'WHATSAPP'],
        contactRoles: ['CAPTAIN', 'CHIEF_OFFICER', 'CHIEF_ENGINEER'],
        requireAcknowledgment: true,
        timeoutMinutes: 5
      },
      {
        stepNumber: 3,
        waitMinutes: 7,
        channels: ['VOICE', 'WHATSAPP', 'EMAIL'],
        contactRoles: ['MANAGER', 'OWNER', 'EMERGENCY_CONTACT'],
        requireAcknowledgment: false,
        timeoutMinutes: 0
      }
    ],
    metadata: { isTestData: true, purpose: 'tsunami-alerts' }
  },
]

async function cleanTestData() {
  console.log('🧹 Cleaning existing test data...\n')
  
  // Simple approach: delete by name patterns
  // Prisma will handle cascade deletes for relations
  
  console.log('  Deleting test escalation policies...')
  await prisma.escalationPolicy.deleteMany({
    where: { name: { contains: '[TEST]' } }
  })
  
  console.log('  Deleting test contacts and their assignments...')
  await prisma.contact.deleteMany({
    where: { name: { contains: '[TEST]' } }
  })
  
  console.log('  Deleting test fleets...')
  await prisma.fleet.deleteMany({
    where: { name: { contains: '[TEST]' } }
  })
  
  console.log('\n✅ Test data cleaned\n')
}

async function seedTestData() {
  console.log('🌱 Starting test data seeding...\n')
  
  // Check for placeholder values
  if (YOUR_TEST_PHONES.includes('+1234567890') || YOUR_TEST_EMAILS.includes('test1@yourdomain.com')) {
    console.log('⚠️  WARNING: You are using placeholder phone numbers and emails!')
    console.log('   For actual deliverability testing, edit the script and replace:')
    console.log('   - YOUR_TEST_PHONES with your real phone numbers')
    console.log('   - YOUR_TEST_EMAILS with your real email addresses\n')
    console.log('   Continuing with placeholders (notifications will fail)...\n')
  }
  
  // 1. Create test contacts
  console.log('📞 Creating test contacts...')
  const createdContacts = []
  
  for (const contactData of TEST_CONTACTS) {
    const { vesselRole, priority, ...contactFields } = contactData
    
    const contact = await prisma.contact.upsert({
      where: { phone: contactData.phone },
      update: {
        name: contactFields.name,
        email: contactFields.email,
        phone: contactFields.phone,
        whatsapp: contactFields.whatsapp,
        location: contactFields.location,
      },
      create: {
        name: contactFields.name,
        email: contactFields.email,
        phone: contactFields.phone,
        whatsapp: contactFields.whatsapp,
        location: contactFields.location,
        role: contactFields.role as any,
        notificationChannels: ['SMS', 'EMAIL', 'WHATSAPP'],
        notificationSettings: {
          isTestData: true,
          createdBy: 'test-seeder',
          purpose: 'testing-deliverability'
        },
        active: true,
      },
    })
    
    createdContacts.push({ ...contact, vesselRole, priority })
    console.log(`  ✅ ${contact.name} (${contact.role})`)
  }
  
  console.log(`\n✅ Created ${createdContacts.length} test contacts\n`)
  
  // 2. Create test fleets
  console.log('🚢 Creating test fleets...')
  const createdFleets = []
  
  // Use the first user in the database as fleet owner (so fleets are visible in UI)
  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' }
  })
  
  if (!firstUser) {
    console.log('  ⚠️  No users found. Please create a user account first.')
    console.log('     Skipping fleet creation.\n')
    return
  }
  
  console.log(`  Using ${firstUser.email} as fleet owner\n`)
  
  for (const fleetData of TEST_FLEETS) {
    const fleet = await prisma.fleet.create({
      data: {
        ...fleetData,
        ownerId: firstUser.id,
      },
    })
    
    createdFleets.push(fleet)
    console.log(`  ✅ ${fleet.name}`)
  }
  
  console.log(`\n✅ Created ${createdFleets.length} test fleets\n`)
  
  // 3. Get actual vessels from database and assign to fleets
  console.log('⚓ Assigning vessels to fleets...')
  
  // Get 20 vessels with recent positions
  const vessels = await prisma.vessel.findMany({
    take: 20,
    orderBy: { updatedAt: 'desc' },
    include: {
      positions: {
        take: 1,
        orderBy: { timestamp: 'desc' },
      },
    },
  })
  
  let assignmentCount = 0
  
  if (vessels.length === 0) {
    console.log('  ⚠️  No vessels found in database. Please run vessel ingestion first.')
    console.log('     Run: pnpm vessel:sync\n')
  } else {
    const vesselsPerFleet = Math.ceil(vessels.length / createdFleets.length)
    let vesselIndex = 0
    
    for (const fleet of createdFleets) {
      const fleetVessels = vessels.slice(vesselIndex, vesselIndex + vesselsPerFleet)
      
      for (const vessel of fleetVessels) {
        await prisma.fleetVessel.create({
          data: {
            fleetId: fleet.id,
            vesselId: vessel.id,
          },
        })
        
        console.log(`  ✅ ${vessel.name || vessel.mmsi} → ${fleet.name}`)
      }
      
      vesselIndex += vesselsPerFleet
    }
    
    console.log(`\n✅ Assigned ${vessels.length} vessels to ${createdFleets.length} fleets\n`)
    
    // 4. Create vessel-contact assignments
    console.log('👥 Creating vessel-contact assignments...')
    
    for (const vessel of vessels) {
      // Assign 4 contacts per vessel with different roles and priorities
      const contactsForVessel = [
        createdContacts.find(c => c.vesselRole === VesselContactRole.CAPTAIN),
        createdContacts.find(c => c.vesselRole === VesselContactRole.CHIEF_OFFICER),
        createdContacts.find(c => c.vesselRole === VesselContactRole.MANAGER),
        createdContacts.find(c => c.vesselRole === VesselContactRole.OWNER),
      ].filter(Boolean)
      
      for (const contactData of contactsForVessel) {
        if (!contactData) continue
        
        await prisma.vesselContact.upsert({
          where: {
            vesselId_contactId: {
              vesselId: vessel.id,
              contactId: contactData.id,
            },
          },
          update: {
            role: contactData.vesselRole,
            priority: contactData.priority,
            notifyOn: contactData.priority <= 2 
              ? ['critical', 'high', 'moderate']  // Captain & Chief Officer get all
              : ['critical', 'high'],              // Others get critical + high only
            primary: contactData.priority === 1,
          },
          create: {
            vesselId: vessel.id,
            contactId: contactData.id,
            role: contactData.vesselRole,
            priority: contactData.priority,
            notifyOn: contactData.priority <= 2 
              ? ['critical', 'high', 'moderate']  // Captain & Chief Officer get all
              : ['critical', 'high'],              // Others get critical + high only
            primary: contactData.priority === 1,
          },
        })
        
        assignmentCount++
      }
      
      console.log(`  ✅ ${vessel.name || vessel.mmsi} assigned to ${contactsForVessel.length} contacts`)
    }
    
    console.log(`\n✅ Created ${assignmentCount} vessel-contact assignments\n`)
  }
  
  // 5. Create escalation policies
  console.log('📋 Creating escalation policies...')
  const createdPolicies = []
  
  for (const policyData of ESCALATION_POLICIES) {
    const policy = await prisma.escalationPolicy.create({
      data: policyData,
    })
    
    createdPolicies.push(policy)
    console.log(`  ✅ ${policy.name} (${Array.isArray(policy.steps) ? policy.steps.length : 0} steps)`)
  }
  
  console.log(`\n✅ Created ${createdPolicies.length} escalation policies\n`)
  
  // Summary
  console.log('═'.repeat(60))
  console.log('🎉 TEST DATA SEEDING COMPLETE!\n')
  console.log(`📊 Summary:`)
  console.log(`   • ${createdContacts.length} test contacts`)
  console.log(`   • ${createdFleets.length} test fleets`)
  console.log(`   • ${vessels.length} vessels assigned`)
  console.log(`   • ${assignmentCount} vessel-contact assignments`)
  console.log(`   • ${createdPolicies.length} escalation policies\n`)
  
  console.log(`🔗 Quick Links:`)
  console.log(`   • Fleets: http://localhost:3000/dashboard/fleets`)
  console.log(`   • Contacts: http://localhost:3000/dashboard/contacts`)
  console.log(`   • Policies: http://localhost:3000/dashboard/escalation-policies\n`)
  
  if (YOUR_TEST_PHONES.includes('+1234567890')) {
    console.log(`⚠️  REMINDER: Update YOUR_TEST_PHONES and YOUR_TEST_EMAILS`)
    console.log(`   in scripts/seed-test-data.ts for actual deliverability testing!\n`)
  }
  
  console.log('═'.repeat(60))
}

async function main() {
  const args = process.argv.slice(2)
  const shouldClean = args.includes('--clean')
  
  try {
    if (shouldClean) {
      await cleanTestData()
    }
    
    await seedTestData()
  } catch (error) {
    console.error('❌ Error seeding test data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
