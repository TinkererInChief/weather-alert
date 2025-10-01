/**
 * Seed Test Users with Different Roles
 * 
 * This script creates test users for RBAC testing:
 * - Super Admin
 * - Org Admin
 * - Operator
 * - Viewer
 * 
 * Usage: npx tsx scripts/seed-test-users.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TEST_USERS = [
  {
    name: 'Super Admin User',
    email: 'superadmin@test.com',
    phone: '+1234567890',
    role: 'SUPER_ADMIN',
    description: 'Full system access - can manage everything'
  },
  {
    name: 'Organization Admin',
    email: 'orgadmin@test.com',
    phone: '+1234567891',
    role: 'ORG_ADMIN',
    description: 'Organization-level admin - can manage users, contacts, groups, alerts'
  },
  {
    name: 'Operator User',
    email: 'operator@test.com',
    phone: '+1234567892',
    role: 'OPERATOR',
    description: 'Operational access - can manage contacts, groups, and create alerts'
  },
  {
    name: 'Viewer User',
    email: 'viewer@test.com',
    phone: '+1234567893',
    role: 'VIEWER',
    description: 'Read-only access - can only view data'
  },
]

async function main() {
  console.log('🌱 Seeding test users...\n')
  
  for (const userData of TEST_USERS) {
    try {
      // Check if user already exists
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { phone: userData.phone }
          ]
        }
      })
      
      if (existing) {
        console.log(`⏭️  Skipping ${userData.role}: User already exists (${userData.email})`)
        continue
      }
      
      // Create user
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          role: userData.role,
          isActive: true,
        }
      })
      
      console.log(`✅ Created ${userData.role}: ${userData.name}`)
      console.log(`   Email: ${userData.email}`)
      console.log(`   Phone: ${userData.phone}`)
      console.log(`   Description: ${userData.description}`)
      console.log(`   User ID: ${user.id}\n`)
      
    } catch (error) {
      console.error(`❌ Error creating ${userData.role}:`, error)
    }
  }
  
  console.log('\n📊 Summary of Test Users:\n')
  console.log('┌─────────────────┬──────────────────────┬──────────────────────┐')
  console.log('│ Role            │ Email                │ Phone                │')
  console.log('├─────────────────┼──────────────────────┼──────────────────────┤')
  
  for (const user of TEST_USERS) {
    const role = user.role.padEnd(15)
    const email = user.email.padEnd(20)
    const phone = user.phone.padEnd(20)
    console.log(`│ ${role} │ ${email} │ ${phone} │`)
  }
  
  console.log('└─────────────────┴──────────────────────┴──────────────────────┘\n')
  
  console.log('🔐 RBAC Permissions by Role:\n')
  console.log('SUPER_ADMIN:')
  console.log('  ✅ All permissions (full system access)')
  console.log('\nORG_ADMIN:')
  console.log('  ✅ Manage contacts, groups, alerts')
  console.log('  ✅ View audit logs')
  console.log('  ✅ Manage settings')
  console.log('  ❌ Cannot manage users or data sources')
  console.log('\nOPERATOR:')
  console.log('  ✅ Manage contacts and groups')
  console.log('  ✅ Create and view alerts')
  console.log('  ✅ Manage monitoring')
  console.log('  ❌ Cannot delete contacts or view audit logs')
  console.log('\nVIEWER:')
  console.log('  ✅ View contacts, groups, and alerts')
  console.log('  ❌ Cannot create, update, or delete anything\n')
  
  console.log('🧪 To test RBAC:')
  console.log('1. Login with one of the test users')
  console.log('2. Try accessing different features')
  console.log('3. Observe permission restrictions\n')
  
  console.log('📝 Login Instructions:')
  console.log('- Go to /login')
  console.log('- Enter the phone number of the test user')
  console.log('- Use OTP verification to login')
  console.log('- Test different features based on role\n')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
