-- Week 1: Fleet Management System
-- Safe migration that only adds new tables and columns

-- 1. Add new columns to vessel_contacts (for escalation system)
ALTER TABLE vessel_contacts 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS notify_on TEXT[] DEFAULT ARRAY['critical', 'high'];

-- Create index on priority
CREATE INDEX IF NOT EXISTS idx_vessel_contacts_priority ON vessel_contacts(priority);

-- 2. Create fleets table
CREATE TABLE IF NOT EXISTS fleets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fleets
CREATE INDEX IF NOT EXISTS idx_fleets_owner_id ON fleets(owner_id);
CREATE INDEX IF NOT EXISTS idx_fleets_active ON fleets(active);

-- 3. Create fleet_vessels junction table
CREATE TABLE IF NOT EXISTS fleet_vessels (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fleet_id TEXT NOT NULL,
  vessel_id TEXT NOT NULL,
  role TEXT DEFAULT 'primary',
  priority INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_fleet FOREIGN KEY (fleet_id) REFERENCES fleets(id) ON DELETE CASCADE,
  CONSTRAINT fk_vessel FOREIGN KEY (vessel_id) REFERENCES vessels(id) ON DELETE CASCADE,
  CONSTRAINT unique_fleet_vessel UNIQUE (fleet_id, vessel_id)
);

-- Create indexes for fleet_vessels
CREATE INDEX IF NOT EXISTS idx_fleet_vessels_fleet_id ON fleet_vessels(fleet_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vessels_vessel_id ON fleet_vessels(vessel_id);

-- Verify installation
SELECT 
  'fleets' as table_name, 
  COUNT(*) as row_count 
FROM fleets
UNION ALL
SELECT 
  'fleet_vessels' as table_name, 
  COUNT(*) as row_count 
FROM fleet_vessels;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Fleet management tables created successfully!';
  RAISE NOTICE 'Next step: Run "npx prisma generate" to update Prisma client';
END $$;
