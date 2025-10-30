-- ================================================================
-- CONVERT REMAINING TIMESTAMP COLUMNS TO TIMESTAMPTZ
-- Part 2: Tables not covered in first migration
-- ================================================================

BEGIN;

-- ================================================================
-- ACCOUNT TABLE
-- ================================================================
ALTER TABLE accounts 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) 
    USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'accounts: ✅ Converted' as status;

-- ================================================================
-- VERIFICATION_TOKENS TABLE
-- ================================================================
ALTER TABLE verification_tokens 
  ALTER COLUMN expires TYPE TIMESTAMPTZ(6) 
    USING expires AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) 
    USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'verification_tokens: ✅ Converted' as status;

-- ================================================================
-- SMS_OTPS TABLE
-- ================================================================
ALTER TABLE sms_otps 
  ALTER COLUMN expires TYPE TIMESTAMPTZ(6) 
    USING expires AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "consumedAt" TYPE TIMESTAMPTZ(6) 
    USING "consumedAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'sms_otps: ✅ Converted' as status;

-- ================================================================
-- CONTACT_GROUPS TABLE
-- ================================================================
ALTER TABLE contact_groups 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) 
    USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'contact_groups: ✅ Converted' as status;

-- ================================================================
-- ALERT_ZONES TABLE
-- ================================================================
ALTER TABLE alert_zones 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'alert_zones: ✅ Converted' as status;

-- ================================================================
-- MESSAGE_TEMPLATES TABLE
-- ================================================================
ALTER TABLE message_templates 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) 
    USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'message_templates: ✅ Converted' as status;

-- ================================================================
-- ALERT_JOBS TABLE
-- ================================================================
ALTER TABLE alert_jobs 
  ALTER COLUMN "scheduledFor" TYPE TIMESTAMPTZ(6) 
    USING "scheduledFor" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "startedAt" TYPE TIMESTAMPTZ(6) 
    USING "startedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "completedAt" TYPE TIMESTAMPTZ(6) 
    USING "completedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'alert_jobs: ✅ Converted' as status;

-- ================================================================
-- ORGANIZATIONS TABLE
-- ================================================================
ALTER TABLE organizations 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) 
    USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'organizations: ✅ Converted' as status;

-- ================================================================
-- AUDIT_LOGS TABLE
-- ================================================================
ALTER TABLE audit_logs 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'audit_logs: ✅ Converted' as status;

-- ================================================================
-- ALERT_LOGS TABLE
-- ================================================================
ALTER TABLE alert_logs 
  ALTER COLUMN timestamp TYPE TIMESTAMPTZ(6) 
    USING timestamp AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'alert_logs: ✅ Converted' as status;

-- ================================================================
-- EARTHQUAKE_CACHE TABLE
-- ================================================================
ALTER TABLE earthquake_cache 
  ALTER COLUMN timestamp TYPE TIMESTAMPTZ(6) 
    USING timestamp AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'earthquake_cache: ✅ Converted' as status;

-- ================================================================
-- VOICE_CALLS TABLE
-- ================================================================
ALTER TABLE voice_calls 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "completedAt" TYPE TIMESTAMPTZ(6) 
    USING "completedAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'voice_calls: ✅ Converted' as status;

-- ================================================================
-- BULK_CALL_JOBS TABLE
-- ================================================================
ALTER TABLE bulk_call_jobs 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'bulk_call_jobs: ✅ Converted' as status;

-- ================================================================
-- SYSTEM_SETTINGS TABLE
-- ================================================================
ALTER TABLE system_settings 
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) 
    USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'system_settings: ✅ Converted' as status;

-- ================================================================
-- HEALTH_SNAPSHOTS TABLE
-- ================================================================
ALTER TABLE health_snapshots 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'health_snapshots: ✅ Converted' as status;

-- ================================================================
-- HEALTH_EVENTS TABLE
-- ================================================================
ALTER TABLE health_events 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'health_events: ✅ Converted' as status;

-- ================================================================
-- MAINTENANCE_WINDOWS TABLE
-- ================================================================
ALTER TABLE maintenance_windows 
  ALTER COLUMN "startTime" TYPE TIMESTAMPTZ(6) 
    USING "startTime" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "endTime" TYPE TIMESTAMPTZ(6) 
    USING "endTime" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) 
    USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) 
    USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

SELECT 'maintenance_windows: ✅ Converted' as status;

-- ================================================================
-- FLEETS TABLE
-- ================================================================
ALTER TABLE fleets 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ(6) 
    USING created_at AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ(6) 
    USING updated_at AT TIME ZONE 'Asia/Kolkata';

SELECT 'fleets: ✅ Converted' as status;

-- ================================================================
-- FLEET_VESSELS TABLE
-- ================================================================
ALTER TABLE fleet_vessels 
  ALTER COLUMN added_at TYPE TIMESTAMPTZ(6) 
    USING added_at AT TIME ZONE 'Asia/Kolkata';

SELECT 'fleet_vessels: ✅ Converted' as status;

-- Final verification
SELECT 
  COUNT(DISTINCT table_name) as tables_converted,
  COUNT(*) as columns_converted
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'timestamp with time zone'
  AND table_name IN (
    'accounts', 'verification_tokens', 'sms_otps', 'contact_groups',
    'alert_zones', 'message_templates', 'alert_jobs', 'organizations',
    'audit_logs', 'alert_logs', 'earthquake_cache', 'voice_calls',
    'bulk_call_jobs', 'system_settings', 'health_snapshots', 'health_events',
    'maintenance_windows', 'fleets', 'fleet_vessels'
  );

COMMIT;

SELECT '✅ Part 2 migration complete! All remaining tables converted to TIMESTAMPTZ.' as result;
