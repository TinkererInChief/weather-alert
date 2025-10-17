# TimescaleDB Setup on Railway

## Version Information

### Railway's TimescaleDB Version

Railway's Postgres includes **TimescaleDB 2.x** (latest stable) as an available extension.

To check the exact version available on your Railway instance:

```sql
-- Connect to Railway Postgres
railway connect

-- Check TimescaleDB version
SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';

-- Or get detailed version info after enabling
SELECT * FROM timescaledb_information.version;
```

### Recommended Version: **TimescaleDB 2.x (Latest)**

**Why 2.x:**
- ✅ Compression (75% storage savings) - **Critical for our use case**
- ✅ Continuous aggregates (automatic downsampling)
- ✅ Retention policies (automatic cleanup)
- ✅ Production-ready and stable
- ✅ Best performance for time-series queries

**Version compatibility:**
- PostgreSQL 12+: TimescaleDB 2.0+
- PostgreSQL 14: TimescaleDB 2.6+ (recommended)
- PostgreSQL 15: TimescaleDB 2.10+

Railway typically runs **PostgreSQL 14 or 15**, so you'll get **TimescaleDB 2.10+**.

---

## Installation Steps

### Step 1: Check Current Postgres Version

```sql
-- Check your Postgres version
SELECT version();

-- Example output:
-- PostgreSQL 15.4 on x86_64-pc-linux-gnu, compiled by gcc
```

### Step 2: Enable TimescaleDB Extension

```sql
-- Enable the extension (installs latest available version)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Verify installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';

-- Expected output:
-- extname      | extversion
-- timescaledb  | 2.13.0 (or similar 2.x version)
```

### Step 3: Verify TimescaleDB Features

```sql
-- Check available features
SELECT * FROM timescaledb_information.version;

-- Output shows:
-- version: 2.13.0
-- edition: Apache (open source)
-- build_platform: linux-amd64
```

---

## Version-Specific Features

### TimescaleDB 2.0+ (All Railway versions)

**Compression** ✅
```sql
ALTER TABLE vessel_positions SET (timescaledb.compress);
```

**Retention Policies** ✅
```sql
SELECT add_retention_policy('vessel_positions', INTERVAL '7 days');
```

**Continuous Aggregates** ✅
```sql
CREATE MATERIALIZED VIEW vessel_positions_5min
WITH (timescaledb.continuous) AS
  SELECT time_bucket('5 minutes', timestamp) AS bucket, ...;
```

### TimescaleDB 2.10+ (Recommended)

All 2.0 features PLUS:

**Better Compression** ✅
- Improved algorithms
- 80% compression ratios (vs 75% in 2.0)

**Hierarchical Continuous Aggregates** ✅
```sql
-- Create 5-min aggregate from raw data
CREATE MATERIALIZED VIEW positions_5min ...

-- Create 1-hour aggregate from 5-min (faster!)
CREATE MATERIALIZED VIEW positions_1hour 
WITH (timescaledb.continuous) AS
  SELECT time_bucket('1 hour', bucket) ... 
  FROM positions_5min;
```

**Improved Performance**
- 30-50% faster ingestion
- 40% faster queries on compressed data

---

## Our Setup (Recommended Configuration)

### For Railway Postgres 14/15 with TimescaleDB 2.10+

```sql
-- 1. Enable extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2. Convert table to hypertable
SELECT create_hypertable(
  'vessel_positions',
  'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- 3. Enable compression (TimescaleDB 2.0+)
ALTER TABLE vessel_positions SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'vessel_id',
  timescaledb.compress_orderby = 'timestamp DESC'
);

-- 4. Compress chunks older than 2 days
SELECT add_compression_policy(
  'vessel_positions',
  INTERVAL '2 days'
);

-- 5. Delete data older than 7 days
SELECT add_retention_policy(
  'vessel_positions',
  INTERVAL '7 days'
);

-- 6. Create continuous aggregate for 5-min samples
CREATE MATERIALIZED VIEW vessel_positions_5min
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('5 minutes', timestamp) AS bucket,
  vessel_id,
  FIRST(latitude, timestamp) as latitude,
  FIRST(longitude, timestamp) as longitude,
  AVG(speed) as avg_speed,
  FIRST(heading, timestamp) as heading
FROM vessel_positions
GROUP BY bucket, vessel_id
WITH NO DATA;

-- 7. Enable automatic refresh for continuous aggregate
SELECT add_continuous_aggregate_policy(
  'vessel_positions_5min',
  start_offset => INTERVAL '1 day',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
```

---

## Migration from Vanilla Postgres

If you already have data in a regular Postgres table:

### Option A: In-Place Migration (Recommended for < 1M rows)

```sql
-- 1. Enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2. Convert existing table to hypertable
SELECT create_hypertable(
  'vessel_positions',
  'timestamp',
  migrate_data => TRUE,  -- Migrate existing data
  chunk_time_interval => INTERVAL '1 day'
);

-- 3. Enable compression and policies (as above)
```

**Time estimate:**
- < 100K rows: 1-2 minutes
- 100K-1M rows: 5-10 minutes
- 1M-10M rows: 30-60 minutes

### Option B: Create New Table and Migrate (For > 1M rows)

```sql
-- 1. Rename old table
ALTER TABLE vessel_positions RENAME TO vessel_positions_old;

-- 2. Create new hypertable
CREATE TABLE vessel_positions (
  id UUID DEFAULT gen_random_uuid(),
  vessel_id VARCHAR NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  speed DECIMAL(5,2),
  course DECIMAL(5,2),
  heading INT,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Convert to hypertable
SELECT create_hypertable('vessel_positions', 'timestamp');

-- 4. Copy data in chunks
INSERT INTO vessel_positions 
SELECT * FROM vessel_positions_old
WHERE timestamp >= NOW() - INTERVAL '7 days';

-- 5. Drop old table when done
DROP TABLE vessel_positions_old;
```

---

## Verifying Everything Works

### Check Hypertable Status

```sql
SELECT * FROM timescaledb_information.hypertables
WHERE hypertable_name = 'vessel_positions';

-- Should show:
-- hypertable_name: vessel_positions
-- num_chunks: varies
-- compression_enabled: true
```

### Check Compression Stats

```sql
SELECT 
  chunk_name,
  compression_status,
  before_compression_total_bytes,
  after_compression_total_bytes,
  ROUND(
    100 * (1 - after_compression_total_bytes::numeric / 
    before_compression_total_bytes::numeric), 2
  ) as compression_ratio_pct
FROM timescaledb_information.compressed_chunk_stats
ORDER BY chunk_name DESC;

-- Expected: 70-80% compression ratio
```

### Check Retention Policy

```sql
SELECT * FROM timescaledb_information.jobs
WHERE proc_name = 'policy_retention';

-- Should show: 
-- schedule_interval: 1 day
-- config: {"drop_after": "7 days"}
```

### Test Query Performance

```sql
-- Query last 24 hours (should be fast even with millions of rows)
EXPLAIN ANALYZE
SELECT vessel_id, timestamp, latitude, longitude
FROM vessel_positions
WHERE timestamp >= NOW() - INTERVAL '1 day'
ORDER BY timestamp DESC
LIMIT 1000;

-- Should show:
-- Execution Time: < 50ms for millions of rows
```

---

## Monitoring TimescaleDB

### Storage Usage

```sql
SELECT 
  hypertable_name,
  pg_size_pretty(
    hypertable_size(format('%I.%I', hypertable_schema, hypertable_name)::regclass)
  ) as total_size,
  pg_size_pretty(
    hypertable_size(
      format('%I.%I', hypertable_schema, hypertable_name)::regclass,
      'compressed'
    )
  ) as compressed_size
FROM timescaledb_information.hypertables
WHERE hypertable_name = 'vessel_positions';
```

### Chunk Information

```sql
SELECT 
  chunk_name,
  range_start,
  range_end,
  is_compressed,
  pg_size_pretty(total_bytes) as size
FROM timescaledb_information.chunks
WHERE hypertable_name = 'vessel_positions'
ORDER BY range_start DESC
LIMIT 10;
```

### Background Job Status

```sql
SELECT 
  job_id,
  proc_name,
  last_run_status,
  next_start,
  total_runs,
  total_successes,
  total_failures
FROM timescaledb_information.jobs
WHERE hypertable_name = 'vessel_positions';
```

---

## Common Issues & Solutions

### Issue 1: Extension Not Available

**Error:** `ERROR: extension "timescaledb" is not available`

**Solution:** 
```sql
-- Check if extension files exist
SELECT * FROM pg_available_extensions WHERE name = 'timescaledb';

-- If not available, Railway support can enable it
-- Or upgrade to latest Railway Postgres version
```

### Issue 2: Can't Convert Existing Table

**Error:** `ERROR: table "vessel_positions" is already partitioned`

**Solution:**
```sql
-- Check if already a hypertable
SELECT * FROM timescaledb_information.hypertables 
WHERE hypertable_name = 'vessel_positions';

-- If it's already a hypertable, just configure policies
```

### Issue 3: Compression Not Working

**Error:** No compression happening despite policy

**Solution:**
```sql
-- Manually compress a chunk to test
SELECT compress_chunk('_timescaledb_internal._hyper_1_1_chunk');

-- Check if compression job is running
SELECT * FROM timescaledb_information.jobs
WHERE proc_name = 'policy_compression';

-- Manually run compression job
CALL run_job(
  (SELECT job_id FROM timescaledb_information.jobs 
   WHERE proc_name = 'policy_compression' LIMIT 1)
);
```

---

## Version Compatibility Matrix

| PostgreSQL | TimescaleDB | Compression | Continuous Aggregates | Recommended |
|------------|-------------|-------------|----------------------|-------------|
| 12.x | 2.0-2.9 | ✅ | ✅ | 🟡 |
| 13.x | 2.0-2.11 | ✅ | ✅ | 🟡 |
| 14.x | 2.6-2.13 | ✅ Enhanced | ✅ Hierarchical | ✅ |
| 15.x | 2.10-2.13 | ✅ Enhanced | ✅ Hierarchical | ✅ |

**Railway default:** PostgreSQL 15.x with TimescaleDB 2.11+

---

## Summary

### For Your Railway Setup

**Version:** TimescaleDB 2.11+ (automatically installed)

**How to enable:**
```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

**How to verify:**
```sql
SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';
-- Should return: 2.11.x or 2.12.x or 2.13.x
```

**What you get:**
- ✅ 75-80% compression
- ✅ Automatic retention
- ✅ Continuous aggregates
- ✅ Production-ready performance
- ✅ All features needed for vessel tracking

**No version management needed:** Railway handles updates automatically!

---

## Quick Start Command

```bash
# Connect to Railway Postgres
railway connect

# Then run:
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
SELECT create_hypertable('vessel_positions', 'timestamp', if_not_exists => TRUE);
ALTER TABLE vessel_positions SET (timescaledb.compress);
SELECT add_compression_policy('vessel_positions', INTERVAL '2 days');
SELECT add_retention_policy('vessel_positions', INTERVAL '7 days');

# Done! 🎉
```

Railway will use whatever TimescaleDB version is bundled with your Postgres (typically 2.11+ for Postgres 15), which is perfect for your needs.
