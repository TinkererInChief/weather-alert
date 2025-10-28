# Phase 1: Parallel Fetching Implementation

## Code Changes for app/dashboard/database/page.tsx

Replace lines 177-214 with this optimized version:

```typescript
useEffect(() => {
  // Track last fetch times for different data categories
  let lastStaticFetch = 0
  const STATIC_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes
  
  const tick = async () => {
    const now = Date.now()
    const needsStaticRefresh = now - lastStaticFetch > STATIC_REFRESH_INTERVAL
    
    // PARALLEL Group 1: Real-time data (always fetch)
    const realtimePromises = [
      fetchStats(),
      fetchPositionsSeries(),
      fetchAlertsSeries(),
      fetchSpeedBuckets(),
      fetchNavStatusCats(),
      fetchDataQuality()
    ]
    
    // PARALLEL Group 2: Semi-static data (only every 5 minutes)
    const staticPromises = needsStaticRefresh ? [
      fetchFiltersCounts(),
      fetchBuildYearBuckets(),
      fetchOwnersTop(),
      fetchOperatorsTop(),
      fetchDestTop(),
      fetchVesselsSeries()
    ] : []
    
    // Execute all in parallel with error tolerance
    const results = await Promise.allSettled([
      ...realtimePromises,
      ...staticPromises
    ])
    
    // Log any failures (but don't break the page)
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.warn(`API call ${i} failed:`, result.reason)
      }
    })
    
    if (needsStaticRefresh) {
      lastStaticFetch = now
    }
  }

  // Run first tick immediately on mount
  let ticking = false
  const run = async () => {
    if (ticking) return
    ticking = true
    try { 
      await tick() 
    } catch (err) {
      console.error('Tick error:', err)
    } finally { 
      ticking = false 
    }
  }

  // Initial load
  void run()
  
  // Auto-refresh every 30 seconds
  const interval = setInterval(() => { void run() }, 30000)
  
  return () => clearInterval(interval)
}, [])
```

## Expected Performance Improvement

### Before (Sequential)
```
fetchStats()              2s ━━━━━━━━━━━━━━━
  ↓
fetchPositionsSeries()    3s ━━━━━━━━━━━━━━━━━━━━
  ↓
fetchAlertsSeries()       2s ━━━━━━━━━━━━━━━
  ↓
... (11 more)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 30-40 seconds
```

### After (Parallel)
```
fetchStats()              2s ━━━━━━━━━━━━━━━
fetchPositionsSeries()    3s ━━━━━━━━━━━━━━━━━━━━
fetchAlertsSeries()       2s ━━━━━━━━━━━━━━━
... (all 14 at once)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 3-5 seconds (time of slowest call)
```

## Additional Improvements

### Add Timeout Wrapper
```typescript
// Add at top of file, before component
const fetchWithTimeout = <T,>(
  promise: Promise<T>,
  timeoutMs = 10000
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ])
}

// Update each fetch function
const fetchStats = async () => {
  try {
    const response = await fetchWithTimeout(
      fetch('/api/database/stats-cached', { cache: 'no-store' }),
      10000
    )
    const data = await response.json()
    if (data.success) {
      setStats(data.stats)
      setError(null)
    }
  } catch (err) {
    console.error('Failed to fetch database stats:', err)
    // Keep old data on timeout instead of showing error
    if (err.message !== 'Request timeout') {
      setError(err instanceof Error ? err.message : 'Network error')
    }
  }
}
```

## Testing Steps

1. **Clear browser cache**: Cmd+Shift+R
2. **Open DevTools Network tab**
3. **Navigate to /dashboard/database**
4. **Verify**:
   - All 14 requests start simultaneously (waterfall should be flat)
   - Page shows data within 3-5 seconds
   - No timeout errors in console
5. **Wait 30 seconds**:
   - Only 6 real-time requests should fire
   - Static data not refetched
6. **Wait 5 minutes**:
   - All 14 requests fire again
   - Static data refreshed

## Rollback

If issues occur, revert to sequential by replacing with original code from lines 177-214.
