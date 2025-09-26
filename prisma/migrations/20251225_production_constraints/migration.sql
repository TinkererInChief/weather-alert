-- Production Database Constraints and Indexes for Performance and Security
-- This migration adds critical constraints and indexes for production readiness

-- Add performance indexes for frequently queried columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_phone_active ON contacts(phone) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_notification_channels ON contacts USING GIN(notification_channels);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_coastal_resident ON contacts(is_coastal_resident) WHERE is_coastal_resident = true;

-- Indexes for SMS OTP table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_otps_phone_active ON sms_otps(phone) WHERE consumed_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sms_otps_expires ON sms_otps(expires) WHERE consumed_at IS NULL;

-- Indexes for earthquake events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_earthquake_events_occurred_at ON earthquake_events(occurred_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_earthquake_events_magnitude ON earthquake_events(magnitude DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_earthquake_events_location ON earthquake_events USING GIN(to_tsvector('english', location));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_earthquake_events_processed ON earthquake_events(processed, occurred_at DESC);

-- Spatial indexes for earthquake location queries (if PostGIS is available)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_earthquake_events_location_gist ON earthquake_events USING GIST(ST_Point(longitude, latitude));

-- Indexes for tsunami alerts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_created_at ON tsunami_alerts(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_severity ON tsunami_alerts(severity_level DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_affected_zones ON tsunami_alerts USING GIN(affected_zones);

-- Indexes for alert jobs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_jobs_status_priority ON alert_jobs(status, priority DESC, scheduled_for);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_jobs_created_at ON alert_jobs(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_jobs_type_severity ON alert_jobs(type, severity DESC);

-- Indexes for delivery logs (critical for monitoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_alert_job_id ON delivery_logs(alert_job_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_contact_id ON delivery_logs(contact_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_status_channel ON delivery_logs(status, channel);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_created_at ON delivery_logs(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_logs_sent_at ON delivery_logs(sent_at DESC) WHERE sent_at IS NOT NULL;

-- Indexes for audit logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id);

-- Indexes for voice calls
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voice_calls_status ON voice_calls(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voice_calls_created_at ON voice_calls(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voice_calls_phone_number ON voice_calls(phone_number);

-- Add constraints for data integrity
-- Ensure phone numbers are properly formatted
ALTER TABLE contacts ADD CONSTRAINT check_phone_format 
    CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{1,14}$');

ALTER TABLE sms_otps ADD CONSTRAINT check_phone_format_otp 
    CHECK (phone ~ '^\+[1-9]\d{1,14}$');

-- Ensure OTP attempts are reasonable
ALTER TABLE sms_otps ADD CONSTRAINT check_otp_attempts 
    CHECK (attempts >= 0 AND attempts <= 10);

-- Ensure severity levels are within valid range
ALTER TABLE alert_jobs ADD CONSTRAINT check_severity_range 
    CHECK (severity >= 1 AND severity <= 5);

ALTER TABLE tsunami_alerts ADD CONSTRAINT check_tsunami_severity_range 
    CHECK (severity_level >= 1 AND severity_level <= 5);

-- Ensure priority levels are valid
ALTER TABLE alert_jobs ADD CONSTRAINT check_priority_range 
    CHECK (priority >= 1 AND priority <= 10);

-- Ensure earthquake magnitude is reasonable
ALTER TABLE earthquake_events ADD CONSTRAINT check_magnitude_range 
    CHECK (magnitude >= 0 AND magnitude <= 10.0);

-- Ensure earthquake depth is reasonable (can be negative for very shallow quakes)
ALTER TABLE earthquake_events ADD CONSTRAINT check_depth_range 
    CHECK (depth IS NULL OR (depth >= -10 AND depth <= 1000));

-- Ensure latitude/longitude are valid
ALTER TABLE earthquake_events ADD CONSTRAINT check_latitude_range 
    CHECK (latitude >= -90 AND latitude <= 90);

ALTER TABLE earthquake_events ADD CONSTRAINT check_longitude_range 
    CHECK (longitude >= -180 AND longitude <= 180);

-- Ensure contact elevation is reasonable
ALTER TABLE contacts ADD CONSTRAINT check_elevation_range 
    CHECK (elevation_meters IS NULL OR (elevation_meters >= -500 AND elevation_meters <= 10000));

-- Add partial unique indexes for active contacts
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_phone_unique_active 
    ON contacts(phone) WHERE active = true AND phone IS NOT NULL;

-- Ensure OTP tokens are not empty
ALTER TABLE sms_otps ADD CONSTRAINT check_token_not_empty 
    CHECK (length(token_hash) > 0);

-- Ensure expiry dates are in the future when created
-- (Note: This is checked in application logic rather than DB constraint as it would prevent historical data)

-- Add check constraints for status fields
ALTER TABLE alert_jobs ADD CONSTRAINT check_alert_job_status 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

ALTER TABLE delivery_logs ADD CONSTRAINT check_delivery_status 
    CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'bounced', 'cancelled'));

ALTER TABLE earthquake_events ADD CONSTRAINT check_earthquake_status 
    CHECK (status IN ('active', 'updated', 'cancelled', 'superseded'));

-- Add check constraints for channel types
ALTER TABLE delivery_logs ADD CONSTRAINT check_channel_type 
    CHECK (channel IN ('sms', 'email', 'whatsapp', 'voice', 'push'));

-- Add check constraints for alert types
ALTER TABLE alert_jobs ADD CONSTRAINT check_alert_type 
    CHECK (type IN ('earthquake', 'tsunami', 'test', 'cancel', 'update'));

ALTER TABLE earthquake_events ADD CONSTRAINT check_event_type 
    CHECK (source IN ('usgs', 'emsc', 'jma', 'manual', 'test'));

-- Performance optimization: Update table statistics
ANALYZE contacts;
ANALYZE sms_otps;
ANALYZE earthquake_events;
ANALYZE tsunami_alerts;
ANALYZE alert_jobs;
ANALYZE delivery_logs;
ANALYZE audit_logs;
ANALYZE voice_calls;

-- Add comments for documentation
COMMENT ON INDEX idx_contacts_phone_active IS 'Fast lookup of active contacts by phone number';
COMMENT ON INDEX idx_delivery_logs_status_channel IS 'Monitor delivery success rates by channel';
COMMENT ON INDEX idx_alert_jobs_status_priority IS 'Queue processing optimization';
COMMENT ON INDEX idx_earthquake_events_occurred_at IS 'Recent earthquake queries';

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for automatic timestamp updates where missing
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_earthquake_events_updated_at BEFORE UPDATE ON earthquake_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
