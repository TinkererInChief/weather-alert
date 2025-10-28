# Materialized Views vs Cache Tables - Decision Guide

## What We Built for /dashboard/database

We implemented a **Cache Table Pattern** (not a true materialized view):

```typescript
// Background job updates table every 30s
await prisma.$executeRaw`
  UPDATE "realtime_stats"
  SET 
    "positions_last_hour" = ${count1h},
    "positions_last_15min" = ${count15m},
    "updated_at" = now()
  WHERE id = 'singleton'
`

// API reads instantly
const stats = await prisma.$queryRaw`
  SELECT * FROM "realtime_stats" WHERE id = 'singleton'
`
```

### Why Cache Table Instead of Materialized View?

✅ **Need partial updates** - Only update changed columns  
✅ **Need frequent updates** - Every 30 seconds  
✅ **Need custom logic** - Conditional updates, sampling  
✅ **Need flexibility** - Can add business logic in Node.js  

---

## When to Use Materialized Views

For other pages, consider **true PostgreSQL materialized views** when:

### ✅ Good Candidates

#### 1. Complex Historical Analytics (Future Use)

**When to Use**: Multi-table JOINs with infrequent updates

**Example**: Monthly vessel activity trends
```sql
CREATE MATERIALIZED VIEW vessel_trends_monthly AS
SELECT 
  DATE_TRUNC('month', "createdAt") as month,
  "vesselType",
  COUNT(*) as new_vessels,
  COUNT(DISTINCT "flag") as unique_flags
FROM "vessels"
WHERE "createdAt" < DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', "createdAt"), "vesselType"
ORDER BY month DESC;

-- Refresh monthly
REFRESH MATERIALIZED VIEW CONCURRENTLY vessel_trends_monthly;
```

**Refresh Schedule**: Monthly  
**Benefits**: Complex aggregations pre-computed  

---

## When to Use Cache Table Pattern

### ✅ Good Candidates (Our Approach)

#### 1. `/dashboard/database` - Real-time Stats ✓ (Implemented)

**Why Cache Table**:
- Updates every 30 seconds (too frequent for MV)
- Partial updates (only changed columns)
- Custom logic (sampling, estimates)

```typescript
// Background job updates specific columns
await prisma.$executeRaw`
  UPDATE "realtime_stats"
  SET 
    "positions_last_hour" = ${count1h},
    "updated_at" = now()
  WHERE id = 'singleton'
`
```

#### 2. `/dashboard/vessels` - Vessel Activity ✓ (Planned)

**Why Cache Table**:
- Real-time AIS position updates (every 30s)
- Need current active vessel counts
- Partial updates for different time windows

```sql
CREATE TABLE vessel_activity_realtime (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  active_now INTEGER,              -- Currently transmitting
  active_last_hour INTEGER,        -- Active in last hour
  active_last_24h INTEGER,         -- Active in last 24h
  total_vessels INTEGER,           -- Total in database
  positions_last_hour INTEGER,     -- Position count
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Update Method**: Background job (`scripts/update-vessel-stats.ts`)  
**Refresh Schedule**: Every 30 seconds  
**Benefits**: Real-time vessel tracking data  

#### 3. `/dashboard/alerts` - Alert Activity ✓ (Planned)

**Why Cache Table**:
- Real-time alert status changes (every 15-30s)
- Need current active alert counts by severity
- Partial updates for resolution metrics

```sql
CREATE TABLE alert_activity_realtime (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  active_critical INTEGER,         -- Currently active critical alerts
  active_warning INTEGER,          -- Currently active warning alerts
  active_info INTEGER,             -- Currently active info alerts
  opened_last_hour INTEGER,        -- Opened in last hour
  resolved_last_hour INTEGER,      -- Resolved in last hour
  avg_resolution_minutes INTEGER,  -- Avg resolution time (last 24h)
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Update Method**: Background job (`scripts/update-alert-stats.ts`)  
**Refresh Schedule**: Every 15-30 seconds  
**Benefits**: Real-time alert monitoring  

#### 4. `/dashboard/monitoring` - Real-time Metrics (Future)

**Why Cache Table**:
- Real-time system health metrics
- Would use WebSocket/polling anyway
- Complex business logic for thresholds

```sql
CREATE TABLE system_metrics_realtime (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  api_requests_per_minute INTEGER,
  active_websocket_connections INTEGER,
  queue_depth INTEGER,
  avg_response_time_ms INTEGER,
  error_rate_percent DECIMAL(5,2),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Update Method**: Background job (`scripts/update-system-metrics.ts`)  
**Refresh Schedule**: Every 30 seconds  
**Benefits**: Real-time system monitoring  

#### 5. `/dashboard` - Emergency Alerts (Current)

**Why Cache Table**:
- Real-time earthquake/tsunami alerts (every 15-30s)
- Need immediate alert status updates
- Complex filtering logic

```sql
CREATE TABLE emergency_alerts_realtime (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  active_earthquakes INTEGER,
  active_tsunamis INTEGER,
  alerts_last_hour INTEGER,
  highest_severity TEXT,
  most_recent_alert TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Update Method**: Background job (`scripts/update-emergency-stats.ts`)  
**Refresh Schedule**: Every 15-30 seconds  
**Benefits**: Real-time emergency monitoring  

---

## Why We Chose Cache Tables Over Materialized Views

### Our Use Case Requirements:
1. **Real-time updates** (15-30 seconds) - MV refresh is too slow
2. **Partial column updates** - MV requires full refresh
3. **Custom business logic** - Node.js code easier than SQL
4. **Flexible update schedules** - Different tables, different intervals
5. **Historical queries** - Can use indexed date filters on source tables

### Cache Table Advantages:
```typescript
// ✅ Update only what changed
await prisma.$executeRaw`
  UPDATE "realtime_stats"
  SET "positions_last_hour" = ${count1h}  -- Only this column
  WHERE id = 'singleton'
`

// ✅ Custom logic in application
if (count1h > threshold) {
  // Send alert
  await sendAlert()
}

// ✅ Different update intervals
setInterval(updateVesselStats, 30000)    // 30s
setInterval(updateAlertStats, 15000)     // 15s
```

### Materialized View Limitations:
```sql
-- ❌ Full refresh required (even for one column)
REFRESH MATERIALIZED VIEW my_stats;  -- Rebuilds entire view

-- ❌ Minimum practical refresh: 5-15 minutes
-- ❌ No custom logic (SQL only)
-- ❌ Same refresh schedule for all data
```

---

## Performance Comparison

### Cache Table (Our Approach)
```
Initial Setup:     1 hour (create table, background job)
Update Frequency:  15-30 seconds
Update Method:     Application code (Node.js)
Flexibility:       ⭐⭐⭐⭐⭐ (full control)
Maintenance:       Medium (manage background jobs)
Best For:          Real-time data, complex logic, partial updates
Query Speed:       ⚡ Instant (single row read)
```

### Materialized View
```
Initial Setup:     15 minutes (create view, indexes)
Update Frequency:  15 min - 24 hours
Update Method:     PostgreSQL command
Flexibility:       ⭐⭐⭐ (SQL only)
Maintenance:       Low (PostgreSQL handles it)
Best For:          Historical data, complex JOINs, infrequent updates
Query Speed:       ⚡ Fast (pre-computed)
```

---

## Decision Matrix

| Requirement | Cache Table | Materialized View |
|-------------|-------------|-------------------|
| **Update every 15-30s** | ✅ | ❌ |
| **Partial updates** | ✅ | ❌ |
| **Custom logic** | ✅ | ❌ |
| **Simple SQL aggregation** | ✅ | ✅ |
| **Infrequent updates (hourly+)** | ✅ | ✅ |
| **No application code** | ❌ | ✅ |
| **Non-blocking updates** | ✅ | ✅ (CONCURRENTLY) |
| **Easy to set up** | ⚠️ | ✅ |
| **Real-time data** | ✅ | ❌ |

---

## Implementation Guide

### Step 1: Create Cache Table

```sql
-- Create cache table with singleton pattern
CREATE TABLE my_stats_realtime (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  metric_1 INTEGER,
  metric_2 INTEGER,
  metric_3 DECIMAL(10,2),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Initialize with default values
INSERT INTO my_stats_realtime (id, metric_1, metric_2, metric_3)
VALUES ('singleton', 0, 0, 0.0);
```

### Step 2: Create Background Job Script

```typescript
// scripts/update-my-stats.ts
import { prisma } from '@/lib/prisma'

async function updateStats() {
  try {
    // Calculate metrics
    const metric1 = await prisma.myTable.count({
      where: { createdAt: { gte: new Date(Date.now() - 3600000) } }
    })
    
    const metric2 = await prisma.myTable.count({
      where: { status: 'active' }
    })

    // Update cache table
    await prisma.$executeRaw`
      UPDATE "my_stats_realtime"
      SET 
        "metric_1" = ${metric1},
        "metric_2" = ${metric2},
        "updated_at" = now()
      WHERE id = 'singleton'
    `
    
    console.log('✅ Stats updated:', { metric1, metric2 })
  } catch (error) {
    console.error('❌ Error updating stats:', error)
  }
}

// Run every 30 seconds
setInterval(updateStats, 30000)

// Initial run
updateStats()
```

### Step 3: Add Script to package.json

```json
{
  "scripts": {
    "stats:my-feature": "TZ=UTC tsx scripts/update-my-stats.ts"
  }
}
```

### Step 4: Query Cache Table in API

```typescript
// app/api/dashboard/my-feature/route.ts
import { prisma } from '@/lib/prisma'

export async function GET() {
  const stats = await prisma.$queryRaw`
    SELECT * FROM "my_stats_realtime" WHERE id = 'singleton'
  `
  
  return Response.json(stats[0])
}
```

---

## Recommendation Summary

### For Each Page:

1. **`/dashboard/database`** ✅ Cache Table (implemented)
   - Real-time database stats
   - Update frequency: 30 seconds
   - Script: `scripts/update-realtime-stats.ts`

2. **`/dashboard/vessels`** ✅ Cache Table (planned)
   - Real-time vessel activity
   - Update frequency: 30 seconds
   - Script: `scripts/update-vessel-stats.ts`

3. **`/dashboard/alerts`** ✅ Cache Table (planned)
   - Real-time alert monitoring
   - Update frequency: 15-30 seconds
   - Script: `scripts/update-alert-stats.ts`

4. **`/dashboard/monitoring`** ✅ Cache Table (future)
   - Real-time system metrics
   - Update frequency: 30 seconds
   - Script: `scripts/update-system-metrics.ts`

5. **`/dashboard`** ✅ Cache Table (planned)
   - Real-time emergency alerts
   - Update frequency: 15-30 seconds
   - Script: `scripts/update-emergency-stats.ts`

6. **`/dashboard/contacts`** ⚠️ Neither
   - Small dataset, no aggregations needed
   - Use: Standard queries with indexes

### Historical Data Strategy:
- Use **indexed date filters** on source tables
- Example: `WHERE "createdAt" >= DATE_TRUNC('month', CURRENT_DATE)`
- Fast with proper indexes, no cache needed

---

## Migration Path

### Phase 1: Current (Implemented)
✅ `/dashboard/database` uses cache table
- Table: `realtime_stats`
- Script: `scripts/update-realtime-stats.ts`
- Frequency: 30 seconds

### Phase 2: Expand Cache Tables (Week 1-2)
1. Create `vessel_activity_realtime` table
2. Create `scripts/update-vessel-stats.ts`
3. Update `/dashboard/vessels` API
4. Deploy and monitor

### Phase 3: Additional Dashboards (Week 2-3)
1. Create `alert_activity_realtime` table
2. Create `scripts/update-alert-stats.ts`
3. Update `/dashboard/alerts` API
4. Create `emergency_alerts_realtime` table
5. Create `scripts/update-emergency-stats.ts`
6. Update `/dashboard` API

### Phase 4: Monitoring (Week 3-4)
1. Create `system_metrics_realtime` table
2. Create `scripts/update-system-metrics.ts`
3. Update `/dashboard/monitoring` API

---

## Conclusion

**Our Decision**: Cache Tables for all real-time dashboards

**Reasoning**:
1. All our dashboards need **real-time data** (15-30s updates)
2. We need **partial updates** (only changed metrics)
3. We want **custom logic** in Node.js (alerts, thresholds)
4. Historical data can use **indexed queries** on source tables

**When We'd Use Materialized Views**:
- Monthly/yearly reports (infrequent refresh)
- Complex multi-table JOINs (pre-compute expensive queries)
- Read-only analytics (no real-time requirement)

**Next Steps**:
1. Apply cache table pattern to `/dashboard/vessels`
2. Apply cache table pattern to `/dashboard/alerts`
3. Apply cache table pattern to `/dashboard`
4. Monitor performance and adjust update intervals

See `/APPLY_OPTIMIZATIONS_TO_OTHER_PAGES.md` for implementation details.
