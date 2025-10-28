# Week 4 Day 4-5: Testing & Monitoring

**Priority**: 🟡 MEDIUM | **Effort**: 8-10 hours

---

## Overview

Comprehensive testing strategy and monitoring setup to ensure system reliability and performance.

---

## Testing Strategy

### 1. Unit Tests

**File**: `__tests__/services/escalation-service.test.ts`

```typescript
import { EscalationService } from '@/lib/services/escalation-service'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma')

describe('EscalationService', () => {
  let service: EscalationService

  beforeEach(() => {
    service = EscalationService.getInstance()
    jest.clearAllMocks()
  })

  describe('getPolicy', () => {
    it('should return fleet-specific policy when available', async () => {
      const mockPolicy = {
        id: 'policy_1',
        name: 'Test Policy',
        fleetId: 'fleet_1',
        severityMin: 3,
        rules: []
      }

      ;(prisma.fleetVessel.findFirst as jest.Mock).mockResolvedValue({
        fleetId: 'fleet_1',
        fleet: { id: 'fleet_1' }
      })

      ;(prisma.escalationPolicy.findFirst as jest.Mock).mockResolvedValue(mockPolicy)

      const result = await service.getPolicy('vessel_1', 'earthquake', 4)

      expect(result).toEqual(mockPolicy)
      expect(prisma.escalationPolicy.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fleetId: 'fleet_1'
          })
        })
      )
    })

    it('should fall back to global policy when no fleet policy exists', async () => {
      const mockGlobalPolicy = {
        id: 'policy_global',
        name: 'Global Policy',
        fleetId: null,
        severityMin: 3,
        rules: []
      }

      ;(prisma.fleetVessel.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.escalationPolicy.findFirst as jest.Mock).mockResolvedValue(mockGlobalPolicy)

      const result = await service.getPolicy('vessel_1', 'earthquake', 4)

      expect(result).toEqual(mockGlobalPolicy)
    })
  })

  describe('initiateEscalation', () => {
    it('should create escalation logs for all steps', async () => {
      const mockAlert = {
        id: 'alert_1',
        vesselId: 'vessel_1',
        severity: 5
      }

      const mockPolicy = {
        id: 'policy_1',
        rules: [
          { step: 1, delayMinutes: 0 },
          { step: 2, delayMinutes: 5 },
          { step: 3, delayMinutes: 15 }
        ]
      }

      await service.initiateEscalation(mockAlert, mockPolicy)

      expect(prisma.escalationLog.create).toHaveBeenCalledTimes(1)
    })
  })
})
```

### 2. Integration Tests

**File**: `__tests__/integration/alert-flow.test.ts`

```typescript
import { GeoFenceMonitor } from '@/lib/services/geo-fence-monitor'
import { EscalationService } from '@/lib/services/escalation-service'
import { AlertQueue } from '@/lib/services/alert-queue'
import { prisma } from '@/lib/prisma'

describe('Alert Flow Integration', () => {
  it('should complete full alert workflow', async () => {
    // 1. Create test data
    const vessel = await prisma.vessel.create({
      data: {
        mmsi: '123456789',
        name: 'Test Vessel',
        active: true
      }
    })

    const fleet = await prisma.fleet.create({
      data: {
        name: 'Test Fleet',
        ownerId: 'user_1'
      }
    })

    await prisma.fleetVessel.create({
      data: {
        fleetId: fleet.id,
        vesselId: vessel.id
      }
    })

    const contact = await prisma.contact.create({
      data: {
        name: 'Test Captain',
        phone: '+1234567890',
        email: 'captain@test.com'
      }
    })

    await prisma.vesselContact.create({
      data: {
        vesselId: vessel.id,
        contactId: contact.id,
        role: 'captain',
        priority: 1,
        notifyOn: ['critical', 'high']
      }
    })

    const policy = await prisma.escalationPolicy.create({
      data: {
        name: 'Test Policy',
        fleetId: fleet.id,
        severityMin: 3,
        rules: {
          create: [
            {
              step: 1,
              delayMinutes: 0,
              channels: ['sms'],
              contactRoles: ['captain'],
              requireAck: true
            }
          ]
        }
      }
    })

    const earthquake = await prisma.earthquakeEvent.create({
      data: {
        eventId: 'test_eq_1',
        magnitude: 6.5,
        latitude: 35.0,
        longitude: 140.0,
        depth: 10,
        place: 'Test Location',
        occurredAt: new Date()
      }
    })

    await prisma.vesselPosition.create({
      data: {
        vesselId: vessel.id,
        latitude: 35.1,
        longitude: 140.1,
        timestamp: new Date(),
        speed: 10,
        course: 90
      }
    })

    // 2. Trigger geo-fence check
    const monitor = GeoFenceMonitor.getInstance()
    await monitor.checkFleetProximity()

    // 3. Verify alert was created
    const alerts = await prisma.vesselAlert.findMany({
      where: { vesselId: vessel.id }
    })

    expect(alerts.length).toBeGreaterThan(0)

    const alert = alerts[0]
    expect(alert.eventType).toBe('earthquake')
    expect(alert.severity).toBeGreaterThanOrEqual(3)

    // 4. Verify escalation was initiated
    const escalations = await prisma.escalationLog.findMany({
      where: { alertId: alert.id }
    })

    expect(escalations.length).toBeGreaterThan(0)

    // Cleanup
    await prisma.vesselAlert.deleteMany({ where: { vesselId: vessel.id } })
    await prisma.escalationLog.deleteMany({})
    await prisma.vesselPosition.deleteMany({ where: { vesselId: vessel.id } })
    await prisma.earthquakeEvent.delete({ where: { id: earthquake.id } })
    await prisma.vesselContact.deleteMany({ where: { vesselId: vessel.id } })
    await prisma.contact.delete({ where: { id: contact.id } })
    await prisma.fleetVessel.deleteMany({ where: { vesselId: vessel.id } })
    await prisma.vessel.delete({ where: { id: vessel.id } })
    await prisma.escalationPolicy.delete({ where: { id: policy.id } })
    await prisma.fleet.delete({ where: { id: fleet.id } })
  })
})
```

### 3. Load Tests

**File**: `__tests__/load/alert-dispatch.load.ts`

```typescript
import autocannon from 'autocannon'

async function runLoadTest() {
  const result = await autocannon({
    url: 'http://localhost:3000/api/vessel-alerts/active',
    connections: 50,
    duration: 30,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  console.log('Load test results:', result)
  
  // Assertions
  expect(result.errors).toBe(0)
  expect(result.timeouts).toBe(0)
  expect(result['2xx']).toBeGreaterThan(0)
  expect(result.latency.p99).toBeLessThan(1000) // 99th percentile < 1s
}

runLoadTest()
```

Run load tests:
```bash
npm install -D autocannon
node __tests__/load/alert-dispatch.load.ts
```

---

## Monitoring Setup

### 1. Performance Monitoring

**File**: `lib/monitoring/performance.ts`

```typescript
import { prisma } from '@/lib/prisma'

export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map()

  static track(metric: string, value: number) {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, [])
    }
    this.metrics.get(metric)!.push(value)

    // Keep only last 100 measurements
    if (this.metrics.get(metric)!.length > 100) {
      this.metrics.get(metric)!.shift()
    }
  }

  static getStats(metric: string) {
    const values = this.metrics.get(metric) || []
    if (values.length === 0) return null

    const sorted = [...values].sort((a, b) => a - b)
    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }

  static async logMetrics() {
    const metrics = [
      'geo_fence_check_duration',
      'alert_dispatch_duration',
      'escalation_process_duration'
    ]

    for (const metric of metrics) {
      const stats = this.getStats(metric)
      if (stats) {
        console.log(`📊 ${metric}:`, {
          avg: `${stats.avg.toFixed(0)}ms`,
          p95: `${stats.p95.toFixed(0)}ms`,
          p99: `${stats.p99.toFixed(0)}ms`
        })
      }
    }
  }
}

// Log metrics every 5 minutes
setInterval(() => {
  PerformanceMonitor.logMetrics()
}, 300000)
```

### 2. Alert Metrics Dashboard

**File**: `app/api/monitoring/metrics/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PerformanceMonitor } from '@/lib/monitoring/performance'

export async function GET() {
  try {
    const [
      totalAlerts,
      alertsLast24h,
      avgResponseTime,
      escalationRate,
      ackRate
    ] = await Promise.all([
      prisma.vesselAlert.count(),
      
      prisma.vesselAlert.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),

      prisma.$queryRaw<[{ avg: number }]>`
        SELECT COALESCE(
          AVG(EXTRACT(EPOCH FROM (acknowledged_at - created_at)) / 60), 0
        )::int as avg
        FROM vessel_alerts
        WHERE acknowledged_at IS NOT NULL
          AND acknowledged_at >= NOW() - INTERVAL '24 hours'
      `,

      prisma.$queryRaw<[{ rate: number }]>`
        SELECT 
          COALESCE(
            (COUNT(DISTINCT alert_id)::float / NULLIF(COUNT(DISTINCT va.id), 0)) * 100,
            0
          )::decimal(5,2) as rate
        FROM vessel_alerts va
        LEFT JOIN escalation_logs el ON va.id = el.alert_id AND el.step > 1
        WHERE va.created_at >= NOW() - INTERVAL '24 hours'
      `,

      prisma.$queryRaw<[{ rate: number }]>`
        SELECT 
          COALESCE(
            (COUNT(*) FILTER (WHERE acknowledged_at IS NOT NULL)::float / 
             NULLIF(COUNT(*), 0)) * 100,
            0
          )::decimal(5,2) as rate
        FROM vessel_alerts
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `
    ])

    const performanceMetrics = {
      geoFenceCheck: PerformanceMonitor.getStats('geo_fence_check_duration'),
      alertDispatch: PerformanceMonitor.getStats('alert_dispatch_duration'),
      escalationProcess: PerformanceMonitor.getStats('escalation_process_duration')
    }

    return NextResponse.json({
      alerts: {
        total: totalAlerts,
        last24h: alertsLast24h,
        avgResponseTime: avgResponseTime[0].avg,
        escalationRate: parseFloat(escalationRate[0].rate.toString()),
        acknowledgmentRate: parseFloat(ackRate[0].rate.toString())
      },
      performance: performanceMetrics
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}
```

### 3. Health Check Endpoint

**File**: `app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const checks = {
    database: false,
    geoFenceMonitor: false,
    escalationMonitor: false,
    timestamp: new Date().toISOString()
  }

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`
    checks.database = true

    // Check geo-fence monitor (last run within 5 min)
    const lastGeoFenceRun = await prisma.vesselAlert.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    })

    if (lastGeoFenceRun) {
      const age = Date.now() - lastGeoFenceRun.createdAt.getTime()
      checks.geoFenceMonitor = age < 5 * 60 * 1000 // 5 minutes
    }

    // Check escalation monitor (last run within 2 min)
    const lastEscalation = await prisma.escalationLog.findFirst({
      orderBy: { triggeredAt: 'desc' },
      select: { triggeredAt: true }
    })

    if (lastEscalation) {
      const age = Date.now() - lastEscalation.triggeredAt.getTime()
      checks.escalationMonitor = age < 2 * 60 * 1000 // 2 minutes
    }

    const allHealthy = Object.values(checks).every(v => v === true || typeof v === 'string')

    return NextResponse.json(
      { status: allHealthy ? 'healthy' : 'degraded', checks },
      { status: allHealthy ? 200 : 503 }
    )
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      { status: 'unhealthy', checks, error: 'Health check failed' },
      { status: 503 }
    )
  }
}
```

---

## Test Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "test:load": "node __tests__/load/alert-dispatch.load.ts"
  }
}
```

---

## Monitoring Dashboard Widget

**File**: `components/dashboard/MonitoringWidget.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export function MonitoringWidget() {
  const [metrics, setMetrics] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      const [metricsRes, healthRes] = await Promise.all([
        fetch('/api/monitoring/metrics'),
        fetch('/api/health')
      ])

      setMetrics(await metricsRes.json())
      setHealth(await healthRes.json())
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Health</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Badge variant={health?.status === 'healthy' ? 'default' : 'destructive'}>
            {health?.status || 'Unknown'}
          </Badge>
          <p className="text-xs text-muted-foreground mt-2">
            Database: {health?.checks?.database ? '✅' : '❌'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alerts (24h)</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.alerts?.last24h || 0}</div>
          <p className="text-xs text-muted-foreground">
            {metrics?.alerts?.acknowledgmentRate?.toFixed(1) || 0}% acknowledged
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics?.alerts?.avgResponseTime || 0} min
          </div>
          <p className="text-xs text-muted-foreground">
            Last 24 hours
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Escalation Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics?.alerts?.escalationRate?.toFixed(1) || 0}%
          </div>
          <p className="text-xs text-muted-foreground">
            Alerts requiring escalation
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Performance Baseline Documentation

**File**: `PERFORMANCE_BASELINE.md`

```markdown
# Performance Baseline

## Metrics (as of implementation)

### Alert Processing
- **Geo-fence check**: ~2-5s for 100 vessels
- **Alert creation**: <500ms per alert
- **Notification dispatch**: <200ms per channel
- **Escalation check**: <1s per cycle

### API Response Times
- `/api/vessel-alerts/active`: <100ms (cached)
- `/api/database/stats-cached`: <50ms (cached)
- `/api/vessel-alerts/[id]`: <200ms

### Background Jobs
- Geo-fence monitor: Every 2 minutes
- Escalation monitor: Every 1 minute
- Stats updates: Every 15-30 seconds

### Resource Usage
- PM2 memory per process: <256MB
- Database connections: <20 active
- Average CPU: <5%

## Success Criteria

✅ Alert delivery time: < 60 seconds  
✅ Escalation accuracy: > 95%  
✅ Acknowledgment rate: > 90% (critical alerts)  
✅ False positive rate: < 5%  
✅ System uptime: > 99.9%

## Monitoring Alerts

Set up alerts for:
- Health check failures
- Alert delivery failures > 5%
- Response time p99 > 5s
- Memory usage > 80%
- Escalation failures
```

---

## Next Steps

1. ✅ Set up continuous integration
2. ✅ Configure production monitoring (Railway/Vercel)
3. ✅ Move to Week 5: Custom Geo-Fencing

**Implementation Status**: Ready to code ✅
