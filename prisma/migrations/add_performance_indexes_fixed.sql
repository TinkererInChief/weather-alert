-- Performance Optimization: Phase 2 Database Indexes (Fixed for snake_case)
-- Created: October 31, 2024
-- Purpose: Add indexes for frequently queried columns to improve query performance

-- Alert Logs Performance Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_logs_timestamp_desc 
ON alert_logs(timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_logs_magnitude 
ON alert_logs(magnitude);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_logs_earthquake_id 
ON alert_logs(earthquake_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_logs_success 
ON alert_logs(success);

-- Composite index for common query patterns (timestamp + magnitude)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_logs_timestamp_magnitude 
ON alert_logs(timestamp DESC, magnitude DESC);

-- Composite index for filtering by success and time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_logs_success_timestamp 
ON alert_logs(success, timestamp DESC);

-- Vessel Position Performance Indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_positions_timestamp_desc 
ON vessel_positions(timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_positions_vessel_id_timestamp 
ON vessel_positions(vessel_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_positions_created_at 
ON vessel_positions(created_at DESC);

-- Vessel Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessels_mmsi 
ON vessels(mmsi);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessels_updated_at 
ON vessels(updated_at DESC);

-- Contact Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_active 
ON contacts(active) WHERE active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_phone_active 
ON contacts(phone, active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_email_active 
ON contacts(email, active);

-- Tsunami Alert Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_issue_time 
ON tsunami_alerts(issue_time DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_active 
ON tsunami_alerts(active) WHERE active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_created_at 
ON tsunami_alerts(created_at DESC);

-- Delivery Log Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_created_at 
ON delivery_logs(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_status 
ON delivery_logs(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_channel 
ON delivery_logs(channel);

-- Composite index for delivery log queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_status_channel_time 
ON delivery_logs(status, channel, created_at DESC);

-- Audit Log Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at 
ON audit_logs(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id_created 
ON audit_logs(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action 
ON audit_logs(action);

-- Vessel Alert Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_alerts_created_at 
ON vessel_alerts(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_alerts_vessel_id 
ON vessel_alerts(vessel_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vessel_alerts_status 
ON vessel_alerts(status);

-- Session Indexes (for faster auth lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires 
ON sessions(expires);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_session_token 
ON sessions(session_token);

-- Alert Job Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_jobs_created_at 
ON alert_jobs(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_jobs_status 
ON alert_jobs(status);

-- Notification Indexes (if table exists)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read 
-- ON notifications(user_id, is_read, created_at DESC);

-- Monitoring Status Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monitoring_status_created_at 
ON monitoring_status(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_monitoring_status_created_at 
ON tsunami_monitoring_status(created_at DESC);

-- Success message
SELECT 'Performance indexes created successfully!' as status;
