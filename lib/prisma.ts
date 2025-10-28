import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const baseUrl = process.env.DATABASE_URL || ''
const poolLimit = String(process.env.DATABASE_POOL_LIMIT || '15')
const poolTimeout = String(process.env.DATABASE_POOL_TIMEOUT || '10')
let augmentedUrl = baseUrl
try {
  const u = new URL(baseUrl)
  u.searchParams.set('connection_limit', poolLimit)
  u.searchParams.set('pool_max', poolLimit)
  u.searchParams.set('max', poolLimit)
  u.searchParams.set('pool_timeout', poolTimeout)
  augmentedUrl = u.toString()
} catch {
  augmentedUrl = baseUrl
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    datasourceUrl: augmentedUrl,
  })

globalForPrisma.prisma = prisma

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection check failed:', error)
    return false
  }
}
