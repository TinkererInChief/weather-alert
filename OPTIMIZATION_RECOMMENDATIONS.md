# Database Dashboard Performance Optimization Plan

## Current Performance Issues

### 1. Sequential API Calls (CRITICAL)
- **Impact**: 30+ second load times
- **Root Cause**: 14 API calls executed with `await` in series
- **Fix**: Use `Promise.all()` for parallel execution

### 2. Over-Fetching (HIGH)
- **Impact**: Unnecessary database load
- **Root Cause**: Static data (build years, owners) refreshed every 30s
- **Fix**: Separate refresh intervals for static vs real-time data

### 3. Missing Data (MEDIUM)
- **Impact**: "N/A" values displayed
- **Root Cause**: `totalSize`, `today`, `newToday` not computed in cached endpoint
- **Fix**: Add background computation for these fields

### 4. No Timeout Handling (MEDIUM)
- **Impact**: Page hangs if one API times out
- **Root Cause**: No timeout or fallback logic
- **Fix**: Add Promise.race() with timeout wrapper

---

## Detailed Optimization Plan

### Phase 1: Parallel Fetching (1-2 hours)

#### Current Code (Sequential - SLOW)
```typescript
const tick = async () => {
  await fetchStats()              // 2s
  await fetchPositionsSeries()    // 3s
  await fetchAlertsSeries()       // 2s
  // ... 11 more (30+ seconds total!)
}
```

#### Optimized Code (Parallel - FAST)
```typescript
const tick = async () => {
  // Group 1: Real-time data (refresh every 30s)
  await Promise.allSettled([
    fetchStats(),
    fetchPositionsSeries(),
    fetchAlertsSeries(),
    fetchSpeedBuckets(),
    fetchNavStatusCats(),
    fetchDataQuality()
  ])
  
  // Group 2: Semi-static data (only if not loaded or every 5 minutes)
  if (!hasStaticData || Date.now() - lastStaticFetch > 300000) {
    await Promise.allSettled([
      fetchFiltersCounts(),
      fetchBuildYearBuckets(),
      fetchOwnersTop(),
      fetchOperatorsTop(),
      fetchDestTop(),
      fetchVesselsSeries()
    ])
    lastStaticFetch = Date.now()
  }
}
```

**Expected Result**: Load time reduced from 30s to ~3-5s

---

### Phase 2: Add Missing Computations (30 mins)

#### Update `realtime_stats` table
```sql
ALTER TABLE realtime_stats 
ADD COLUMN positions_today INTEGER DEFAULT 0,
ADD COLUMN vessels_new_today INTEGER DEFAULT 0,
ADD COLUMN db_size_bytes BIGINT DEFAULT 0,
ADD COLUMN db_size_pretty TEXT DEFAULT 'N/A';
```

#### Update background job
```typescript
// scripts/update-realtime-stats.ts
const posToday = await prisma.$queryRaw`
  SELECT COUNT(*)::int FROM vessel_positions
  WHERE "createdAt" >= date_trunc('day', now())
`

const vesselsToday = await prisma.$queryRaw`
  SELECT COUNT(*)::int FROM vessels
  WHERE "createdAt" >= date_trunc('day', now())
`

const dbSize = await prisma.$queryRaw`
  SELECT 
    pg_database_size(current_database()) AS bytes,
    pg_size_pretty(pg_database_size(current_database())) AS pretty
`
```

**Expected Result**: No more "N/A" or "0" values

---

### Phase 3: Timeout Protection (30 mins)

#### Add Timeout Wrapper
```typescript
function fetchWithTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = 10000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ])
}

// Usage
const fetchStats = async () => {
  try {
    const response = await fetchWithTimeout(
      fetch('/api/database/stats-cached'),
      10000 // 10 second timeout
    )
    // ... rest of code
  } catch (err) {
    if (err.message === 'Timeout') {
      console.warn('Stats fetch timed out, using cached data')
      // Keep showing old data instead of breaking
    }
  }
}
```

**Expected Result**: Page never hangs, always shows something

---

### Phase 4: Smart Caching (1 hour)

#### Client-Side Cache
```typescript
const cache = {
  stats: { data: null, ts: 0, ttl: 30000 },      // 30s
  positions: { data: null, ts: 0, ttl: 30000 },  // 30s
  filters: { data: null, ts: 0, ttl: 300000 },   // 5 min
  buildYears: { data: null, ts: 0, ttl: 600000 } // 10 min
}

function getCached<T>(key: keyof typeof cache): T | null {
  const entry = cache[key]
  if (entry.data && Date.now() - entry.ts < entry.ttl) {
    return entry.data as T
  }
  return null
}

const fetchStats = async () => {
  const cached = getCached('stats')
  if (cached) {
    setStats(cached)
    return
  }
  
  // Fetch fresh...
  cache.stats = { data: freshData, ts: Date.now(), ttl: 30000 }
}
```

**Expected Result**: Instant page navigation, less server load

---

### Phase 5: Lazy Loading (1-2 hours)

#### Load Above-the-Fold First
```typescript
useEffect(() => {
  // Critical path: Show something immediately
  Promise.allSettled([
    fetchStats(),
    fetchPositionsSeries()
  ]).then(() => setLoading(false))

  // Secondary: Load rest after 1 second
  setTimeout(() => {
    Promise.allSettled([
      fetchAlertsSeries(),
      fetchFiltersCounts(),
      // ... rest
    ])
  }, 1000)
}, [])
```

**Expected Result**: Page feels instant, charts load progressively

---

## Performance Targets

| Metric | Current | After Phase 1 | After All Phases |
|--------|---------|---------------|------------------|
| Initial Load | 30-60s | 3-5s | <2s |
| Refresh Cycle | 30s | 3-5s | <1s (cached) |
| API Calls/30s | 14 | 6 | 3-4 |
| Time to Interactive | 60s | 5s | 2s |

---

## Implementation Priority

1. **Phase 1** (Do First!) - Parallel fetching → 90% improvement
2. **Phase 3** - Timeout protection → Prevents hangs
3. **Phase 2** - Missing data → Better UX
4. **Phase 4** - Client caching → Lower server load
5. **Phase 5** - Lazy loading → Perceived performance

---

## API Endpoint Audit

### Heavy Endpoints (Need Optimization)
1. `/api/database/metrics/distributions?type=speed` - 3-5s
2. `/api/database/metrics/distributions?type=navStatus` - 2-4s
3. `/api/database/metrics/data-quality` - 2-3s
4. `/api/vessels/filters` - 2-3s

### Recommended Optimizations
- Add indexes on `speed`, `navStatus`, `destination`
- Create materialized views for distributions
- Cache filter counts in `realtime_stats` table

---

## Quick Wins (Can Do Today)

### 1. Change `tick()` to Parallel (5 mins)
Replace lines 187-201 with:
```typescript
await Promise.allSettled([
  fetchStats(),
  fetchPositionsSeries(),
  fetchAlertsSeries(),
  fetchSpeedBuckets(),
  fetchNavStatusCats(),
  fetchDataQuality(),
  fetchFiltersCounts(),
  fetchBuildYearBuckets(),
  fetchOwnersTop(),
  fetchOperatorsTop(),
  fetchDestTop(),
  fetchVesselsSeries()
])
```

### 2. Add `.catch()` to All Fetches (10 mins)
Prevent one failure from breaking everything

### 3. Increase Refresh Interval for Static Data (5 mins)
Change interval for build years, owners, operators to 5 minutes instead of 30 seconds

---

## Testing Plan

1. **Load test**: Open dashboard, measure time to "Loading..." → data displayed
2. **Stress test**: Refresh 10 times rapidly, ensure no crashes
3. **Timeout test**: Simulate slow network, verify graceful degradation
4. **Concurrent test**: Open dashboard in 5 tabs simultaneously

---

## Rollback Plan

If optimizations cause issues:
1. Revert frontend to sequential calls (lines 187-201)
2. Keep background job running (it's harmless)
3. Monitor error rates in Next.js logs
