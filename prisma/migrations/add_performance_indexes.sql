-- Performance Optimization: Phase 2 Database Indexes
-- Created: October 31, 2024
-- Purpose: Add indexes for frequently queried columns to improve query performance

-- Alert Logs Performance Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_logs_timestamp_desc 
ON "AlertLog"("timestamp" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_logs_magnitude 
ON "AlertLog"("magnitude");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_logs_earthquake_id 
ON "AlertLog"("earthquakeId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_logs_success 
ON "AlertLog"("success");

-- Composite index for common query patterns (timestamp + magnitude)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_logs_timestamp_magnitude 
ON "AlertLog"("timestamp" DESC, "magnitude" DESC);

-- Composite index for filtering by success and time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_logs_success_timestamp 
ON "AlertLog"("success", "timestamp" DESC);

-- Vessel Position Performance Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_positions_timestamp_desc 
ON "VesselPosition"("timestamp" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_positions_vessel_id_timestamp 
ON "VesselPosition"("vesselId", "timestamp" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_positions_created_at 
ON "VesselPosition"("createdAt" DESC);

-- Vessel Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessels_mmsi 
ON "Vessel"("mmsi");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessels_updated_at 
ON "Vessel"("updatedAt" DESC);

-- Contact Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_active 
ON "Contact"("active") WHERE "active" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_phone_active 
ON "Contact"("phone", "active");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_email_active 
ON "Contact"("email", "active");

-- Composite index for contact search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_name_trgm 
ON "Contact" USING gin("name" gin_trgm_ops);

-- Tsunami Alert Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_issue_time 
ON "TsunamiAlert"("issueTime" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_active 
ON "TsunamiAlert"("active") WHERE "active" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_created_at 
ON "TsunamiAlert"("createdAt" DESC);

-- Delivery Log Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_created_at 
ON "DeliveryLog"("createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_status 
ON "DeliveryLog"("status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_channel 
ON "DeliveryLog"("channel");

-- Composite index for delivery log queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_status_channel_time 
ON "DeliveryLog"("status", "channel", "createdAt" DESC);

-- Audit Log Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at 
ON "AuditLog"("createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id_created 
ON "AuditLog"("userId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action 
ON "AuditLog"("action");

-- Vessel Alert Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_alerts_created_at 
ON "VesselAlert"("createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_alerts_vessel_id 
ON "VesselAlert"("vesselId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_alerts_status 
ON "VesselAlert"("status");

-- Session Indexes (for faster auth lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires 
ON "Session"("expires");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_session_token 
ON "Session"("sessionToken");

-- Alert Job Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_jobs_created_at 
ON "AlertJob"("createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_jobs_status 
ON "AlertJob"("status");

-- Notification Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read 
ON "Notification"("userId", "isRead", "createdAt" DESC);

-- Performance analysis query (run after index creation)
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- Check index sizes
-- SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid::regclass)) as index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY pg_relation_size(indexrelid::regclass) DESC;
