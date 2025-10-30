-- Remaining Performance Indexes with correct column names
-- October 31, 2024

-- Alert Logs - earthquake ID index (camelCase)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_logs_earthquake_id 
ON alert_logs("earthquakeId");

-- Vessel Positions - correct column names
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_positions_vessel_id_timestamp 
ON vessel_positions("vesselId", timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_positions_created_at 
ON vessel_positions("createdAt" DESC);

-- Vessels - updated_at index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessels_updated_at 
ON vessels("updatedAt" DESC);

-- Tsunami Alerts - correct column names
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_issue_time 
ON tsunami_alerts("issueTime" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_created_at 
ON tsunami_alerts("createdAt" DESC);

-- Delivery Logs - created_at index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_created_at 
ON delivery_logs("createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_status_channel_time 
ON delivery_logs(status, channel, "createdAt" DESC);

-- Audit Logs - correct column names
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at 
ON audit_logs("createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id_created 
ON audit_logs("userId", "createdAt" DESC);

-- Vessel Alerts - correct column names
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_alerts_created_at 
ON vessel_alerts("createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_alerts_vessel_id 
ON vessel_alerts("vesselId");

-- Sessions - session_token index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_session_token 
ON sessions("sessionToken");

-- Alert Jobs - created_at index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_jobs_created_at 
ON alert_jobs("createdAt" DESC);

-- Check which indexes were created
SELECT 'All remaining performance indexes created!' as status;

-- Verify index creation
SELECT 
    schemaname,
    tablename, 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
