-- Diagnostic query to check recent position data and time ranges
-- Run this in your PostgreSQL client to see actual data

-- Current database time
SELECT 
  now() AS "current_time_with_tz",
  timezone('UTC', now()) AS "current_time_utc",
  now() - interval '1 hour' AS "one_hour_ago",
  timezone('UTC', now()) - interval '1 hour' AS "one_hour_ago_utc";

-- Check max timestamps in vessel_positions
SELECT 
  MAX("timestamp") AS "max_timestamp",
  MAX("createdAt") AS "max_createdAt",
  COUNT(*) AS "total_positions"
FROM "vessel_positions";

-- Count positions in last hour by timestamp (event time)
SELECT 
  COUNT(*) AS "positions_last_hour_by_timestamp"
FROM "vessel_positions"
WHERE "timestamp" >= (timezone('UTC', now()) - interval '1 hour');

-- Count positions in last hour by createdAt (ingest time)
SELECT 
  COUNT(*) AS "positions_last_hour_by_createdAt"
FROM "vessel_positions"
WHERE "createdAt" >= (now() - interval '1 hour');

-- Count positions in last hour using OR logic (what the API uses)
SELECT 
  COUNT(*) AS "positions_last_hour_OR_logic"
FROM "vessel_positions"
WHERE ("timestamp" >= (timezone('UTC', now()) - interval '1 hour')
       OR "createdAt" >= (now() - interval '1 hour'));

-- Count positions in last 15 minutes
SELECT 
  COUNT(*) AS "positions_last_15min_OR_logic"
FROM "vessel_positions"
WHERE ("timestamp" >= (timezone('UTC', now()) - interval '15 minutes')
       OR "createdAt" >= (now() - interval '15 minutes'));

-- Count recently active vessels
SELECT 
  COUNT(DISTINCT "vesselId") AS "recently_active_vessels"
FROM "vessel_positions"
WHERE ("timestamp" >= (timezone('UTC', now()) - interval '1 hour')
       OR "createdAt" >= (now() - interval '1 hour'));

-- Show sample of most recent positions with both timestamps
SELECT 
  "id",
  "vesselId",
  "timestamp",
  "createdAt",
  NOW() - "createdAt" AS "age_by_createdAt",
  timezone('UTC', NOW()) - "timestamp" AS "age_by_timestamp"
FROM "vessel_positions"
ORDER BY "createdAt" DESC
LIMIT 10;
