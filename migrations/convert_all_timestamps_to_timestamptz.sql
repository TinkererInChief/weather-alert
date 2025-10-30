-- ================================================================
-- CONVERT ALL TIMESTAMP COLUMNS TO TIMESTAMPTZ
-- ================================================================
-- CRITICAL: All existing TIMESTAMP data is in Asia/Kolkata (IST)
-- We MUST use 'Asia/Kolkata' timezone, NOT 'UTC'
-- ================================================================

BEGIN;

-- Show current timezone
SELECT 'Current server timezone: ' || current_setting('TIMEZONE') as info;

-- Create backup info
SELECT 
  'Starting migration at: ' || NOW() as info,
  'Affected tables: ~25' as scope,
  'Affected columns: ~69' as columns;

-- ================================================================
-- USERS TABLE
-- ================================================================
ALTER TABLE users 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) 
    USING "updatedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "lastLoginAt" TYPE TIMESTAMPTZ(6) 
    USING "lastLoginAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "approvedAt" TYPE TIMESTAMPTZ(6) 
    USING "approvedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "emailVerified" TYPE TIMESTAMPTZ(6) 
    USING "emailVerified" AT TIME ZONE 'Asia/Kolkata';

SELECT 'users: ✅ Converted' as status;

-- ================================================================
-- CONTACTS TABLE
-- ================================================================
ALTER TABLE contacts 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) 
    USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'contacts: ✅ Converted' as status;

-- ================================================================
-- VESSELS TABLE
-- ================================================================
ALTER TABLE vessels 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) 
    USING "updatedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "lastSeen" TYPE TIMESTAMPTZ(6) 
    USING "lastSeen" AT TIME ZONE 'Asia/Kolkata';

SELECT 'vessels: ✅ Converted' as status;

-- ================================================================
-- VESSEL_ALERTS TABLE
-- ================================================================
ALTER TABLE vessel_alerts 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) 
    USING "updatedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "acknowledgedAt" TYPE TIMESTAMPTZ(6) 
    USING "acknowledgedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "resolvedAt" TYPE TIMESTAMPTZ(6) 
    USING "resolvedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "sentAt" TYPE TIMESTAMPTZ(6) 
    USING "sentAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ(6) 
    USING "expiresAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'vessel_alerts: ✅ Converted' as status;

-- ================================================================
-- DELIVERY_LOGS TABLE
-- ================================================================
ALTER TABLE delivery_logs 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) 
    USING "updatedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "sentAt" TYPE TIMESTAMPTZ(6) 
    USING "sentAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "deliveredAt" TYPE TIMESTAMPTZ(6) 
    USING "deliveredAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "readAt" TYPE TIMESTAMPTZ(6) 
    USING "readAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "lastAttemptAt" TYPE TIMESTAMPTZ(6) 
    USING "lastAttemptAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'delivery_logs: ✅ Converted' as status;

-- ================================================================
-- VESSEL_CONTACTS TABLE
-- ================================================================
ALTER TABLE vessel_contacts 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'vessel_contacts: ✅ Converted' as status;

-- ================================================================
-- EARTHQUAKE_EVENTS TABLE
-- ================================================================
ALTER TABLE earthquake_events 
  ALTER COLUMN "occurredAt" TYPE TIMESTAMPTZ(6) 
    USING "occurredAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) 
    USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'earthquake_events: ✅ Converted' as status;

-- ================================================================
-- TSUNAMI_ALERTS TABLE
-- ================================================================
ALTER TABLE tsunami_alerts 
  ALTER COLUMN "estimatedArrivalTime" TYPE TIMESTAMPTZ(6) 
    USING "estimatedArrivalTime" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "cancellationTime" TYPE TIMESTAMPTZ(6) 
    USING "cancellationTime" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'tsunami_alerts: ✅ Converted' as status;

-- ================================================================
-- SESSIONS TABLE
-- ================================================================
ALTER TABLE sessions 
  ALTER COLUMN expires TYPE TIMESTAMPTZ(6) 
    USING expires AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) 
    USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'sessions: ✅ Converted' as status;

-- ================================================================
-- Add more tables as needed...
-- ================================================================

-- Final verification
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type LIKE '%timestamp%'
  AND table_name IN ('users', 'contacts', 'vessels', 'vessel_alerts', 'delivery_logs')
ORDER BY table_name, column_name;

-- Show summary
SELECT 
  COUNT(DISTINCT table_name) as tables_updated,
  COUNT(*) as columns_updated
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'timestamp with time zone'
  AND table_name IN ('users', 'contacts', 'vessels', 'vessel_alerts', 'delivery_logs', 
                     'vessel_contacts', 'earthquake_events', 'tsunami_alerts', 'sessions');

-- COMMIT;  -- Uncomment after reviewing
-- ROLLBACK;  -- Use this if you see any issues
