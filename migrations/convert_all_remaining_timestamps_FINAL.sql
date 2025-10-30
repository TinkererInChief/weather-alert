-- ================================================================
-- FINAL CONVERSION: ALL REMAINING TIMESTAMP → TIMESTAMPTZ
-- Based on actual database state (68 columns)
-- ================================================================

BEGIN;

SELECT 'Starting final timestamp conversion...' as info;
SELECT 'Current timezone: ' || current_setting('TIMEZONE') as info;

-- Accounts (2 columns)
ALTER TABLE accounts 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

-- Alert Jobs (4 columns)
ALTER TABLE alert_jobs 
  ALTER COLUMN "completedAt" TYPE TIMESTAMPTZ(6) USING "completedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "scheduledFor" TYPE TIMESTAMPTZ(6) USING "scheduledFor" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "startedAt" TYPE TIMESTAMPTZ(6) USING "startedAt" AT TIME ZONE 'Asia/Kolkata';

-- Alert Logs (2 columns)
ALTER TABLE alert_logs 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN timestamp TYPE TIMESTAMPTZ(6) USING timestamp AT TIME ZONE 'Asia/Kolkata';

-- Alert Zones (1 column)
ALTER TABLE alert_zones 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

-- Audit Logs (1 column)
ALTER TABLE audit_logs 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

-- Bulk Call Jobs (1 column)
ALTER TABLE bulk_call_jobs 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

-- Contact Groups (1 column)
ALTER TABLE contact_groups 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

-- Contacts (2 columns)
ALTER TABLE contacts 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

-- Delivery Logs (6 columns)
ALTER TABLE delivery_logs 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "deliveredAt" TYPE TIMESTAMPTZ(6) USING "deliveredAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "lastAttemptAt" TYPE TIMESTAMPTZ(6) USING "lastAttemptAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "readAt" TYPE TIMESTAMPTZ(6) USING "readAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "sentAt" TYPE TIMESTAMPTZ(6) USING "sentAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

-- Earthquake Cache (2 columns)
ALTER TABLE earthquake_cache 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN timestamp TYPE TIMESTAMPTZ(6) USING timestamp AT TIME ZONE 'Asia/Kolkata';

-- Earthquake Events (3 columns)
ALTER TABLE earthquake_events 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "occurredAt" TYPE TIMESTAMPTZ(6) USING "occurredAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

-- Fleet Vessels (1 column)
ALTER TABLE fleet_vessels 
  ALTER COLUMN added_at TYPE TIMESTAMPTZ(6) USING added_at AT TIME ZONE 'Asia/Kolkata';

-- Fleets (2 columns)
ALTER TABLE fleets 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ(6) USING created_at AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ(6) USING updated_at AT TIME ZONE 'Asia/Kolkata';

-- Health Events (1 column)
ALTER TABLE health_events 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

-- Health Snapshots (1 column)
ALTER TABLE health_snapshots 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

-- Maintenance Windows (4 columns)
ALTER TABLE maintenance_windows 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "endTime" TYPE TIMESTAMPTZ(6) USING "endTime" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "startTime" TYPE TIMESTAMPTZ(6) USING "startTime" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

-- Message Templates (2 columns)
ALTER TABLE message_templates 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

-- Organizations (2 columns)
ALTER TABLE organizations 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

-- Sessions (3 columns)
ALTER TABLE sessions 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN expires TYPE TIMESTAMPTZ(6) USING expires AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

-- SMS OTPs (3 columns)
ALTER TABLE sms_otps 
  ALTER COLUMN "consumedAt" TYPE TIMESTAMPTZ(6) USING "consumedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN expires TYPE TIMESTAMPTZ(6) USING expires AT TIME ZONE 'Asia/Kolkata';

-- System Settings (1 column)
ALTER TABLE system_settings 
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

-- Tsunami Alerts (3 columns)
ALTER TABLE tsunami_alerts 
  ALTER COLUMN "cancellationTime" TYPE TIMESTAMPTZ(6) USING "cancellationTime" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "estimatedArrivalTime" TYPE TIMESTAMPTZ(6) USING "estimatedArrivalTime" AT TIME ZONE 'Asia/Kolkata';

-- Users (5 columns)
ALTER TABLE users 
  ALTER COLUMN "approvedAt" TYPE TIMESTAMPTZ(6) USING "approvedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "emailVerified" TYPE TIMESTAMPTZ(6) USING "emailVerified" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "lastLoginAt" TYPE TIMESTAMPTZ(6) USING "lastLoginAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

-- Verification Tokens (3 columns)
ALTER TABLE verification_tokens 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN expires TYPE TIMESTAMPTZ(6) USING expires AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

-- Vessel Alerts (6 columns)
ALTER TABLE vessel_alerts 
  ALTER COLUMN "acknowledgedAt" TYPE TIMESTAMPTZ(6) USING "acknowledgedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ(6) USING "expiresAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "resolvedAt" TYPE TIMESTAMPTZ(6) USING "resolvedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "sentAt" TYPE TIMESTAMPTZ(6) USING "sentAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

-- Vessel Contacts (1 column)
ALTER TABLE vessel_contacts 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

-- Vessels (3 columns)
ALTER TABLE vessels 
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "lastSeen" TYPE TIMESTAMPTZ(6) USING "lastSeen" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt" AT TIME ZONE 'Asia/Kolkata';

-- Voice Calls (2 columns)
ALTER TABLE voice_calls 
  ALTER COLUMN "completedAt" TYPE TIMESTAMPTZ(6) USING "completedAt" AT TIME ZONE 'Asia/Kolkata',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'Asia/Kolkata';

-- Verification
SELECT 
  'Converted columns:' as info,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'timestamp with time zone';

-- Check for remaining TIMESTAMP columns
SELECT 
  'Remaining TIMESTAMP columns:' as info,
  COUNT(*) as remaining_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'timestamp without time zone';

COMMIT;

SELECT '🎉 ✅ ALL TIMESTAMPS CONVERTED TO TIMESTAMPTZ!' as result;
