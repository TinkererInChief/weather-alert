# Week 2 Day 4-5: Alert Activity Cache Table

**Priority**: 🟡 MEDIUM | **Effort**: 4-6 hours

---

## Overview

Apply cache table pattern to alert activity metrics for real-time monitoring dashboard.

**Goal**: Pre-computed alert statistics updated every 15-30 seconds for instant dashboard loads.

---

## Database Schema

**File**: `prisma/migrations/XXX_add_alert_activity_cache.sql`

```sql
-- Create alert activity realtime cache table
CREATE TABLE IF NOT EXISTS alert_activity_realtime (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  active_critical INTEGER DEFAULT 0,
  active_high INTEGER DEFAULT 0,
  active_moderate INTEGER DEFAULT 0,
  active_low INTEGER DEFAULT 0,
  opened_last_hour INTEGER DEFAULT 0,
  resolved_last_hour INTEGER DEFAULT 0,
  acknowledged_last_hour INTEGER DEFAULT 0,
  avg_resolution_minutes INTEGER DEFAULT 0,
  avg_acknowledgment_minutes INTEGER DEFAULT 0,
  escalations_triggered INTEGER DEFAULT 0,
  by_event_type JSON DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize with default values
INSERT INTO alert_activity_realtime (id)
VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;
```

Run migration:
```bash
npx prisma db push
```

---

## Background Job Script

**File**: `scripts/update-alert-stats.ts`

```typescript
import { prisma } from '../lib/prisma'

async function updateAlertStats() {
  try {
    console.log('🚨 Updating alert activity stats...')

    const startTime = Date.now()

    // Execute all queries in parallel
    const [
      activeCritical,
      activeHigh,
      activeModerate,
      activeLow,
      openedLastHour,
      resolvedLastHour,
      acknowledgedLastHour,
      avgResolutionTime,
      avgAckTime,
      escalationsTriggered,
      byEventType
    ] = await Promise.all([
      // Active alerts by severity
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessel_alerts
        WHERE resolved_at IS NULL
          AND severity >= 5
      `,

      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessel_alerts
        WHERE resolved_at IS NULL
          AND severity = 4
      `,

      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessel_alerts
        WHERE resolved_at IS NULL
          AND severity = 3
      `,

      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessel_alerts
        WHERE resolved_at IS NULL
          AND severity < 3
      `,

      // Opened last hour
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessel_alerts
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `,

      // Resolved last hour
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessel_alerts
        WHERE resolved_at >= NOW() - INTERVAL '1 hour'
      `,

      // Acknowledged last hour
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessel_alerts
        WHERE acknowledged_at >= NOW() - INTERVAL '1 hour'
      `,

      // Average resolution time (last 24h)
      prisma.$queryRaw<[{ avg: number }]>`
        SELECT COALESCE(
          AVG(
            EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60
          ), 0
        )::int as avg
        FROM vessel_alerts
        WHERE resolved_at IS NOT NULL
          AND resolved_at >= NOW() - INTERVAL '24 hours'
      `,

      // Average acknowledgment time (last 24h)
      prisma.$queryRaw<[{ avg: number }]>`
        SELECT COALESCE(
          AVG(
            EXTRACT(EPOCH FROM (acknowledged_at - created_at)) / 60
          ), 0
        )::int as avg
        FROM vessel_alerts
        WHERE acknowledged_at IS NOT NULL
          AND acknowledged_at >= NOW() - INTERVAL '24 hours'
      `,

      // Escalations triggered (last 24h)
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(DISTINCT alert_id)::int as count
        FROM escalation_logs
        WHERE triggered_at >= NOW() - INTERVAL '24 hours'
          AND step > 1
      `,

      // Breakdown by event type
      prisma.$queryRaw<Array<{ eventType: string; count: number }>>`
        SELECT 
          COALESCE(event_type, 'Unknown') as "eventType",
          COUNT(*)::int as count
        FROM vessel_alerts
        WHERE resolved_at IS NULL
        GROUP BY event_type
      `
    ])

    // Format event type breakdown
    const eventTypeObj = byEventType.reduce((acc, item) => {
      acc[item.eventType] = item.count
      return acc
    }, {} as Record<string, number>)

    // Update cache table
    await prisma.$executeRaw`
      UPDATE alert_activity_realtime
      SET 
        active_critical = ${activeCritical[0].count},
        active_high = ${activeHigh[0].count},
        active_moderate = ${activeModerate[0].count},
        active_low = ${activeLow[0].count},
        opened_last_hour = ${openedLastHour[0].count},
        resolved_last_hour = ${resolvedLastHour[0].count},
        acknowledged_last_hour = ${acknowledgedLastHour[0].count},
        avg_resolution_minutes = ${avgResolutionTime[0].avg},
        avg_acknowledgment_minutes = ${avgAckTime[0].avg},
        escalations_triggered = ${escalationsTriggered[0].count},
        by_event_type = ${JSON.stringify(eventTypeObj)}::jsonb,
        updated_at = NOW()
      WHERE id = 'singleton'
    `

    const duration = Date.now() - startTime

    console.log('✅ Alert stats updated:', {
      activeCritical: activeCritical[0].count,
      activeHigh: activeHigh[0].count,
      openedLastHour: openedLastHour[0].count,
      avgAckTime: `${avgAckTime[0].avg} min`,
      duration: `${duration}ms`
    })

    if (duration > 10000) {
      console.warn(`⚠️ Slow update: ${duration}ms`)
    }
  } catch (error) {
    console.error('❌ Error updating alert stats:', error)
  }
}

// Run immediately
updateAlertStats()

// Run every 15 seconds
const intervalId = setInterval(updateAlertStats, 15000)

// Graceful shutdown
const shutdown = () => {
  console.log('\n👋 Shutting down alert stats updater...')
  clearInterval(intervalId)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
```

### Add to package.json

```json
{
  "scripts": {
    "stats:alerts": "TZ=UTC tsx scripts/update-alert-stats.ts"
  }
}
```

---

## API Endpoint

**File**: `app/api/database/alert-stats-cached/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const stats = await prisma.$queryRaw<any[]>`
      SELECT 
        active_critical,
        active_high,
        active_moderate,
        active_low,
        opened_last_hour,
        resolved_last_hour,
        acknowledged_last_hour,
        avg_resolution_minutes,
        avg_acknowledgment_minutes,
        escalations_triggered,
        by_event_type,
        updated_at
      FROM alert_activity_realtime
      WHERE id = 'singleton'
    `

    if (stats.length === 0) {
      return NextResponse.json({
        activeCritical: 0,
        activeHigh: 0,
        activeModerate: 0,
        activeLow: 0,
        openedLastHour: 0,
        resolvedLastHour: 0,
        acknowledgedLastHour: 0,
        avgResolutionMinutes: 0,
        avgAcknowledgmentMinutes: 0,
        escalationsTriggered: 0,
        byEventType: {},
        updatedAt: new Date()
      })
    }

    const stat = stats[0]

    return NextResponse.json({
      activeCritical: stat.active_critical || 0,
      activeHigh: stat.active_high || 0,
      activeModerate: stat.active_moderate || 0,
      activeLow: stat.active_low || 0,
      openedLastHour: stat.opened_last_hour || 0,
      resolvedLastHour: stat.resolved_last_hour || 0,
      acknowledgedLastHour: stat.acknowledged_last_hour || 0,
      avgResolutionMinutes: stat.avg_resolution_minutes || 0,
      avgAcknowledgmentMinutes: stat.avg_acknowledgment_minutes || 0,
      escalationsTriggered: stat.escalations_triggered || 0,
      byEventType: stat.by_event_type || {},
      updatedAt: stat.updated_at
    })
  } catch (error) {
    console.error('Error fetching alert stats cache:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alert stats' },
      { status: 500 }
    )
  }
}
```

---

## Dashboard Widget (Optional)

**File**: `components/dashboard/AlertActivityWidget.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'

type AlertStats = {
  activeCritical: number
  activeHigh: number
  activeModerate: number
  activeLow: number
  openedLastHour: number
  resolvedLastHour: number
  acknowledgedLastHour: number
  avgResolutionMinutes: number
  avgAcknowledgmentMinutes: number
  escalationsTriggered: number
  byEventType: Record<string, number>
  updatedAt: Date
}

export function AlertActivityWidget() {
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/database/alert-stats-cached')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching alert stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  const totalActive = 
    (stats?.activeCritical || 0) +
    (stats?.activeHigh || 0) +
    (stats?.activeModerate || 0) +
    (stats?.activeLow || 0)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {stats?.activeCritical || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            Requires immediate action
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalActive}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.activeHigh || 0} high, {stats?.activeModerate || 0} moderate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats?.avgAcknowledgmentMinutes || 0} min
          </div>
          <p className="text-xs text-muted-foreground">
            Last 24 hours
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resolved (1h)</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.resolvedLastHour || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.openedLastHour || 0} opened
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## PM2 Configuration

Update `ecosystem.config.js`:

```javascript
{
  name: 'stats-alerts',
  script: 'pnpm',
  args: 'stats:alerts',
  instances: 1,
  exec_mode: 'fork',
  max_memory_restart: '128M',
  env: {
    NODE_ENV: 'production'
  }
}
```

---

## Testing

```bash
# Test script
pnpm stats:alerts

# Test API
curl http://localhost:3000/api/database/alert-stats-cached

# Start with PM2
pm2 start ecosystem.config.js --only stats-alerts
pm2 logs stats-alerts
```

---

## Next Steps

1. ✅ Add alert activity widget to main dashboard
2. ✅ Move to Week 3: Geo-Fence Monitor
3. ✅ Use stats in alert management UI

**Implementation Status**: Ready to code ✅
