# Week 1 Day 3-4: Dashboard Performance Optimization

**Priority**: 🟠 HIGH | **Effort**: 6-8 hours

---

## Overview

Fix the 30+ second load time on `/dashboard/database` by implementing parallel fetching, timeout protection, and adding missing data computations.

**Current Problem**: 14 API calls executed sequentially = 30+ seconds  
**Goal**: Parallel execution + smart caching = 2-3 seconds (10x faster)

---

## Phase 1: Parallel Fetching (2-3 hours)

### Current Code (SLOW)

**File**: `app/dashboard/database/page.tsx` (approx line 187-201)

```typescript
// ❌ SLOW: Sequential awaits
const tick = async () => {
  await fetchStats()              // 2s
  await fetchPositionsSeries()    // 3s
  await fetchAlertsSeries()       // 2s
  await fetchSpeedBuckets()       // 2s
  await fetchNavStatusCats()      // 2s
  await fetchDataQuality()        // 2s
  await fetchFiltersCounts()      // 3s
  await fetchBuildYearBuckets()   // 2s
  await fetchOwnersTop()          // 2s
  await fetchOperatorsTop()       // 2s
  await fetchDestTop()            // 2s
  await fetchVesselsSeries()      // 3s
  // Total: 30+ seconds!
}
```

### Optimized Code (FAST)

```typescript
// ✅ FAST: Parallel execution with smart grouping
const tick = async () => {
  const needsStaticRefresh = 
    !lastStaticFetch || 
    Date.now() - lastStaticFetch > 300000 // 5 minutes

  // Group 1: Real-time data (fetch every 30s)
  const realtimePromises = [
    fetchStats(),
    fetchPositionsSeries(),
    fetchAlertsSeries(),
    fetchSpeedBuckets(),
    fetchNavStatusCats(),
    fetchDataQuality()
  ]

  // Group 2: Static data (fetch every 5 minutes)
  const staticPromises = needsStaticRefresh ? [
    fetchFiltersCounts(),
    fetchBuildYearBuckets(),
    fetchOwnersTop(),
    fetchOperatorsTop(),
    fetchDestTop(),
    fetchVesselsSeries()
  ] : []

  // Execute all in parallel
  const results = await Promise.allSettled([
    ...realtimePromises,
    ...staticPromises
  ])

  // Log any failures (but don't crash)
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`Fetch ${index} failed:`, result.reason)
    }
  })

  if (needsStaticRefresh) {
    lastStaticFetch = Date.now()
  }
}
```

### Complete Implementation

**File**: `app/dashboard/database/page.tsx`

Find the existing `tick()` function and replace with:

```typescript
'use client'

import { useEffect, useState } from 'react'
// ... existing imports

export default function DatabaseDashboardPage() {
  // ... existing state
  const [lastStaticFetch, setLastStaticFetch] = useState<number>(0)

  // ... existing code

  const tick = async () => {
    const needsStatic = Date.now() - lastStaticFetch > 300000

    try {
      // Real-time data (always fetch)
      const realtime = [
        fetchStats(),
        fetchPositionsSeries(),
        fetchAlertsSeries(),
        fetchSpeedBuckets(),
        fetchNavStatusCats(),
        fetchDataQuality()
      ]

      // Static data (only if needed)
      const static = needsStatic ? [
        fetchFiltersCounts(),
        fetchBuildYearBuckets(),
        fetchOwnersTop(),
        fetchOperatorsTop(),
        fetchDestTop(),
        fetchVesselsSeries()
      ] : []

      // Execute in parallel
      await Promise.allSettled([...realtime, ...static])

      if (needsStatic) {
        setLastStaticFetch(Date.now())
      }
    } catch (error) {
      console.error('Error in tick:', error)
    }
  }

  // ... rest of component
}
```

**Expected Result**: 30s → **2-3s** load time

---

## Phase 2: Timeout Protection (1 hour)

### Timeout Wrapper Utility

**File**: `lib/utils/fetch-with-timeout.ts`

```typescript
/**
 * Wraps a promise with a timeout
 * Rejects if the promise doesn't resolve within timeoutMs
 */
export function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  fallbackValue?: T
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve, reject) =>
      setTimeout(() => {
        if (fallbackValue !== undefined) {
          resolve(fallbackValue)
        } else {
          reject(new Error('Request timeout'))
        }
      }, timeoutMs)
    )
  ])
}

/**
 * Fetch with automatic timeout and error handling
 */
export async function safeFetch<T>(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 10000
): Promise<T | null> {
  try {
    const response = await fetchWithTimeout(
      fetch(url, options),
      timeoutMs
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.warn(`Fetch failed for ${url}:`, error)
    return null
  }
}
```

### Apply to Fetch Functions

**File**: `app/dashboard/database/page.tsx`

Update each fetch function:

```typescript
import { safeFetch } from '@/lib/utils/fetch-with-timeout'

const fetchStats = async () => {
  try {
    const data = await safeFetch('/api/database/stats-cached', {}, 10000)
    
    if (data) {
      setStats(data)
    } else {
      console.warn('Stats fetch failed, keeping old data')
      // Don't clear old data - keep showing it
    }
  } catch (error) {
    console.error('Stats fetch error:', error)
  }
}

const fetchPositionsSeries = async () => {
  try {
    const data = await safeFetch('/api/database/metrics/positions-series', {}, 10000)
    
    if (data) {
      setPositionsSeries(data)
    }
  } catch (error) {
    console.error('Positions series fetch error:', error)
  }
}

// Apply same pattern to all other fetch functions
```

**Benefits**:
- No more page hangs on slow requests
- Graceful degradation (show old data on failure)
- 10-second timeout per request
- User always sees something

---

## Phase 3: Missing Data Computation (2-3 hours)

### Update Database Schema

**File**: `prisma/migrations/XXX_add_missing_stats_fields.sql`

```sql
-- Add missing columns to realtime_stats table
ALTER TABLE realtime_stats 
ADD COLUMN IF NOT EXISTS positions_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vessels_new_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS db_size_bytes BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS db_size_pretty TEXT DEFAULT 'N/A';
```

Run migration:
```bash
npx prisma db push
# or
npx prisma migrate dev --name add_missing_stats_fields
```

### Update Background Job

**File**: `scripts/update-realtime-stats.ts`

Add missing computations:

```typescript
import { prisma } from '../lib/prisma'

async function updateRealtimeStats() {
  try {
    console.log('🔄 Updating realtime stats...')

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    // Execute all queries in parallel
    const [
      positions15m,
      positions1h,
      positions24h,
      positionsToday,      // NEW
      vesselsActive,
      vesselsNewToday,     // NEW
      dbSizeResult         // NEW
    ] = await Promise.all([
      // Existing queries
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessel_positions
        WHERE timestamp >= NOW() - INTERVAL '15 minutes'
      `,
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessel_positions
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
      `,
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessel_positions
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
      `,
      
      // NEW: Positions created today
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessel_positions
        WHERE "createdAt" >= date_trunc('day', NOW())
      `,
      
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessels
        WHERE active = true
      `,
      
      // NEW: Vessels added today
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count
        FROM vessels
        WHERE "createdAt" >= date_trunc('day', NOW())
      `,
      
      // NEW: Database size
      prisma.$queryRaw<[{ bytes: bigint; pretty: string }]>`
        SELECT 
          pg_database_size(current_database()) AS bytes,
          pg_size_pretty(pg_database_size(current_database())) AS pretty
      `
    ])

    // Update realtime_stats table
    await prisma.$executeRaw`
      UPDATE realtime_stats
      SET 
        positions_last_15min = ${positions15m[0].count},
        positions_last_hour = ${positions1h[0].count},
        positions_last_24h = ${positions24h[0].count},
        positions_today = ${positionsToday[0].count},
        vessels_active = ${vesselsActive[0].count},
        vessels_new_today = ${vesselsNewToday[0].count},
        db_size_bytes = ${dbSizeResult[0].bytes.toString()},
        db_size_pretty = ${dbSizeResult[0].pretty},
        updated_at = NOW()
      WHERE id = 'singleton'
    `

    console.log('✅ Stats updated:', {
      positions15m: positions15m[0].count,
      positions1h: positions1h[0].count,
      positions24h: positions24h[0].count,
      positionsToday: positionsToday[0].count,
      vesselsActive: vesselsActive[0].count,
      vesselsNewToday: vesselsNewToday[0].count,
      dbSize: dbSizeResult[0].pretty
    })
  } catch (error) {
    console.error('❌ Error updating realtime stats:', error)
  }
}

// Run immediately
updateRealtimeStats()

// Then run every 30 seconds
setInterval(updateRealtimeStats, 30000)

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down realtime stats updater...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down realtime stats updater...')
  process.exit(0)
})
```

### Update API Endpoint

**File**: `app/api/database/stats-cached/route.ts`

Update to return new fields:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const stats = await prisma.$queryRaw<any[]>`
      SELECT 
        positions_last_15min,
        positions_last_hour,
        positions_last_24h,
        positions_today,
        vessels_active,
        vessels_new_today,
        db_size_bytes,
        db_size_pretty,
        updated_at
      FROM realtime_stats
      WHERE id = 'singleton'
    `

    if (stats.length === 0) {
      return NextResponse.json({
        positionsLast15Min: 0,
        positionsLastHour: 0,
        positionsLast24h: 0,
        positionsToday: 0,
        vesselsActive: 0,
        vesselsNewToday: 0,
        dbSizeBytes: 0,
        dbSizePretty: 'N/A',
        updatedAt: new Date()
      })
    }

    const stat = stats[0]
    return NextResponse.json({
      positionsLast15Min: stat.positions_last_15min || 0,
      positionsLastHour: stat.positions_last_hour || 0,
      positionsLast24h: stat.positions_last_24h || 0,
      positionsToday: stat.positions_today || 0,
      vesselsActive: stat.vessels_active || 0,
      vesselsNewToday: stat.vessels_new_today || 0,
      dbSizeBytes: stat.db_size_bytes ? parseInt(stat.db_size_bytes) : 0,
      dbSizePretty: stat.db_size_pretty || 'N/A',
      updatedAt: stat.updated_at
    })
  } catch (error) {
    console.error('Error fetching cached stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
```

### Update Dashboard UI

**File**: `app/dashboard/database/page.tsx`

Update state and display:

```typescript
const [stats, setStats] = useState<{
  positionsLast15Min: number
  positionsLastHour: number
  positionsLast24h: number
  positionsToday: number          // NEW
  vesselsActive: number
  vesselsNewToday: number          // NEW
  dbSizeBytes: number              // NEW
  dbSizePretty: string             // NEW
  updatedAt: Date
} | null>(null)

// In the render section, replace "N/A" values with actual data:
<Card>
  <CardHeader>
    <CardTitle>Database Size</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {stats?.dbSizePretty || 'Loading...'}
    </div>
    <p className="text-xs text-muted-foreground mt-1">
      {stats?.dbSizeBytes ? `${(stats.dbSizeBytes / 1024 / 1024 / 1024).toFixed(2)} GB` : ''}
    </p>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitle>New Today</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {stats?.vesselsNewToday || 0}
    </div>
    <p className="text-xs text-muted-foreground mt-1">
      Vessels added today
    </p>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitle>Positions Today</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {stats?.positionsToday?.toLocaleString() || 0}
    </div>
    <p className="text-xs text-muted-foreground mt-1">
      Position reports since midnight
    </p>
  </CardContent>
</Card>
```

**Expected Result**: No more "N/A" or "0" placeholders

---

## Phase 4: Client-Side Caching (Optional - 1 hour)

### Cache Manager Utility

**File**: `lib/utils/cache-manager.ts`

```typescript
type CacheEntry<T> = {
  data: T | null
  timestamp: number
  ttl: number
}

class CacheManager {
  private static instance: CacheManager
  private cache: Map<string, CacheEntry<any>> = new Map()

  static getInstance() {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  set<T>(key: string, data: T, ttl: number = 30000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  clear(key?: string) {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }
}

export const cacheManager = CacheManager.getInstance()
```

### Apply Caching to Fetches

```typescript
import { cacheManager } from '@/lib/utils/cache-manager'

const fetchStats = async () => {
  // Check cache first
  const cached = cacheManager.get('stats')
  if (cached) {
    setStats(cached)
    return
  }

  try {
    const data = await safeFetch('/api/database/stats-cached', {}, 10000)
    
    if (data) {
      setStats(data)
      cacheManager.set('stats', data, 30000) // Cache for 30s
    }
  } catch (error) {
    console.error('Stats fetch error:', error)
  }
}

// Apply similar pattern to other fetches with appropriate TTLs:
// - Real-time data: 30s TTL
// - Static data: 300s (5min) TTL
```

---

## Performance Targets

| Metric | Before | After Phase 1 | After All Phases |
|--------|--------|---------------|------------------|
| Initial Load | 30-60s | 3-5s | <2s |
| Refresh Cycle | 30s | 3-5s | <1s (cached) |
| API Calls/30s | 14 | 6 | 3-4 |
| Time to Interactive | 60s | 5s | 2s |

---

## Testing

### Performance Testing

```typescript
// Add performance logging
const tick = async () => {
  const start = performance.now()
  
  // ... fetch logic
  
  const duration = performance.now() - start
  console.log(`Tick completed in ${duration.toFixed(0)}ms`)
  
  if (duration > 5000) {
    console.warn('⚠️ Slow tick detected:', duration)
  }
}
```

### Load Testing

```bash
# Open dashboard in multiple tabs
# Monitor performance in DevTools > Network tab
# Check for:
# - Parallel requests (not sequential)
# - Proper timeout handling
# - Cache hits on subsequent loads
```

### Manual Testing Checklist

1. ✅ Initial load completes in <3s
2. ✅ Refresh cycle completes in <2s
3. ✅ No page hangs on network issues
4. ✅ All data displays correctly (no "N/A")
5. ✅ Static data refreshes every 5 min
6. ✅ Real-time data refreshes every 30s

---

## Rollback Plan

If optimizations cause issues:

1. Revert parallel fetching:
```typescript
// Emergency fallback: sequential (slow but safe)
const tick = async () => {
  await fetchStats()
  await fetchPositionsSeries()
  // ... etc
}
```

2. Keep background job running (it's harmless)
3. Monitor error rates in logs

---

## Next Steps

Once performance optimization is complete:
1. ✅ Move to Week 1 Day 4-5: Vessel Activity Cache Table
2. ✅ Apply same patterns to other dashboards
3. ✅ Monitor performance in production

**Implementation Status**: Ready to code ✅
