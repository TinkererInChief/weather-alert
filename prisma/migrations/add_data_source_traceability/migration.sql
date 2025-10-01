-- Add data source traceability to AlertLog
ALTER TABLE "alert_logs" ADD COLUMN "dataSources" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "alert_logs" ADD COLUMN "primarySource" TEXT;
ALTER TABLE "alert_logs" ADD COLUMN "sourceMetadata" JSONB DEFAULT '{}'::JSONB;

-- Add comments for documentation
COMMENT ON COLUMN "alert_logs"."dataSources" IS 'Array of data sources (USGS, EMSC, JMA, NOAA, PTWC) that contributed to this alert';
COMMENT ON COLUMN "alert_logs"."primarySource" IS 'Primary data source for this alert';
COMMENT ON COLUMN "alert_logs"."sourceMetadata" IS 'Additional source-specific metadata';

-- Create index for faster source queries
CREATE INDEX IF NOT EXISTS "alert_logs_primarySource_idx" ON "alert_logs"("primarySource");
CREATE INDEX IF NOT EXISTS "alert_logs_dataSources_idx" ON "alert_logs" USING GIN("dataSources");
