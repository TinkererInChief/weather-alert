#!/usr/bin/env tsx
/**
 * Promote User Script
 * 
 * Directly updates a user's role in the database using Prisma.
 * Bypasses API authentication/authorization for administrative tasks.
 * 
 * Usage:
 *   pnpm tsx scripts/promote-user.ts <email> <role>
 *   pnpm tsx scripts/promote-user.ts dyashovardhan@gmail.com SUPER_ADMIN
 * 
 * Valid roles: SUPER_ADMIN, ORG_ADMIN, OPERATOR, VIEWER
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'
import { Role } from '@/lib/rbac/roles'

// Load environment variables from .env.local
try {
  const envPath = resolve(process.cwd(), '.env.local')
  const envFile = readFileSync(envPath, 'utf-8')
  
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=').replace(/^["']|["']$/g, '')
      if (key && value) {
        process.env[key.trim()] = value.trim()
      }
    }
  })
} catch (error) {
  console.warn('⚠️  Could not load .env.local, using existing environment variables')
}

const prisma = new PrismaClient()

async function promoteUser(email: string, role: string) {
  try {
    // Validate role
    if (!Object.values(Role).includes(role as Role)) {
      console.error(`❌ Invalid role: ${role}`)
      console.log(`Valid roles: ${Object.values(Role).join(', ')}`)
      process.exit(1)
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.error(`❌ User not found: ${email}`)
      process.exit(1)
    }

    console.log(`\n📋 Current user details:`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name}`)
    console.log(`   Current Role: ${user.role}`)
    console.log(`   Active: ${user.isActive}`)

    // Update role
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { 
        role: role as Role,
        isActive: true, // Ensure user is active
        approvalStatus: 'approved' // Ensure user is approved
      }
    })

    console.log(`\n✅ User promoted successfully!`)
    console.log(`   New Role: ${updatedUser.role}`)
    console.log(`   Active: ${updatedUser.isActive}`)
    console.log(`   Approval Status: ${updatedUser.approvalStatus}`)

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_USER_ROLE',
        resource: 'User',
        resourceId: user.id,
        metadata: {
          oldRole: user.role,
          newRole: role,
          promotedViaScript: true,
          timestamp: new Date().toISOString()
        }
      }
    })

    console.log(`\n📝 Audit log created`)

  } catch (error) {
    console.error('❌ Error promoting user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)

if (args.length !== 2) {
  console.log(`
Usage: pnpm tsx scripts/promote-user.ts <email> <role>

Example:
  pnpm tsx scripts/promote-user.ts dyashovardhan@gmail.com SUPER_ADMIN

Valid roles:
  - SUPER_ADMIN: Full system access with ability to manage organizations
  - ORG_ADMIN: Organization administrator with user management capabilities
  - OPERATOR: Day-to-day operations including alert management
  - VIEWER: Read-only access
  `)
  process.exit(1)
}

const [email, role] = args

promoteUser(email, role)
