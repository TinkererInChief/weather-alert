/**
 * Mark a deployment in the system
 * 
 * Usage:
 *   pnpm tsx scripts/mark-deploy.ts "Deploy: Fix health monitoring"
 * 
 * Or in package.json:
 *   "predeploy": "tsx scripts/mark-deploy.ts",
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function markDeploy() {
  const message = process.argv[2] || 'Deployment'
  const commitHash = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7)
  
  await prisma.healthEvent.create({
    data: {
      eventType: 'deploy',
      severity: 'healthy',
      message: commitHash ? `${message} (${commitHash})` : message,
      metadata: {
        commitHash,
        timestamp: new Date().toISOString(),
      },
    },
  })
  
  console.log('✅ Deploy event created:', message)
  await prisma.$disconnect()
}

markDeploy().catch(console.error)
