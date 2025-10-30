# 🚨 CRITICAL PERFORMANCE FIX

## Problem Identified
Database has **2.6 MILLION vessel positions** causing extreme slowness:
- Vessel API: 20+ seconds
- Status page: 44 seconds  
- Dashboard: 43 seconds

## Root Cause
The vessel_positions table is growing unbounded. Queries are scanning millions of rows.

## IMMEDIATE FIXES (Do these NOW!)

### Fix 1: Restart Dev Server
```bash
# Stop the dev server (Ctrl+C)
pnpm dev
```

### Fix 2: Clean Up Old Vessel Positions (CRITICAL)
```sql
-- Keep only last 7 days of positions
DELETE FROM vessel_positions 
WHERE timestamp < NOW() - INTERVAL '7 days';

-- OR keep only last 24 hours for better performance
DELETE FROM vessel_positions 
WHERE timestamp < NOW() - INTERVAL '24 hours';
```

Run this:
```bash
psql postgresql://yash@localhost:5432/weather_alert -c "
DELETE FROM vessel_positions 
WHERE timestamp < NOW() - INTERVAL '7 days';
VACUUM ANALYZE vessel_positions;
"
```

### Fix 3: Add Automatic Cleanup (Prevents future issues)
```sql
-- Create a function to auto-delete old positions
CREATE OR REPLACE FUNCTION cleanup_old_positions()
RETURNS void AS $$
BEGIN
  DELETE FROM vessel_positions 
  WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule it to run daily (if you have pg_cron)
-- OR run manually once a day
```

### Fix 4: Add Index on timestamp (if not exists)
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_positions_timestamp_cleanup
ON vessel_positions(timestamp);
```

## Expected Improvements After Cleanup

| Metric | Current | After Cleanup |
|--------|---------|---------------|
| Vessel Positions | 2.6M | ~50K-200K |
| Vessel API | 20s | <500ms |
| Dashboard | 43s | <2s |
| Memory Usage | High | Normal |

## Long-term Solution

Add to your cron job or background worker:
```typescript
// Cleanup old vessel positions daily
async function cleanupVesselPositions() {
  await prisma.$executeRaw`
    DELETE FROM vessel_positions 
    WHERE timestamp < NOW() - INTERVAL '7 days'
  `
  
  await prisma.$executeRaw`VACUUM ANALYZE vessel_positions`
}
```

## Test After Fixes
```bash
# Should show much fewer positions
psql postgresql://yash@localhost:5432/weather_alert -c "
SELECT COUNT(*) FROM vessel_positions;
"

# Run performance test again
node scripts/test-page-performance.js
```

## Expected Results
- APIs: <1s (currently 20-60s)
- Pages: <2s (currently 5-44s)
- Database queries: <100ms (currently seconds)
