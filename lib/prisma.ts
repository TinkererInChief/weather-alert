import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const baseUrl = process.env.DATABASE_URL || ''
let augmentedUrl = baseUrl
try {
  const u = new URL(baseUrl)
  if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', '5')
  if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '5')
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
