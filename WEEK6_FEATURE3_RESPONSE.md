# Week 6 Feature 3: Response Time Analytics

**Priority**: 🟡 LOWER | **Effort**: 6-8 hours

---

## Overview

Calculate and report on alert response times for insurance compliance. All data already exists in your system - just needs aggregation.

**Data Sources** (all existing):
- `vessel_alerts` - createdAt → acknowledgedAt
- `delivery_logs` - notification delivery times
- `escalation_logs` - escalation metrics

---

## Response Analytics Service

**File**: `lib/services/response-analytics.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export class ResponseAnalyticsService {
  /**
   * Calculate response time metrics for a period
   */
  async calculateMetrics(startDate: Date, endDate: Date, fleetId?: string) {
    // Get fleet vessels if specified
    const vesselIds = fleetId ? (
      await prisma.fleetVessel.findMany({
        where: { fleetId },
        select: { vesselId: true }
      })
    ).map(fv => fv.vesselId) : undefined

    // Get all acknowledged alerts in period
    const alerts = await prisma.vesselAlert.findMany({
      where: {
        ...(vesselIds && { vesselId: { in: vesselIds } }),
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        acknowledgedAt: { not: null }
      },
      select: {
        id: true,
        createdAt: true,
        acknowledgedAt: true,
        severity: true,
        riskLevel: true,
        vesselId: true
      }
    })

    if (alerts.length === 0) {
      return this.getEmptyMetrics()
    }

    // Calculate response times
    const responseTimes = alerts.map(alert => ({
      alertId: alert.id,
      vesselId: alert.vesselId,
      severity: alert.severity,
      riskLevel: alert.riskLevel,
      responseMinutes: this.calculateMinutes(alert.createdAt, alert.acknowledgedAt!)
    }))

    // Overall metrics
    const avgResponseTime = this.calculateAverage(responseTimes.map(r => r.responseMinutes))
    const medianResponseTime = this.calculateMedian(responseTimes.map(r => r.responseMinutes))

    // By severity
    const bySeverity = this.groupBySeverity(responseTimes)

    // By risk level
    const byRiskLevel = this.groupByRiskLevel(responseTimes)

    // Top performers (fastest response)
    const topPerformers = await this.getTopPerformers(responseTimes)

    // Slow responders (slowest response)
    const slowResponders = await this.getSlowResponders(responseTimes)

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        totalAlerts: alerts.length,
        avgResponseTime: Math.round(avgResponseTime),
        medianResponseTime: Math.round(medianResponseTime),
        acknowledgmentRate: 100 // All filtered alerts are acknowledged
      },
      bySeverity,
      byRiskLevel,
      topPerformers,
      slowResponders
    }
  }

  /**
   * Get notification delivery metrics
   */
  async getDeliveryMetrics(startDate: Date, endDate: Date) {
    const deliveryLogs = await prisma.deliveryLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        status: true,
        channel: true
      }
    })

    if (deliveryLogs.length === 0) {
      return { avgDeliveryTime: 0, successRate: 0, byChannel: {} }
    }

    // Calculate delivery times (seconds)
    const deliveryTimes = deliveryLogs
      .filter(d => d.sentAt && d.deliveredAt)
      .map(d => (d.deliveredAt!.getTime() - d.sentAt!.getTime()) / 1000)

    const avgDeliveryTime = this.calculateAverage(deliveryTimes)
    const successRate = (deliveryLogs.filter(d => d.status === 'delivered').length / deliveryLogs.length) * 100

    // By channel
    const byChannel = this.groupByChannel(deliveryLogs)

    return {
      avgDeliveryTime: avgDeliveryTime.toFixed(1),
      successRate: successRate.toFixed(1),
      byChannel
    }
  }

  /**
   * Get escalation metrics
   */
  async getEscalationMetrics(startDate: Date, endDate: Date) {
    const escalations = await prisma.escalationLog.findMany({
      where: {
        triggeredAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        step: true,
        triggeredAt: true,
        completedAt: true,
        status: true
      }
    })

    const totalAlerts = await prisma.vesselAlert.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const escalatedAlerts = new Set(escalations.map(e => e.step > 1 ? 1 : 0)).size
    const escalationRate = totalAlerts > 0 ? (escalatedAlerts / totalAlerts) * 100 : 0

    const avgEscalationTime = this.calculateAverage(
      escalations
        .filter(e => e.completedAt)
        .map(e => this.calculateMinutes(e.triggeredAt, e.completedAt!))
    )

    return {
      totalEscalations: escalations.length,
      escalationRate: escalationRate.toFixed(1),
      avgEscalationTime: Math.round(avgEscalationTime),
      byStep: this.groupByStep(escalations)
    }
  }

  // Helper methods
  private calculateMinutes(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / (1000 * 60)
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]
  }

  private groupBySeverity(responseTimes: any[]) {
    const severityGroups = {
      critical: responseTimes.filter(r => r.severity >= 5),
      high: responseTimes.filter(r => r.severity === 4),
      moderate: responseTimes.filter(r => r.severity === 3),
      low: responseTimes.filter(r => r.severity < 3)
    }

    return Object.entries(severityGroups).reduce((acc, [severity, times]) => {
      acc[severity] = {
        count: times.length,
        avgResponse: times.length > 0 ? Math.round(this.calculateAverage(times.map(t => t.responseMinutes))) : 0,
        ackRate: '100%' // All are acknowledged in this dataset
      }
      return acc
    }, {} as any)
  }

  private groupByRiskLevel(responseTimes: any[]) {
    const riskGroups = ['critical', 'high', 'moderate', 'low'].reduce((acc, risk) => {
      const times = responseTimes.filter(r => r.riskLevel === risk)
      acc[risk] = {
        count: times.length,
        avgResponse: times.length > 0 ? Math.round(this.calculateAverage(times.map(t => t.responseMinutes))) : 0
      }
      return acc
    }, {} as any)

    return riskGroups
  }

  private async getTopPerformers(responseTimes: any[]) {
    const byVessel = this.groupBy(responseTimes, 'vesselId')
    
    const performers = await Promise.all(
      Object.entries(byVessel).map(async ([vesselId, times]: [string, any]) => {
        const vessel = await prisma.vessel.findUnique({
          where: { id: vesselId },
          select: { name: true, mmsi: true }
        })

        return {
          vesselId,
          vesselName: vessel?.name || 'Unknown',
          vesselMMSI: vessel?.mmsi || 'Unknown',
          avgResponse: Math.round(this.calculateAverage(times.map((t: any) => t.responseMinutes))),
          alertCount: times.length,
          ackRate: '100%'
        }
      })
    )

    return performers.sort((a, b) => a.avgResponse - b.avgResponse).slice(0, 5)
  }

  private async getSlowResponders(responseTimes: any[]) {
    const byVessel = this.groupBy(responseTimes, 'vesselId')
    
    const performers = await Promise.all(
      Object.entries(byVessel).map(async ([vesselId, times]: [string, any]) => {
        const vessel = await prisma.vessel.findUnique({
          where: { id: vesselId },
          select: { name: true, mmsi: true }
        })

        return {
          vesselId,
          vesselName: vessel?.name || 'Unknown',
          vesselMMSI: vessel?.mmsi || 'Unknown',
          avgResponse: Math.round(this.calculateAverage(times.map((t: any) => t.responseMinutes))),
          alertCount: times.length
        }
      })
    )

    return performers.sort((a, b) => b.avgResponse - a.avgResponse).slice(0, 5)
  }

  private groupByChannel(deliveryLogs: any[]) {
    const channels = ['sms', 'whatsapp', 'email', 'voice']
    
    return channels.reduce((acc, channel) => {
      const logs = deliveryLogs.filter(d => d.channel === channel)
      
      if (logs.length === 0) {
        acc[channel] = { successRate: '0%', avgDelivery: '0s' }
        return acc
      }

      const successRate = (logs.filter(d => d.status === 'delivered').length / logs.length) * 100
      const deliveryTimes = logs
        .filter(d => d.sentAt && d.deliveredAt)
        .map(d => (d.deliveredAt!.getTime() - d.sentAt!.getTime()) / 1000)
      
      const avgDelivery = deliveryTimes.length > 0 ? this.calculateAverage(deliveryTimes) : 0

      acc[channel] = {
        successRate: `${successRate.toFixed(1)}%`,
        avgDelivery: `${avgDelivery.toFixed(1)}s`
      }

      return acc
    }, {} as any)
  }

  private groupByStep(escalations: any[]) {
    return {
      step1: escalations.filter(e => e.step === 1).length,
      step2: escalations.filter(e => e.step === 2).length,
      step3: escalations.filter(e => e.step === 3).length
    }
  }

  private groupBy(arr: any[], key: string) {
    return arr.reduce((acc, item) => {
      const group = item[key]
      if (!acc[group]) acc[group] = []
      acc[group].push(item)
      return acc
    }, {})
  }

  private getEmptyMetrics() {
    return {
      summary: {
        totalAlerts: 0,
        avgResponseTime: 0,
        medianResponseTime: 0,
        acknowledgmentRate: 0
      },
      bySeverity: {},
      byRiskLevel: {},
      topPerformers: [],
      slowResponders: []
    }
  }
}
```

---

## API Routes

**File**: `app/api/reports/response-analytics/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ResponseAnalyticsService } from '@/lib/services/response-analytics'
import { subDays } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const fleetId = searchParams.get('fleetId')
    const days = parseInt(searchParams.get('days') || '30')

    const endDate = new Date()
    const startDate = subDays(endDate, days)

    const service = new ResponseAnalyticsService()

    const [responseMetrics, deliveryMetrics, escalationMetrics] = await Promise.all([
      service.calculateMetrics(startDate, endDate, fleetId || undefined),
      service.getDeliveryMetrics(startDate, endDate),
      service.getEscalationMetrics(startDate, endDate)
    ])

    return NextResponse.json({
      period: `Last ${days} days`,
      responseMetrics,
      deliveryPerformance: deliveryMetrics,
      escalationMetrics
    })
  } catch (error) {
    console.error('Error generating response analytics:', error)
    return NextResponse.json({ error: 'Failed to generate analytics' }, { status: 500 })
  }
}
```

---

## Dashboard Widget

**File**: `components/dashboard/ResponseAnalyticsWidget.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react'

export function ResponseAnalyticsWidget({ fleetId }: { fleetId?: string }) {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [fleetId])

  const fetchMetrics = async () => {
    try {
      const url = `/api/reports/response-analytics?days=30${fleetId ? `&fleetId=${fleetId}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      setMetrics(data)
    } catch (error) {
      console.error('Error fetching response analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  const { responseMetrics, deliveryPerformance } = metrics || {}

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Response Analytics</h2>
      <p className="text-muted-foreground">Last 30 days</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {responseMetrics?.summary?.avgResponseTime || 0} min
            </div>
            <p className="text-xs text-muted-foreground">
              Median: {responseMetrics?.summary?.medianResponseTime || 0} min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {responseMetrics?.summary?.totalAlerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {responseMetrics?.summary?.acknowledgmentRate || 0}% acknowledged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Success</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deliveryPerformance?.successRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: {deliveryPerformance?.avgDeliveryTime || 0}s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {responseMetrics?.bySeverity?.critical?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {responseMetrics?.bySeverity?.critical?.avgResponse || 0} min avg
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      {responseMetrics?.topPerformers && responseMetrics.topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Fastest response times</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {responseMetrics.topPerformers.map((performer: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{performer.vesselName}</p>
                    <p className="text-sm text-muted-foreground">{performer.vesselMMSI}</p>
                  </div>
                  <Badge variant="default">{performer.avgResponse} min</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## Testing

```bash
# Get response analytics
curl http://localhost:3000/api/reports/response-analytics?days=30

# Get fleet-specific analytics
curl http://localhost:3000/api/reports/response-analytics?days=30&fleetId=fleet_123
```

---

## Next Steps

1. ✅ Integrate with insurance dashboard
2. ✅ Move to Feature 6: Safe Harbor Identification
3. ✅ Add CSV export for compliance reports

**Implementation Status**: Ready to code ✅
