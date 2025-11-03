# Database Connection Pool Exhaustion - Fixed

## Problem Summary

The application was experiencing `FATAL: sorry, too many clients already` errors due to:

1. **Scripts creating separate Prisma clients**: `update-realtime-stats.ts` was creating its own PrismaClient instance instead of using the singleton
2. **Too many parallel queries**: 9 queries running simultaneously every 30 seconds
3. **Connection pool misconfiguration**: Pool limit of 20 connections per instance
4. **Idle connections accumulating**: 97+ idle connections not being released

## Root Cause

```typescript
// ❌ WRONG - Creates separate connection pool
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// ✅ CORRECT - Uses singleton with shared pool
import { prisma } from '../lib/prisma'
```

## Fixes Applied

### 1. Fixed `update-realtime-stats.ts`
- **Changed**: Uses singleton Prisma client from `lib/prisma.ts`
- **Benefit**: Shares connection pool with rest of application
-  **Batched queries**: Grouped 9 parallel queries into 4 sequential batches
- **Added retry logic**: 10s backoff on connection pool exhaustion

### 2. Reduced Connection Pool Limit
```bash
# .env.local
DATABASE_POOL_LIMIT=10  # Down from 20
DATABASE_POOL_TIMEOUT=20  # Up from 10s
```

### 3. Killed Idle Connections
```sql
-- Terminated 98 idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'weather_alert' 
  AND state = 'idle';
```

## Connection Usage After Fix

```
Before: 99 connections (97 idle, 1 active)
After:  18 connections (mostly active)
```

## Best Practices Going Forward

### ✅ DO:
1. Always import from `lib/prisma.ts` singleton
2. Use `Promise.allSettled()` for parallel queries
3. Batch queries into smaller groups (3-4 max)
4. Add error handling for connection exhaustion
5. Monitor `pg_stat_activity` regularly

### ❌ DON'T:
1. Create new `PrismaClient()` instances in scripts
2. Run 9+ parallel database queries
3. Ignore idle connection warnings
4. Set pool limits > 15 in development

## Monitoring Commands

### Check Active Connections
```bash
psql -U yash -d weather_alert -c "
  SELECT count(*) as active_connections, state 
  FROM pg_stat_activity 
  WHERE datname = 'weather_alert' 
  GROUP BY state;
"
```

### Check Running Scripts
```bash
ps aux | grep -E "(tsx|update-realtime)" | grep -v grep
```

### Kill Idle Connections (Emergency)
```bash
psql -U yash -d weather_alert -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE datname = 'weather_alert' 
    AND state = 'idle' 
    AND pid <> pg_backend_pid();
"
```

## Scripts Audit

### ✅ Using Singleton (Good)
- `lib/workers/*` - All workers use singleton
- `scripts/start-ais-streaming.ts` - Uses worker (which uses singleton)
- `scripts/monitor-vessel-proximity.ts` - Uses singleton
- `scripts/update-realtime-stats.ts` - **FIXED** to use singleton

### ⚠️ Creating Own Client (Check if needed)
- `scripts/check-recent-with-tz.ts`
- `scripts/add-createdat-index.ts`
- `scripts/backfill-historical-events.ts`
- `scripts/monitor-services.ts`
- `scripts/profile-stats-queries.ts`
- `scripts/check-alerts.ts`
- And 10+ other utility scripts

**Note**: Most of these are one-off utility scripts that aren't running continuously, so they're less critical. However, if you run multiple simultaneously, they could exhaust the pool.

## Performance Impact

### Query Batching Results
```
Before: 9 queries in parallel (9 connections)
After:  4 sequential batches (4 connections max)

Benefit: 55% reduction in simultaneous connections
Trade-off: ~2-3s slower per update cycle (acceptable for 30s interval)
```

## PostgreSQL Configuration (Future)

Consider increasing max_connections if needed:

```sql
-- Check current limit
SHOW max_connections;  -- Usually 100

-- Increase if needed (requires restart)
ALTER SYSTEM SET max_connections = 200;
-- Then: sudo systemctl restart postgresql
```

However, fixing the application-side connection management (as done above) is the correct solution rather than increasing database limits.

## Related Files Modified
1. `/scripts/update-realtime-stats.ts` - Fixed to use singleton, added batching
2. `/.env.local` - Reduced pool limit from 20 to 10
3. This documentation

## Verification

After applying fixes:
```bash
# 1. Check no duplicate instances running
ps aux | grep update-realtime-stats | grep -v grep

# 2. Start the fixed script
npm exec tsx scripts/update-realtime-stats.ts

# 3. Monitor connections (should stay under 30)
watch -n 5 'psql -U yash -d weather_alert -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '\''weather_alert'\'';"'
```

## Status: ✅ RESOLVED

Date: 2025-10-31
Fixed by: Connection pool optimization and script refactoring
