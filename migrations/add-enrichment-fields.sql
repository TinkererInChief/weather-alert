-- Add enrichment fields to vessels table
ALTER TABLE vessels ADD COLUMN IF NOT EXISTS height DOUBLE PRECISION;
ALTER TABLE vessels ADD COLUMN IF NOT EXISTS build_year INTEGER;
ALTER TABLE vessels ADD COLUMN IF NOT EXISTS manager TEXT;
ALTER TABLE vessels ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE vessels ADD COLUMN IF NOT EXISTS enrichment_source TEXT;

-- Add comments for documentation
COMMENT ON COLUMN vessels.height IS 'meters (for bridge clearance)';
COMMENT ON COLUMN vessels.build_year IS 'year vessel was built';
COMMENT ON COLUMN vessels.manager IS 'ship management company';
COMMENT ON COLUMN vessels.enriched_at IS 'when external data was last fetched';
COMMENT ON COLUMN vessels.enrichment_source IS 'equasis, vesselfinder, manual';

-- Add voyage-specific fields to vessel_positions table
-- Adding nullable columns is safe even with compression enabled
ALTER TABLE vessel_positions ADD COLUMN IF NOT EXISTS captain TEXT;
ALTER TABLE vessel_positions ADD COLUMN IF NOT EXISTS rate_of_turn DOUBLE PRECISION;
ALTER TABLE vessel_positions ADD COLUMN IF NOT EXISTS position_accuracy BOOLEAN;

-- Add comments for documentation
COMMENT ON COLUMN vessel_positions.captain IS 'Current master/captain (voyage-specific)';
COMMENT ON COLUMN vessel_positions.rate_of_turn IS 'degrees per minute (collision risk indicator)';
COMMENT ON COLUMN vessel_positions.position_accuracy IS 'true = high accuracy (<10m), false = low accuracy';
