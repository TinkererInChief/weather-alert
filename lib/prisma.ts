import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Netlify-specific build detection
 * ONLY true during Netlify's static build phase (when DB is unavailable)
 * 
 * Railway, Vercel, and other platforms:
 * - Will have DATABASE_URL during build
 * - Won't have NETLIFY env var
 * - This will be FALSE, so Prisma client creates normally ✅
 */
const isBuildTime = process.env.NETLIFY === 'true' && process.env.CONTEXT === 'production' && !process.env.DEPLOY_PRIME_URL

// Only create Prisma client if DATABASE_URL is available and valid
function createPrismaClient(): PrismaClient | null {
  const baseUrl = process.env.DATABASE_URL || ''
  
  // Skip creation ONLY if:
  // 1. We're on Netlify during static build (isBuildTime=true), OR
  // 2. DATABASE_URL is missing/empty (would fail anyway)
  if (isBuildTime || !baseUrl || baseUrl === '') {
    console.log('⚠️ Skipping Prisma client creation (build time or no DATABASE_URL)')
    return null as any // Return null but typed as PrismaClient for compatibility
  }

  // Validate URL format
  if (!baseUrl.startsWith('postgresql://') && !baseUrl.startsWith('postgres://')) {
    console.warn('⚠️ DATABASE_URL does not start with postgresql:// or postgres://')
    return null as any
  }

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
  } catch (error) {
    console.error('⚠️ Failed to parse DATABASE_URL:', error)
    augmentedUrl = baseUrl
  }

  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
      datasourceUrl: augmentedUrl,
    })
  } catch (error) {
    console.error('⚠️ Failed to create Prisma client:', error)
    return null as any
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (prisma) {
  globalForPrisma.prisma = prisma
}

/**
 * Get Prisma client with runtime safety check
 * Throws error if prisma is not available (should never happen at runtime)
 * Use this in API routes and server components
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error('Prisma client not initialized. DATABASE_URL may be missing or invalid.')
  }
  return prisma
}

/**
 * Check if Prisma client is available
 * Useful for conditional logic
 */
export function hasPrisma(): boolean {
  return prisma !== null
}

export async function checkDatabaseConnection(): Promise<boolean> {
  if (!prisma) {
    console.warn('⚠️ Prisma client not available (build time or no DATABASE_URL)')
    return false
  }
  
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection check failed:', error)
    return false
  }
}
