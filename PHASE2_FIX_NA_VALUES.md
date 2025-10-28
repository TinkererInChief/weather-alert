# Phase 2: Fix N/A Values - Implementation Guide

## Problem
Three fields show incorrect values:
1. Database Size: Shows "N/A" (should be "916 MB")
2. Positions Today: Shows "0" (should be actual count)
3. New Vessels Today: Shows "0" (should be actual count)

## Root Cause
These values aren't computed in the background stats updater.

---

## Solution: Add Missing Fields to realtime_stats Table

### Step 1: Update Database Schema (2 mins)

Run this migration:

```sql
-- Add missing columns to realtime_stats table
ALTER TABLE realtime_stats 
ADD COLUMN IF NOT EXISTS positions_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vessels_new_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS db_size_bytes BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS db_size_pretty TEXT DEFAULT 'N/A';
```

### Step 2: Update Background Job (10 mins)

File: `scripts/update-realtime-stats.ts`

Add these queries to the `Promise.allSettled()` array:

```typescript
// After line 14, add:
prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
  SELECT COUNT(*)::bigint AS c
  FROM "vessel_positions"
  WHERE "createdAt" >= date_trunc('day', now())
`),
prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
  SELECT COUNT(*)::bigint AS c
  FROM "vessels"
  WHERE "createdAt" >= date_trunc('day', now())
`),
prisma.$queryRaw<Array<{ 
  bytes: bigint
  pretty: string 
}>>(Prisma.sql`
  SELECT 
    pg_database_size(current_database()) AS bytes,
    pg_size_pretty(pg_database_size(current_database())) AS pretty
`)
```

Update the extraction section (after line 31):

```typescript
const posToday = results[5].status === 'fulfilled' ? Number(results[5].value[0]?.c || 0) : 0
const vesselsToday = results[6].status === 'fulfilled' ? Number(results[6].value[0]?.c || 0) : 0
const dbSize = results[7].status === 'fulfilled' ? results[7].value[0] : { bytes: 0, pretty: 'N/A' }
```

Update the UPDATE query (around line 38):

```typescript
await prisma.$executeRaw`
  UPDATE "realtime_stats"
  SET 
    "positions_last_hour" = ${pos1h},
    "positions_last_15min" = ${pos15m},
    "positions_today" = ${posToday},
    "vessels_active_last_hour" = ${vessels1h},
    "vessels_new_today" = ${vesselsToday},
    "total_vessels" = ${totalVessels},
    "total_positions_estimate" = ${totalPos},
    "db_size_bytes" = ${Number(dbSize.bytes)},
    "db_size_pretty" = ${dbSize.pretty},
    "updated_at" = now()
  WHERE id = 'singleton'
`
```

### Step 3: Update API Endpoint (5 mins)

File: `app/api/database/stats-cached/route.ts`

Update the TypeScript interface (line 29):

```typescript
const stats = await prisma.$queryRaw<Array<{
  positions_last_hour: number
  positions_last_15min: number
  positions_today: number
  vessels_active_last_hour: number
  vessels_new_today: number
  total_vessels: number
  total_positions_estimate: bigint
  db_size_pretty: string
  updated_at: Date
}>>(Prisma.sql`
  SELECT * FROM "realtime_stats" WHERE id = 'singleton'
`)
```

Update the response data (line 59):

```typescript
const data = {
  tables: [],
  totalSize: s.db_size_pretty || 'N/A',
  positionStats: {
    total: Number(s.total_positions_estimate),
    today: s.positions_today,
    lastHour: s.positions_last_hour,
    last15Min: s.positions_last_15min
  },
  vesselStats: {
    total: s.total_vessels,
    withPositions: Math.round(s.total_vessels * 0.65),
    recentlyActive: s.vessels_active_last_hour,
    newToday: s.vessels_new_today
  },
  // ... rest
}
```

### Step 4: Restart Background Job (1 min)

1. Stop current job: `Ctrl+C` in terminal where it's running
2. Restart: `pnpm stats:update`
3. Wait 30 seconds for first update
4. Check console for: `✅ Stats updated: ...`

### Step 5: Verify (2 mins)

```bash
# Check the table has new columns
curl -s http://localhost:3000/api/database/stats-cached | jq '.stats | {totalSize, positionsToday: .positionStats.today, newVesselsToday: .vesselStats.newToday}'
```

Expected output:
```json
{
  "totalSize": "916 MB",
  "positionsToday": 125684,
  "newVesselsToday": 42
}
```

---

## Quick Implementation Script

Want me to implement all of this automatically? I can:
1. Run the migration
2. Update the background job
3. Update the API endpoint
4. Restart the service

Just say "implement Phase 2" and I'll do it all.

---

## Time Estimate
- Manual: 30 minutes
- Automated: 5 minutes
- Testing: 5 minutes

**Total: ~10 minutes** if I do it for you
