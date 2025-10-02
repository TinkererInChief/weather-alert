-- Resolve Failed Migration
-- This marks the failed migration as completed since the columns already exist

-- Update the failed migration to mark it as completed
UPDATE "_prisma_migrations"
SET 
    finished_at = NOW(),
    logs = NULL
WHERE migration_name = 'add_data_source_traceability'
    AND finished_at IS NULL;

-- Verify the migration is now marked as completed
SELECT 
    migration_name,
    started_at,
    finished_at,
    CASE 
        WHEN finished_at IS NOT NULL THEN 'Completed ✅'
        ELSE 'Failed ❌'
    END as status
FROM "_prisma_migrations"
WHERE migration_name = 'add_data_source_traceability';

-- Verify the columns exist
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'alert_logs' 
    AND column_name IN ('dataSources', 'primarySource', 'sourceMetadata')
ORDER BY column_name;
