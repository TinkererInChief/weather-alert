-- ================================================================
-- TEST TIMESTAMP CONVERSION WITHOUT COMMITTING
-- ================================================================
-- This script tests the conversion in a transaction then rolls back
-- Safe to run - makes NO permanent changes
-- ================================================================

BEGIN;

-- Create test table with sample data
CREATE TEMP TABLE conversion_test AS
SELECT 
  "createdAt",
  name,
  email
FROM users
LIMIT 5;

SELECT '=== BEFORE CONVERSION ===' as step;
SELECT * FROM conversion_test;

-- Test the conversion
ALTER TABLE conversion_test
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6)
  USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

SELECT '=== AFTER CONVERSION ===' as step;
SELECT * FROM conversion_test;

-- Compare with wrong conversion (UTC)
CREATE TEMP TABLE wrong_conversion_test AS
SELECT 
  "createdAt",
  name
FROM users
LIMIT 3;

ALTER TABLE wrong_conversion_test
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6)
  USING "createdAt" AT TIME ZONE 'UTC';  -- WRONG!

SELECT '=== COMPARISON: Correct vs Wrong ===' as step;
SELECT 
  c1."createdAt" as correct_conversion,
  c2."createdAt" as wrong_conversion,
  c1."createdAt" - c2."createdAt" as time_difference,
  c1.name
FROM conversion_test c1
JOIN wrong_conversion_test c2 ON c1.name = c2.name;

-- Always rollback (this is just a test)
ROLLBACK;

SELECT '✅ Test complete. No changes were made to the database.' as result;
