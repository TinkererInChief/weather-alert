/**
 * Security Metrics API Endpoint
 * Provides real-time security statistics and monitoring data
 */

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logger'
import { getAllCircuitBreakerStats } from '@/lib/circuit-breaker'
import { memoryCache, sessionCache, geoCache, PerformanceMonitor } from '@/lib/performance-cache'
import { withErrorHandler } from '@/lib/error-handler'
import { apiMiddleware } from '@/lib/middleware'

interface SecurityMetricsResponse {
  overallStatus: 'secure' | 'warning' | 'critical'
  threatLevel: 'minimal' | 'low' | 'medium' | 'high' | 'critical'
  activeThreats: number
  blockedRequests: number
  captchaChallenges: number
  sessionSecurity: 'normal' | 'enhanced' | 'maximum'
  geolocationBlocks: number
  deviceFingerprints: number
  riskScore: number
  uptime: string
  lastUpdate: string
  performance: {
    averageResponseTime: number
    cacheHitRate: number
    circuitBreakerStatus: Record<string, any>
    memoryUsage: {
      total: number
      cache: number
      sessions: number
    }
  }
  trends: {
    hourly: Array<{
      hour: string
      threats: number
      requests: number
      blocks: number
    }>
    daily: Array<{
      date: string
      threats: number
      requests: number
      blocks: number
    }>
  }
}

// In-memory storage for metrics (in production, use Redis or database)
class SecurityMetricsStore {
  private static instance: SecurityMetricsStore
  private metrics = {
    totalRequests: 0,
    blockedRequests: 0,
    captchaChallenges: 0,
    geolocationBlocks: 0,
    deviceFingerprints: 0,
    activeThreats: 0,
    hourlyData: new Map<string, any>(),
    dailyData: new Map<string, any>(),
    startTime: Date.now()
  }

  static getInstance(): SecurityMetricsStore {
    if (!SecurityMetricsStore.instance) {
      SecurityMetricsStore.instance = new SecurityMetricsStore()
    }
    return SecurityMetricsStore.instance
  }

  recordRequest(blocked = false): void {
    this.metrics.totalRequests++
    if (blocked) {
      this.metrics.blockedRequests++
    }
    this.updateHourlyData('requests', 1)
  }

  recordThreat(severity: 'low' | 'medium' | 'high' | 'critical'): void {
    this.metrics.activeThreats++
    this.updateHourlyData('threats', 1)
    
    // Auto-reduce threat count after time (simulated)
    setTimeout(() => {
      if (this.metrics.activeThreats > 0) {
        this.metrics.activeThreats--
      }
    }, 300000) // 5 minutes
  }

  recordCaptchaChallenge(): void {
    this.metrics.captchaChallenges++
    this.updateHourlyData('captcha', 1)
  }

  recordGeolocationBlock(): void {
    this.metrics.geolocationBlocks++
    this.updateHourlyData('geoBlocks', 1)
  }

  recordDeviceFingerprint(): void {
    this.metrics.deviceFingerprints++
  }

  private updateHourlyData(metric: string, value: number): void {
    const hour = new Date().toISOString().slice(0, 13) // YYYY-MM-DDTHH
    
    if (!this.metrics.hourlyData.has(hour)) {
      this.metrics.hourlyData.set(hour, {
        hour,
        requests: 0,
        threats: 0,
        blocks: 0,
        captcha: 0,
        geoBlocks: 0
      })
    }

    const data = this.metrics.hourlyData.get(hour)
    data[metric] = (data[metric] || 0) + value
    
    // Keep only last 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 13)
    for (const [key] of this.metrics.hourlyData.entries()) {
      if (key < cutoff) {
        this.metrics.hourlyData.delete(key)
      }
    }
  }

  getMetrics(): SecurityMetricsResponse {
    const uptime = this.calculateUptime()
    const riskScore = this.calculateRiskScore()
    const threatLevel = this.calculateThreatLevel(riskScore)
    const overallStatus = this.calculateOverallStatus(threatLevel, riskScore)

    // Get performance metrics
    const memoryStats = memoryCache.getStats()
    const sessionStats = sessionCache.getStats()
    const geoStats = geoCache.getStats()
    const circuitStats = getAllCircuitBreakerStats()
    const performanceMetrics = PerformanceMonitor.getAllMetrics()

    // Calculate average response time
    const avgResponseTime = performanceMetrics?.['security_assessment']?.average || 0

    // Calculate cache hit rate
    const totalCacheRequests = memoryStats.hitRate + memoryStats.missRate
    const cacheHitRate = totalCacheRequests > 0 ? (memoryStats.hitRate / totalCacheRequests) * 100 : 0

    return {
      overallStatus,
      threatLevel,
      activeThreats: this.metrics.activeThreats,
      blockedRequests: this.metrics.blockedRequests,
      captchaChallenges: this.metrics.captchaChallenges,
      sessionSecurity: this.determineSessionSecurity(),
      geolocationBlocks: this.metrics.geolocationBlocks,
      deviceFingerprints: this.metrics.deviceFingerprints,
      riskScore,
      uptime,
      lastUpdate: new Date().toISOString(),
      performance: {
        averageResponseTime: Math.round(avgResponseTime * 100) / 100,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        circuitBreakerStatus: circuitStats,
        memoryUsage: {
          total: memoryStats.totalSize + sessionStats.totalSize + geoStats.totalSize,
          cache: memoryStats.totalSize,
          sessions: sessionStats.totalSize
        }
      },
      trends: {
        hourly: Array.from(this.metrics.hourlyData.values())
          .sort((a, b) => a.hour.localeCompare(b.hour))
          .slice(-24),
        daily: this.getDailyTrends()
      }
    }
  }

  private calculateUptime(): string {
    const uptimeMs = Date.now() - this.metrics.startTime
    const uptimeHours = uptimeMs / (1000 * 60 * 60)
    const uptimePercent = Math.min(99.99, (uptimeHours / (24 * 7)) * 100) // Weekly uptime
    return `${uptimePercent.toFixed(2)}%`
  }

  private calculateRiskScore(): number {
    const totalRequests = Math.max(1, this.metrics.totalRequests)
    const blockRate = (this.metrics.blockedRequests / totalRequests) * 100
    const threatDensity = this.metrics.activeThreats * 10
    const captchaRate = (this.metrics.captchaChallenges / totalRequests) * 100

    let riskScore = Math.min(100, blockRate + threatDensity + captchaRate)
    
    // Bonus points for security measures
    if (this.metrics.captchaChallenges > 0) riskScore -= 5
    if (this.metrics.geolocationBlocks > 0) riskScore -= 5
    
    return Math.max(0, Math.min(100, riskScore))
  }

  private calculateThreatLevel(riskScore: number): SecurityMetricsResponse['threatLevel'] {
    if (riskScore >= 80) return 'critical'
    if (riskScore >= 60) return 'high'
    if (riskScore >= 40) return 'medium'
    if (riskScore >= 20) return 'low'
    return 'minimal'
  }

  private calculateOverallStatus(
    threatLevel: SecurityMetricsResponse['threatLevel'],
    riskScore: number
  ): SecurityMetricsResponse['overallStatus'] {
    if (threatLevel === 'critical' || riskScore >= 85) return 'critical'
    if (threatLevel === 'high' || riskScore >= 60) return 'warning'
    return 'secure'
  }

  private determineSessionSecurity(): SecurityMetricsResponse['sessionSecurity'] {
    if (this.metrics.activeThreats > 10) return 'maximum'
    if (this.metrics.activeThreats > 5) return 'enhanced'
    return 'normal'
  }

  private getDailyTrends(): SecurityMetricsResponse['trends']['daily'] {
    // Generate last 7 days of data (simplified for demo)
    const trends = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      trends.push({
        date: date.toISOString().split('T')[0],
        threats: Math.floor(Math.random() * 20) + i,
        requests: Math.floor(Math.random() * 1000) + 500,
        blocks: Math.floor(Math.random() * 50) + 10
      })
    }
    return trends
  }
}

const metricsStore = SecurityMetricsStore.getInstance()

// Simulate some activity for demo purposes
setInterval(() => {
  metricsStore.recordRequest(Math.random() < 0.05) // 5% blocked
  if (Math.random() < 0.02) { // 2% chance of threat
    metricsStore.recordThreat(Math.random() < 0.1 ? 'high' : 'low')
  }
  if (Math.random() < 0.03) { // 3% chance of CAPTCHA
    metricsStore.recordCaptchaChallenge()
  }
}, 5000) // Every 5 seconds

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    // Apply security middleware
    const middlewareResponse = await apiMiddleware(request, {
      rateLimit: { enabled: true, requests: 100, window: 60 },
      validation: { maxBodySize: 0, requireJson: false }
    })

    if (middlewareResponse.status !== 200 || middlewareResponse.headers.get('location')) {
      return middlewareResponse
    }

    // Get comprehensive security metrics
    const metrics = metricsStore.getMetrics()

    // Add additional system health data
    const healthData = {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      systemHealth: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        loadAverage: process.platform === 'linux' ? require('os').loadavg() : [0, 0, 0]
      }
    }

    log.info('Security metrics requested', {
      overallStatus: metrics.overallStatus,
      threatLevel: metrics.threatLevel,
      riskScore: metrics.riskScore,
      requestedBy: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json({
      ...metrics,
      system: healthData
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  })()
}

// Admin endpoint for updating metrics (for testing/admin use)
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const middlewareResponse = await apiMiddleware(request, {
      rateLimit: { enabled: true, requests: 10, window: 60 },
      validation: { maxBodySize: 10, requireJson: true }
    })

    if (middlewareResponse.status !== 200 || middlewareResponse.headers.get('location')) {
      return middlewareResponse
    }

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'record_threat':
        metricsStore.recordThreat(data.severity || 'low')
        break
      case 'record_block':
        metricsStore.recordRequest(true)
        break
      case 'record_captcha':
        metricsStore.recordCaptchaChallenge()
        break
      case 'record_geo_block':
        metricsStore.recordGeolocationBlock()
        break
      case 'record_device':
        metricsStore.recordDeviceFingerprint()
        break
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }

    log.info('Security metric updated', {
      action,
      data,
      updatedBy: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json({
      success: true,
      message: 'Metric updated successfully'
    })
  })()
}
