-- Production-safe concurrent index creation
-- IMPORTANT: Run this script outside of a transaction. Do NOT wrap with BEGIN/COMMIT.
-- Example:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/production_indexes.sql

--
-- NOTE: This project uses Prisma default column names (camelCase) with quoted identifiers
--       because only table names are mapped via @@map. Therefore, indexes below use
--       quoted CamelCase columns (e.g. "alertJobId") rather than snake_case.
--

-- ===== Delivery logs (critical for monitoring and UI) =====
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_alert_job_id ON delivery_logs("alertJobId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_contact_id ON delivery_logs("contactId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_status_channel ON delivery_logs("status", "channel");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_created_at ON delivery_logs("createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_sent_at ON delivery_logs("sentAt" DESC) WHERE "sentAt" IS NOT NULL;

-- ===== Alert jobs =====
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_jobs_status_priority ON alert_jobs("status", "priority" DESC, "scheduledFor");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_jobs_created_at ON alert_jobs("createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_jobs_type_severity ON alert_jobs("type", "severity" DESC);

-- ===== Audit logs =====
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs("createdAt" DESC);

-- ===== OTP / Authentication helpers =====
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_otps_phone_active ON sms_otps("phone") WHERE "consumedAt" IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_otps_expires ON sms_otps("expires") WHERE "consumedAt" IS NULL;

-- ===== Earthquake events =====
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_earthquake_events_occurred_at ON earthquake_events("occurredAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_earthquake_events_magnitude ON earthquake_events("magnitude" DESC);

-- ===== Tsunami alerts =====
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_created_at ON tsunami_alerts("createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_severity ON tsunami_alerts("severityLevel" DESC);

-- Optional JSON/GIN indexes (uncomment if needed and supported by your Postgres version)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_notification_channels ON contacts USING GIN("notificationChannels");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_notification_settings ON contacts USING GIN("notificationSettings");

-- NOTE: We intentionally do NOT create a partial unique index on contacts(phone) because the schema
-- already has a global UNIQUE constraint on phone. Adding a partial unique could be redundant.
