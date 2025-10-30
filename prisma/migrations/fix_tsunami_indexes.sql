-- Fix tsunami_alerts indexes (issueTime doesn't exist)
-- Add indexes for actual columns

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_event_id 
ON tsunami_alerts("eventId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_severity_level 
ON tsunami_alerts("severityLevel" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_alert_type 
ON tsunami_alerts("alertType");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tsunami_alerts_estimated_arrival 
ON tsunami_alerts("estimatedArrivalTime") 
WHERE "estimatedArrivalTime" IS NOT NULL;
