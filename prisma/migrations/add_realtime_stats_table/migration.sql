-- Create a table to store pre-computed real-time statistics
-- This table is updated by a background job every 30 seconds
CREATE TABLE IF NOT EXISTS "realtime_stats" (
  "id" TEXT PRIMARY KEY DEFAULT 'singleton',
  "positions_last_hour" INTEGER NOT NULL DEFAULT 0,
  "positions_last_15min" INTEGER NOT NULL DEFAULT 0,
  "vessels_active_last_hour" INTEGER NOT NULL DEFAULT 0,
  "total_vessels" INTEGER NOT NULL DEFAULT 0,
  "total_positions_estimate" BIGINT NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton_check CHECK (id = 'singleton')
);

-- Insert initial row
INSERT INTO "realtime_stats" (id) VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

-- Create index on updated_at for freshness checks
CREATE INDEX IF NOT EXISTS idx_realtime_stats_updated_at 
ON "realtime_stats" (updated_at);
