-- ================================================================
-- TEST SCENARIO SETUP
-- Creates a controlled test for the vessel proximity monitor
-- ================================================================

BEGIN;

-- 1. Create a recent vessel position for CARMEN
-- Position: Indian Ocean (10°N, 80°E) - near Sri Lanka
INSERT INTO vessel_positions (
  id,
  "vesselId",
  latitude,
  longitude,
  speed,
  course,
  heading,
  "navStatus",
  timestamp,
  "createdAt"
) VALUES (
  'test_pos_' || gen_random_uuid()::text,
  'cmhbgng1m0av4ayls0qcpqkpl', -- CARMEN
  10.0,  -- Latitude
  80.0,  -- Longitude
  12.5,  -- Speed (knots)
  180.0, -- Course
  180.0, -- Heading
  'Under way using engine',
  NOW(),
  NOW()
)
ON CONFLICT (id, timestamp) DO NOTHING;

-- 2. Create a HIGH severity earthquake
-- Location: 85km north of vessel (9.23°N, 80.0°E)
-- This should trigger a HIGH alert (~85km distance)
INSERT INTO earthquake_events (
  id,
  "sourceId",
  source,
  magnitude,
  depth,
  latitude,
  longitude,
  location,
  "occurredAt",
  "tsunamiPossible",
  status,
  "rawData",
  "createdAt",
  "updatedAt"
) VALUES (
  'test_eq_' || gen_random_uuid()::text,
  'usgs_test_' || extract(epoch from now())::text,
  'USGS',
  6.8, -- Strong earthquake
  10.0, -- Shallow (10km depth)
  10.77, -- ~85km north of vessel
  80.0,
  'Indian Ocean, Near Sri Lanka',
  NOW() - INTERVAL '10 minutes', -- Happened 10 min ago
  true, -- Tsunami possible
  'active',
  '{"test": true, "scenario": "automated_alert_test"}'::jsonb,
  NOW(),
  NOW()
);

-- 3. Verify setup
SELECT '=== TEST SCENARIO CREATED ===' as status;

SELECT 
  'Vessel Position' as type,
  v.name as vessel,
  vp.latitude,
  vp.longitude,
  vp.timestamp
FROM vessel_positions vp
JOIN vessels v ON vp."vesselId" = v.id
WHERE v.id = 'cmhbgng1m0av4ayls0qcpqkpl'
  AND vp.timestamp > NOW() - INTERVAL '5 minutes'
ORDER BY vp.timestamp DESC
LIMIT 1;

SELECT 
  'Earthquake Event' as type,
  magnitude,
  latitude,
  longitude,
  location,
  "occurredAt"
FROM earthquake_events
WHERE id LIKE 'test_eq_%'
ORDER BY "createdAt" DESC
LIMIT 1;

-- 4. Calculate expected distance
SELECT 
  'Expected Alert' as info,
  ROUND(
    6371 * acos(
      cos(radians(10.0)) * cos(radians(10.77)) * 
      cos(radians(80.0) - radians(80.0)) + 
      sin(radians(10.0)) * sin(radians(10.77))
    )
  ) as distance_km,
  'HIGH severity (85km)' as expected_severity;

COMMIT;

SELECT '✅ Ready to run monitor!' as next_step;
