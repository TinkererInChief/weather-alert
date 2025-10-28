#!/usr/bin/env tsx
/**
 * Service Health Monitor
 * Continuously monitors service health and alerts on issues
 * Run with: pnpm tsx scripts/monitor-services.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type ServiceStatus = 'healthy' | 'warning' | 'critical' | 'error'

interface HealthCheck {
  service: string
  status: ServiceStatus
  message: string
  lastCheck: Date
  consecutiveFailures: number
}

// Track service states
const serviceStates = new Map<string, HealthCheck>()

// Configuration
const CONFIG = {
  checkInterval: 60000, // Check every 60 seconds
  alertThreshold: 3, // Alert after 3 consecutive failures
  services: {
    api: {
      url: 'http://localhost:3000/api/health',
      timeout: 5000,
      critical: true
    },
    statsUpdater: {
      url: 'http://localhost:3000/api/health/stats',
      timeout: 5000,
      critical: true
    },
    database: {
      url: 'http://localhost:3000/api/health?detailed=true',
      timeout: 10000,
      critical: true
    }
  }
}

/**
 * Fetch health status with timeout
 */
async function fetchHealth(url: string, timeout: number): Promise<any> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' }
    })
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Check a single service
 */
async function checkService(name: string, config: any): Promise<HealthCheck> {
  const now = new Date()
  
  try {
    const data = await fetchHealth(config.url, config.timeout)
    
    const status: ServiceStatus = 
      data.status === 'healthy' ? 'healthy' :
      data.status === 'warning' ? 'warning' :
      data.status === 'critical' ? 'critical' : 'error'
    
    return {
      service: name,
      status,
      message: data.message || `Service is ${status}`,
      lastCheck: now,
      consecutiveFailures: status === 'healthy' ? 0 : (serviceStates.get(name)?.consecutiveFailures || 0) + 1
    }
  } catch (error) {
    return {
      service: name,
      status: 'error',
      message: error instanceof Error ? error.message : 'Health check failed',
      lastCheck: now,
      consecutiveFailures: (serviceStates.get(name)?.consecutiveFailures || 0) + 1
    }
  }
}

/**
 * Send alert (can be extended to send emails, SMS, etc.)
 */
async function sendAlert(check: HealthCheck) {
  const alertMessage = `
🚨 SERVICE ALERT 🚨
Service: ${check.service}
Status: ${check.status}
Message: ${check.message}
Consecutive Failures: ${check.consecutiveFailures}
Time: ${check.lastCheck.toISOString()}
`

  console.error(alertMessage)
  
  // Log to database
  try {
    await prisma.$executeRaw`
      INSERT INTO "health_events" ("service", "event_type", "severity", "message", "metadata", "created_at")
      VALUES (
        ${check.service},
        'service_alert',
        ${check.status},
        ${check.message},
        ${JSON.stringify({ consecutiveFailures: check.consecutiveFailures })},
        ${check.lastCheck}
      )
    `
  } catch (error) {
    console.error('Failed to log alert to database:', error)
  }
  
  // TODO: Add email/SMS/Slack notifications here
  // await sendEmail({ to: 'admin@example.com', subject: 'Service Alert', body: alertMessage })
  // await sendSlackMessage({ channel: '#alerts', text: alertMessage })
}

/**
 * Monitor all services
 */
async function monitorServices() {
  console.log(`[${new Date().toISOString()}] Checking services...`)
  
  const checks = await Promise.all(
    Object.entries(CONFIG.services).map(([name, config]) =>
      checkService(name, config)
    )
  )
  
  // Update states and check for alerts
  for (const check of checks) {
    const previousState = serviceStates.get(check.service)
    serviceStates.set(check.service, check)
    
    // Log status
    const statusIcon = 
      check.status === 'healthy' ? '✅' :
      check.status === 'warning' ? '⚠️' :
      check.status === 'critical' ? '🔴' : '❌'
    
    console.log(`${statusIcon} ${check.service}: ${check.status} - ${check.message}`)
    
    // Send alert if threshold exceeded
    if (
      check.consecutiveFailures >= CONFIG.alertThreshold &&
      check.status !== 'healthy'
    ) {
      await sendAlert(check)
    }
    
    // Send recovery notification if service recovered
    if (
      previousState &&
      previousState.status !== 'healthy' &&
      check.status === 'healthy'
    ) {
      console.log(`✅ RECOVERY: ${check.service} is now healthy`)
      
      try {
        await prisma.$executeRaw`
          INSERT INTO "health_events" ("service", "event_type", "severity", "message", "created_at")
          VALUES (
            ${check.service},
            'recovery',
            'healthy',
            ${`Service recovered after ${previousState.consecutiveFailures} failures`},
            ${check.lastCheck}
          )
        `
      } catch (error) {
        console.error('Failed to log recovery to database:', error)
      }
    }
  }
  
  console.log()
}

/**
 * Main monitoring loop
 */
async function run() {
  console.log('🔍 Service Health Monitor Started')
  console.log(`Check interval: ${CONFIG.checkInterval / 1000}s`)
  console.log(`Alert threshold: ${CONFIG.alertThreshold} consecutive failures\n`)
  
  // Initial check
  await monitorServices()
  
  // Periodic checks
  setInterval(async () => {
    try {
      await monitorServices()
    } catch (error) {
      console.error('Monitor cycle error:', error)
    }
  }, CONFIG.checkInterval)
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down monitor...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down monitor...')
  await prisma.$disconnect()
  process.exit(0)
})

run().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
