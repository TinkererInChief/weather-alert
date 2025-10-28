-- Fix timestamp columns to include timezone information
-- This resolves the 5.5-hour offset issue in real-time queries

-- Convert createdAt to timestamptz
ALTER TABLE "vessel_positions" 
  ALTER COLUMN "createdAt" TYPE timestamptz USING "createdAt" AT TIME ZONE 'UTC';

-- Convert timestamp to timestamptz  
ALTER TABLE "vessel_positions"
  ALTER COLUMN "timestamp" TYPE timestamptz USING "timestamp" AT TIME ZONE 'UTC';

-- Convert eta to timestamptz
ALTER TABLE "vessel_positions"
  ALTER COLUMN "eta" TYPE timestamptz USING "eta" AT TIME ZONE 'UTC';

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: timestamp columns converted to timestamptz';
END $$;
