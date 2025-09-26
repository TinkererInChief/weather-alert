import { checkDatabaseConnection, prisma } from '@/lib/prisma'
import RedisConnection from '@/lib/queue/redis-connection'
import type Redis from 'ioredis'

// Lazy getter for ioredis client (Railway Redis)
function getRedisClient(): Redis {
  return RedisConnection.getInstance()
}

// Ultra-minimal health endpoint - Railway health checks
export async function HEAD() {
  return new Response(null, { status: 200 })
}

export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    const url = new URL(request.url)
    const detailed = url.searchParams.get('detailed') === 'true'
    const checkDb = url.searchParams.get('db') === 'true'
    
    // Basic health information
    const basicHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      service: 'Emergency Alert System',
      version: process.env.npm_package_version || 'unknown',
      responseTime: 0, // Will be calculated at the end
    }
    
    // If not detailed check, return basic health quickly
    if (!detailed) {
      basicHealth.responseTime = Date.now() - startTime
      return Response.json(basicHealth, { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    // Detailed health checks
    const healthChecks = {
      database: await checkDatabaseHealth(checkDb),
      redis: await checkRedisHealth(),
      services: await checkExternalServicesHealth(),
      system: await checkSystemHealth(),
    }

    // Determine overall status
    const allHealthy = 
      (healthChecks.database.status === 'healthy' || healthChecks.database.status === 'warning') &&
      (healthChecks.redis.status === 'healthy' || healthChecks.redis.status === 'warning') &&
      (healthChecks.system.status === 'healthy' || healthChecks.system.status === 'warning') &&
      Object.values(healthChecks.services).every(service => 
        service.status === 'healthy' || service.status === 'warning'
      )

    const response = {
      ...basicHealth,
      status: allHealthy ? 'healthy' : 'degraded',
      checks: healthChecks,
      responseTime: Date.now() - startTime,
    }
    
    return Response.json(response, { 
      status: allHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('Health check error:', error)
    
    return Response.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'Emergency Alert System',
      error: error instanceof Error ? error.message : 'Health check failed',
      responseTime: Date.now() - startTime,
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

async function checkDatabaseHealth(forceCheck: boolean = false) {
  try {
    // Always perform a lightweight ping so we can surface latency
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const ms = Date.now() - start

    return {
      status: 'healthy',
      connected: true,
      configured: !!process.env.DATABASE_URL,
      latencyMs: ms,
      message: 'Database ping successful'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      configured: !!process.env.DATABASE_URL,
      latencyMs: null,
      error: error instanceof Error ? error.message : 'Database check failed',
      message: 'Database health check failed'
    }
  }
}

async function checkRedisHealth() {
  try {
    const redis = getRedisClient()
    // Connect lazily if needed
    try { await (redis as any).connect?.() } catch { /* ignore if already connecting */ }

    // Measure PING latency
    const pingStart = Date.now()
    const pong = await (redis as any).ping?.()
    const pingMs = Date.now() - pingStart

    // Also verify basic read/write
    const testKey = `health:check:${Date.now()}`
    await (redis as any).set(testKey, 'test', 'EX', 10) // 10s TTL
    const result = await (redis as any).get(testKey)
    await (redis as any).del(testKey)

    return {
      status: result === 'test' ? 'healthy' : 'unhealthy',
      connected: true,
      latencyMs: pingMs,
      endpoint: RedisConnection.getCurrentEndpoint(),
      message: result === 'test' ? `Redis PING=${pingMs}ms, ${pong || 'PONG'}` : 'Redis test failed'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      latencyMs: null,
      error: error instanceof Error ? error.message : 'Redis check failed',
      endpoint: RedisConnection.getCurrentEndpoint(),
      message: 'Redis health check failed'
    }
  }
}

async function checkExternalServicesHealth() {
  // Helper: fetch with timeout and measure latency
  const fetchWithTimeout = async (url: string, init: RequestInit = {}, timeoutMs = 5000) => {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' })
      return res
    } finally {
      clearTimeout(id)
    }
  }

  const time = async <T,>(fn: () => Promise<T>) => {
    const start = Date.now()
    try {
      const value = await fn()
      return { ok: true as const, ms: Date.now() - start, value }
    } catch (error) {
      return { ok: false as const, ms: Date.now() - start, error: error as Error }
    }
  }

  const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  const sendgridConfigured = !!process.env.SENDGRID_API_KEY

  const usgsUrl = process.env.USGS_API_URL || 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1'
  const noaaUrl = process.env.NOAA_TSUNAMI_URL || 'https://www.tsunami.gov/events/xml/atom.xml'

  const [twilioRes, sendgridRes, usgsRes, noaaRes] = await Promise.all([
    (async () => {
      if (!twilioConfigured) {
        return { status: 'warning', latencyMs: null, configured: false, message: 'Twilio not configured' }
      }
      const sid = process.env.TWILIO_ACCOUNT_SID as string
      const token = process.env.TWILIO_AUTH_TOKEN as string
      const auth = Buffer.from(`${sid}:${token}`).toString('base64')
      const result = await time(async () =>
        fetchWithTimeout(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}.json`, {
          headers: {
            Authorization: `Basic ${auth}`,
          }
        }, 5000)
      )
      if (!result.ok) {
        return { status: 'critical', latencyMs: result.ms, configured: true, statusCode: undefined, error: (result.error as Error).message, message: 'Twilio request failed' }
      }
      const resp = result.value as Response
      const healthy = resp.ok
      return { status: healthy ? 'healthy' : 'critical', latencyMs: result.ms, configured: true, statusCode: resp.status, message: healthy ? 'Twilio reachable' : `Twilio status ${ resp.status }` }
    })(),

    (async () => {
      if (!sendgridConfigured) {
        return { status: 'warning', latencyMs: null, configured: false, message: 'SendGrid not configured' }
      }
      const key = process.env.SENDGRID_API_KEY as string
      const result = await time(async () =>
        fetchWithTimeout('https://api.sendgrid.com/v3/user/profile', {
          headers: { Authorization: `Bearer ${key}` }
        }, 5000)
      )
      if (!result.ok) {
        return { status: 'critical', latencyMs: result.ms, configured: true, statusCode: undefined, error: (result.error as Error).message, message: 'SendGrid request failed' }
      }
      const resp = result.value as Response
      const healthy = resp.ok
      return { status: healthy ? 'healthy' : 'critical', latencyMs: result.ms, configured: true, statusCode: resp.status, message: healthy ? 'SendGrid reachable' : `SendGrid status ${ resp.status }` }
    })(),

    (async () => {
      const result = await time(async () => fetchWithTimeout(usgsUrl, {}, 5000))
      if (!result.ok) {
        return { status: 'critical', latencyMs: result.ms, configured: true, statusCode: undefined, error: (result.error as Error).message, message: 'USGS request failed' }
      }
      const resp = result.value as Response
      const healthy = resp.ok
      return { status: healthy ? 'healthy' : 'critical', latencyMs: result.ms, configured: true, statusCode: resp.status, message: healthy ? 'USGS reachable' : `USGS status ${ resp.status }` }
    })(),

    (async () => {
      const result = await time(async () => fetchWithTimeout(noaaUrl, {}, 5000))
      if (!result.ok) {
        return { status: 'critical', latencyMs: result.ms, configured: true, statusCode: undefined, error: (result.error as Error).message, message: 'NOAA request failed' }
      }
      const resp = result.value as Response
      const healthy = resp.ok
      return { status: healthy ? 'healthy' : 'critical', latencyMs: result.ms, configured: true, statusCode: resp.status, message: healthy ? 'NOAA reachable' : `NOAA status ${ resp.status }` }
    })(),
  ])

  return {
    twilio: twilioRes,
    sendgrid: sendgridRes,
    usgs: usgsRes,
    noaa: noaaRes,
  }
}

async function checkSystemHealth() {
  const memUsage = process.memoryUsage()
  const cpuUsage = process.cpuUsage()
  
  // Convert bytes to megabytes
  const memoryMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  }

  // Memory health assessment
  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
  const memoryStatus = heapUsagePercent > 90 ? 'unhealthy' : heapUsagePercent > 70 ? 'warning' : 'healthy'

  return {
    status: memoryStatus,
    memory: {
      ...memoryMB,
      heapUsagePercent: Math.round(heapUsagePercent)
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000), // Convert to milliseconds
      system: Math.round(cpuUsage.system / 1000)
    },
    uptime: Math.floor(process.uptime()),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version
  }
}

// Ensure this route is always handled at runtime (no static optimization)
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

