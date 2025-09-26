import { checkDatabaseConnection } from '@/lib/prisma'
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
    if (!forceCheck && process.env.NODE_ENV === 'production') {
      return {
        status: 'healthy',
        message: 'Database checks disabled in production for performance',
        configured: !!process.env.DATABASE_URL
      }
    }

    const connected = await checkDatabaseConnection()
    return {
      status: connected ? 'healthy' : 'unhealthy',
      connected,
      configured: !!process.env.DATABASE_URL,
      message: connected ? 'Database connection successful' : 'Database connection failed'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
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

    const testKey = `health:check:${Date.now()}`
    await (redis as any).set(testKey, 'test', 'EX', 10) // 10s TTL
    const result = await (redis as any).get(testKey)
    await (redis as any).del(testKey)

    return {
      status: result === 'test' ? 'healthy' : 'unhealthy',
      connected: true,
      message: result === 'test' ? 'Redis connection successful' : 'Redis test failed'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error instanceof Error ? error.message : 'Redis check failed',
      message: 'Redis health check failed'
    }
  }
}

async function checkExternalServicesHealth() {
  const services = {
    twilio: {
      status: (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ? 'healthy' : 'warning',
      configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      message: 'SMS, WhatsApp, and Voice services'
    },
    sendgrid: {
      status: process.env.SENDGRID_API_KEY ? 'healthy' : 'warning',
      configured: !!process.env.SENDGRID_API_KEY,
      message: 'Email notification service'
    },
    usgs: {
      status: 'healthy', // USGS is a public API
      configured: true,
      message: 'Earthquake data feed'
    },
    noaa: {
      status: 'healthy', // NOAA is a public API
      configured: true,
      message: 'Tsunami alert feed'
    }
  }

  return services
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

