-- Add data source traceability to AlertLog
-- Use IF NOT EXISTS to make migration idempotent
DO $$ 
BEGIN
    -- Add dataSources column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'alert_logs' AND column_name = 'dataSources'
    ) THEN
        ALTER TABLE "alert_logs" ADD COLUMN "dataSources" TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    -- Add primarySource column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'alert_logs' AND column_name = 'primarySource'
    ) THEN
        ALTER TABLE "alert_logs" ADD COLUMN "primarySource" TEXT;
    END IF;

    -- Add sourceMetadata column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'alert_logs' AND column_name = 'sourceMetadata'
    ) THEN
        ALTER TABLE "alert_logs" ADD COLUMN "sourceMetadata" JSONB DEFAULT '{}'::JSONB;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN "alert_logs"."dataSources" IS 'Array of data sources (USGS, EMSC, JMA, NOAA, PTWC) that contributed to this alert';
COMMENT ON COLUMN "alert_logs"."primarySource" IS 'Primary data source for this alert';
COMMENT ON COLUMN "alert_logs"."sourceMetadata" IS 'Additional source-specific metadata';

-- Create indexes for faster source queries (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "alert_logs_primarySource_idx" ON "alert_logs"("primarySource");
CREATE INDEX IF NOT EXISTS "alert_logs_dataSources_idx" ON "alert_logs" USING GIN("dataSources");
