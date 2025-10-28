# Week 1 Day 4-5: Vessel Activity Cache Table

**Priority**: 🟠 HIGH | **Effort**: 6-8 hours

---

## Overview

Apply the cache table pattern (from `MATERIALIZED_VIEWS_VS_CACHE_TABLES.md`) to `/dashboard/vessels` for real-time vessel activity metrics.

**Current Problem**: Direct queries on 30k+ vessels = 10-15s load time  
**Goal**: Pre-computed cache table updated every 30s = <2s load time

---

## Database Schema

### Create Cache Table

**File**: `prisma/migrations/XXX_add_vessel_activity_cache.sql`

```sql
-- Create vessel activity realtime cache table
CREATE TABLE IF NOT EXISTS vessel_activity_realtime (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  active_now INTEGER DEFAULT 0,              -- Transmitting in last 5 min
  active_last_hour INTEGER DEFAULT 0,        -- Active in last hour
  active_last_24h INTEGER DEFAULT 0,         -- Active in last 24h
  total_vessels INTEGER DEFAULT 0,           -- Total in database
  positions_last_hour INTEGER DEFAULT 0,     -- Position reports
  vessel_types JSON DEFAULT '{}',            -- {"cargo": 1234, "tanker": 567}
  top_flags JSON DEFAULT '[]',               -- [{"flag": "US", "count": 1234}, ...]
  speed_avg DECIMAL(5,2) DEFAULT 0,          -- Average speed (knots)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize with default values
INSERT INTO vessel_activity_realtime (id)
VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

-- Add index for faster access (though singleton, good practice)
CREATE INDEX IF NOT EXISTS idx_vessel_activity_updated 
ON vessel_activity_realtime(updated_at);
```

Run migration:
```bash
npx prisma db push
```

---

## Background Job Script

**File**: `scripts/update-vessel-stats.ts`

```typescript
import { prisma } from '../lib/prisma'

async function updateVesselStats() {
  try {
    console.log('🚢 Updating vessel activity stats...')

    const startTime = Date.now()

    // Execute all queries in parallel
    const [
      activeNow,
      active1h,
      active24h,
      totalVessels,
      positionsCount,
      vesselTypesCounts,
      topFlagsCounts,
      avgSpeed
    ] = await Promise.all([
      // Active now (last 5 minutes)
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(DISTINCT "vesselId")::int as count
        FROM vessel_positions
        WHERE timestamp >= NOW() - INTERVAL '5 minutes'
      `,

      // Active last hour
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(DISTINCT "vesselId")::int as count
        FROM vessel_positions
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
      `,

      // Active last 24h
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(DISTINCT "vesselId")::int as count
        FROM vessel_positions
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
      `,

      // Total vessels
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessels
        WHERE active = true
      `,

      // Positions last hour
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessel_positions
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
      `,

      // Vessel types breakdown
      prisma.$queryRaw<Array<{ vesselType: string; count: number }>>`
        SELECT 
          COALESCE("vesselType", 'Unknown') as "vesselType",
          COUNT(*)::int as count
        FROM vessels
        WHERE active = true
        GROUP BY "vesselType"
        ORDER BY count DESC
        LIMIT 10
      `,

      // Top flags
      prisma.$queryRaw<Array<{ flag: string; count: number }>>`
        SELECT 
          COALESCE(flag, 'Unknown') as flag,
          COUNT(*)::int as count
        FROM vessels
        WHERE active = true
        GROUP BY flag
        ORDER BY count DESC
        LIMIT 10
      `,

      // Average speed (from recent positions)
      prisma.$queryRaw<[{ avg: number }]>`
        SELECT COALESCE(AVG(speed), 0)::decimal(5,2) as avg
        FROM vessel_positions
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
          AND speed > 0 
          AND speed < 50
      `
    ])

    // Format vessel types as object
    const vesselTypesObj = vesselTypesCounts.reduce((acc, item) => {
      acc[item.vesselType] = item.count
      return acc
    }, {} as Record<string, number>)

    // Format top flags as array
    const topFlagsArray = topFlagsCounts.map(item => ({
      flag: item.flag,
      count: item.count
    }))

    // Update cache table
    await prisma.$executeRaw`
      UPDATE vessel_activity_realtime
      SET 
        active_now = ${activeNow[0].count},
        active_last_hour = ${active1h[0].count},
        active_last_24h = ${active24h[0].count},
        total_vessels = ${totalVessels[0].count},
        positions_last_hour = ${positionsCount[0].count},
        vessel_types = ${JSON.stringify(vesselTypesObj)}::jsonb,
        top_flags = ${JSON.stringify(topFlagsArray)}::jsonb,
        speed_avg = ${parseFloat(avgSpeed[0].avg.toString())},
        updated_at = NOW()
      WHERE id = 'singleton'
    `

    const duration = Date.now() - startTime

    console.log('✅ Vessel stats updated:', {
      activeNow: activeNow[0].count,
      active1h: active1h[0].count,
      active24h: active24h[0].count,
      totalVessels: totalVessels[0].count,
      positionsLastHour: positionsCount[0].count,
      avgSpeed: avgSpeed[0].avg,
      duration: `${duration}ms`
    })

    // Warn if update took too long
    if (duration > 10000) {
      console.warn(`⚠️ Slow update detected: ${duration}ms`)
    }
  } catch (error) {
    console.error('❌ Error updating vessel stats:', error)
  }
}

// Run immediately on startup
updateVesselStats()

// Then run every 30 seconds
const intervalId = setInterval(updateVesselStats, 30000)

// Graceful shutdown
const shutdown = () => {
  console.log('\n👋 Shutting down vessel stats updater...')
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
    "stats:vessels": "TZ=UTC tsx scripts/update-vessel-stats.ts"
  }
}
```

### Test Script

```bash
pnpm stats:vessels
```

---

## API Endpoint

**File**: `app/api/database/vessel-stats-cached/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const stats = await prisma.$queryRaw<any[]>`
      SELECT 
        active_now,
        active_last_hour,
        active_last_24h,
        total_vessels,
        positions_last_hour,
        vessel_types,
        top_flags,
        speed_avg,
        updated_at
      FROM vessel_activity_realtime
      WHERE id = 'singleton'
    `

    if (stats.length === 0) {
      return NextResponse.json({
        activeNow: 0,
        activeLastHour: 0,
        activeLast24h: 0,
        totalVessels: 0,
        positionsLastHour: 0,
        vesselTypes: {},
        topFlags: [],
        speedAvg: 0,
        updatedAt: new Date()
      })
    }

    const stat = stats[0]

    return NextResponse.json({
      activeNow: stat.active_now || 0,
      activeLastHour: stat.active_last_hour || 0,
      activeLast24h: stat.active_last_24h || 0,
      totalVessels: stat.total_vessels || 0,
      positionsLastHour: stat.positions_last_hour || 0,
      vesselTypes: stat.vessel_types || {},
      topFlags: stat.top_flags || [],
      speedAvg: parseFloat(stat.speed_avg) || 0,
      updatedAt: stat.updated_at
    })
  } catch (error) {
    console.error('Error fetching vessel stats cache:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vessel stats' },
      { status: 500 }
    )
  }
}
```

---

## Update Dashboard UI

### If `/dashboard/vessels` exists

**File**: `app/dashboard/vessels/page.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Ship, Activity, TrendingUp } from 'lucide-react'

type VesselStats = {
  activeNow: number
  activeLastHour: number
  activeLast24h: number
  totalVessels: number
  positionsLastHour: number
  vesselTypes: Record<string, number>
  topFlags: Array<{ flag: string; count: number }>
  speedAvg: number
  updatedAt: Date
}

export default function VesselsDashboard() {
  const [stats, setStats] = useState<VesselStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/database/vessel-stats-cached')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching vessel stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vessel Activity</h1>
        <p className="text-muted-foreground mt-1">
          Real-time AIS vessel tracking and statistics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeNow.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Transmitting in last 5 minutes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Hour</CardTitle>
            <Ship className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeLastHour.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Active vessels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeLast24h.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Active vessels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Speed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.speedAvg.toFixed(1)} kn</div>
            <p className="text-xs text-muted-foreground">
              Average speed (last hour)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vessel Types */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vessel Types</CardTitle>
            <CardDescription>Distribution of active vessels by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats?.vesselTypes || {})
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm">{type}</span>
                    <Badge variant="secondary">{count.toLocaleString()}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Flags</CardTitle>
            <CardDescription>Vessels by flag state</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.topFlags.slice(0, 8).map(({ flag, count }) => (
                <div key={flag} className="flex items-center justify-between">
                  <span className="text-sm">{flag}</span>
                  <Badge variant="secondary">{count.toLocaleString()}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Update Timestamp */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {stats?.updatedAt ? new Date(stats.updatedAt).toLocaleTimeString() : 'Never'}
      </div>
    </div>
  )
}
```

---

## PM2 Configuration

**File**: `ecosystem.config.js`

Add vessel stats updater to PM2:

```javascript
module.exports = {
  apps: [
    // ... existing apps
    {
      name: 'stats-realtime',
      script: 'pnpm',
      args: 'stats:realtime',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'stats-vessels',  // NEW
      script: 'pnpm',
      args: 'stats:vessels',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
```

### Start Services

```bash
# Development
pnpm stats:vessels

# Production
pm2 start ecosystem.config.js --only stats-vessels
pm2 save
```

---

## Performance Monitoring

### Add Logging

Update background job to track performance:

```typescript
// In update-vessel-stats.ts

let updateCount = 0
let totalDuration = 0
let maxDuration = 0
let minDuration = Infinity

async function updateVesselStats() {
  const startTime = Date.now()
  
  try {
    // ... existing logic
    
    const duration = Date.now() - startTime
    updateCount++
    totalDuration += duration
    maxDuration = Math.max(maxDuration, duration)
    minDuration = Math.min(minDuration, duration)
    
    if (updateCount % 10 === 0) {
      console.log('📊 Performance stats (last 10 updates):', {
        avg: `${(totalDuration / updateCount).toFixed(0)}ms`,
        min: `${minDuration}ms`,
        max: `${maxDuration}ms`,
        updates: updateCount
      })
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}
```

---

## Testing

### Manual Testing Checklist

1. ✅ Run background job: `pnpm stats:vessels`
2. ✅ Verify cache table is updating every 30s
3. ✅ Check API endpoint returns correct data
4. ✅ Verify dashboard loads in <2s
5. ✅ Test with PM2 in production mode
6. ✅ Monitor memory usage (should stay <256MB)

### API Testing

```bash
# Test cache endpoint
curl http://localhost:3000/api/database/vessel-stats-cached

# Expected response:
{
  "activeNow": 1234,
  "activeLastHour": 2345,
  "activeLast24h": 3456,
  "totalVessels": 30567,
  "positionsLastHour": 45678,
  "vesselTypes": {
    "Cargo": 8934,
    "Tanker": 6721,
    "Fishing": 4532
  },
  "topFlags": [
    {"flag": "US", "count": 3456},
    {"flag": "China", "count": 2987}
  ],
  "speedAvg": 12.5,
  "updatedAt": "2024-10-28T10:00:00Z"
}
```

### Performance Testing

```bash
# Measure API response time
time curl http://localhost:3000/api/database/vessel-stats-cached

# Should be <100ms (instant read from cache)
```

### Database Query Testing

```sql
-- Check cache table contents
SELECT * FROM vessel_activity_realtime;

-- Verify update frequency
SELECT 
  id,
  active_now,
  active_last_hour,
  updated_at,
  NOW() - updated_at as age
FROM vessel_activity_realtime;

-- Should show age < 1 minute if background job is running
```

---

## Troubleshooting

### Background Job Not Running

```bash
# Check if script is running
ps aux | grep update-vessel-stats

# Check PM2 status
pm2 status

# View logs
pm2 logs stats-vessels

# Restart if needed
pm2 restart stats-vessels
```

### Slow Updates

```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT COUNT(DISTINCT "vesselId")::int
FROM vessel_positions
WHERE timestamp >= NOW() - INTERVAL '5 minutes';

-- Add indexes if needed
CREATE INDEX IF NOT EXISTS idx_vessel_positions_timestamp 
ON vessel_positions(timestamp DESC);
```

### Memory Issues

```bash
# Monitor memory usage
pm2 monit

# If exceeds 256MB, optimize queries or reduce update frequency
```

---

## Performance Targets

| Metric | Before | After |
|--------|--------|-------|
| Dashboard Load Time | 10-15s | <2s |
| API Response Time | 8-12s | <100ms |
| Data Freshness | On-demand | 30s |
| Server Load | High | Low |

---

## Next Steps

Once vessel cache table is complete:
1. ✅ Apply same pattern to other dashboards (alerts, monitoring)
2. ✅ Move to Week 2: Escalation System
3. ✅ Use cached data in Week 3 geo-fence monitoring

**Implementation Status**: Ready to code ✅
