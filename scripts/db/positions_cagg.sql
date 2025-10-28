-- TimescaleDB continuous aggregate for vessel positions per 5 minutes
-- NOTE: Requires TimescaleDB extension and hypertable on vessel_positions.
-- Run as a superuser or a user with appropriate privileges.

-- 1) Ensure extension (safe if already installed)
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2) Convert to hypertable (safe to run; does nothing if already hypertable)
-- SELECT create_hypertable('vessel_positions', 'timestamp', if_not_exists => TRUE);

-- 3) Continuous aggregate view
CREATE MATERIALIZED VIEW IF NOT EXISTS positions_5m
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('5 minutes', "timestamp") AS bucket,
  COUNT(*) AS positions,
  COUNT(DISTINCT "vesselId") AS unique_vessels
FROM "vessel_positions"
GROUP BY bucket;

-- 4) Refresh policy: recompute every minute, looking back 2 hours
SELECT add_continuous_aggregate_policy(
  'positions_5m',
  start_offset => INTERVAL '2 hours',
  end_offset   => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute'
);

-- Usage example:
-- SELECT bucket AS t, positions, unique_vessels FROM positions_5m WHERE bucket >= NOW() - INTERVAL '24 hours' ORDER BY t;
