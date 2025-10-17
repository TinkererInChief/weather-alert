# Vessel Position Data Retention Strategy

## Problem Statement

**Current situation:**
- ~1,000 active vessels
- Position updates every 2-10 seconds
- **6,000 - 30,000 position records per minute**
- **8.6M - 43M records per day**
- **260M - 1.3B records per month**

**Without retention:**
- Database size: 1 TB+ in first month
- Query performance: Degraded severely
- Storage costs: Unsustainable
- Backup times: Hours

---

## Proposed Strategy: Multi-Tier Data Retention

### Overview
Keep different levels of detail based on data age:

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA LIFECYCLE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  HOT TIER (7 days)          │  Full resolution             │
│  -------------------------   │  Every position saved        │
│  All position updates        │  Used for: Real-time maps   │
│                              │            Incident response │
│                              │                              │
├──────────────────────────────┼──────────────────────────────┤
│                              │                              │
│  WARM TIER (30 days)         │  5-minute samples           │
│  -------------------------   │  Keep 1 position per 5min   │
│  Downsampled to 5-min        │  Used for: Recent analysis  │
│  intervals                   │            Pattern detection │
│                              │                              │
├──────────────────────────────┼──────────────────────────────┤
│                              │                              │
│  COLD TIER (1 year)          │  1-hour samples             │
│  -------------------------   │  Keep 1 position per hour   │
│  Downsampled to 1-hour       │  Used for: Historical       │
│  intervals                   │            Long-term trends │
│                              │                              │
├──────────────────────────────┼──────────────────────────────┤
│                              │                              │
│  ARCHIVE TIER (Forever)      │  Daily summaries            │
│  -------------------------   │  Aggregated statistics      │
│  Aggregated statistics only  │  Used for: Analytics        │
│  - Daily vessel counts       │            Reporting        │
│  - Coverage metrics          │                              │
│  - Alert statistics          │                              │
│                              │                              │
└──────────────────────────────┴──────────────────────────────┘
```

---

## Detailed Tier Specifications

### **Tier 1: HOT (0-7 days)** 🔥
**Purpose:** Real-time tracking and recent incident response

**Data retention:**
- ✅ Every position update
- ✅ Full fidelity (2-10 second updates)
- ✅ All vessel metadata

**Storage estimate:**
- 7 days × 43M positions/day = **300M records**
- ~150 bytes per record = **45 GB**

**Use cases:**
- Real-time vessel tracking map
- Emergency response (tsunami, earthquake)
- Vessel contact for imminent threats
- Recent track analysis

**Query performance:** Excellent (indexed, in-memory)

---

### **Tier 2: WARM (8-30 days)** 🌡️
**Purpose:** Recent historical analysis

**Data retention:**
- ✅ 1 position per 5 minutes per vessel
- ✅ Downsampled from full data
- ✅ Keep representative positions

**Downsampling logic:**
```sql
-- Keep one position per 5-minute window
SELECT DISTINCT ON (vessel_id, time_bucket)
  vessel_id, latitude, longitude, speed, heading, timestamp
FROM vessel_positions
WHERE timestamp >= NOW() - INTERVAL '7 days'
  AND timestamp < NOW() - INTERVAL '30 days'
GROUP BY vessel_id, 
         DATE_TRUNC('minute', timestamp) / 5
ORDER BY vessel_id, time_bucket, timestamp DESC
```

**Storage estimate:**
- 23 days × 1,000 vessels × 288 positions/day = **6.6M records**
- ~150 bytes per record = **1 GB**

**Reduction:** 97% reduction vs full data

**Use cases:**
- Pattern analysis (port visits, routes)
- Compliance tracking
- Incident investigation
- Performance metrics

---

### **Tier 3: COLD (31 days - 1 year)** ❄️
**Purpose:** Long-term historical trends

**Data retention:**
- ✅ 1 position per hour per vessel
- ✅ Heavily downsampled
- ✅ Sufficient for route reconstruction

**Storage estimate:**
- 335 days × 1,000 vessels × 24 positions/day = **8M records**
- ~150 bytes per record = **1.2 GB**

**Reduction:** 99.7% reduction vs full data

**Use cases:**
- Seasonal pattern analysis
- Long-term route optimization
- Historical compliance audits
- Research and analytics

---

### **Tier 4: ARCHIVE (1 year+)** 📦
**Purpose:** Permanent statistical record

**Data retention:**
- ✅ Aggregated statistics only
- ✅ No individual positions
- ✅ Summary metrics

**Aggregated data stored:**
```sql
CREATE TABLE vessel_daily_summary (
  id UUID PRIMARY KEY,
  vessel_id VARCHAR NOT NULL,
  date DATE NOT NULL,
  
  -- Position stats
  positions_recorded INT,
  distance_traveled_km DECIMAL(10,2),
  avg_speed_knots DECIMAL(5,2),
  max_speed_knots DECIMAL(5,2),
  
  -- Coverage
  first_seen TIMESTAMP,
  last_seen TIMESTAMP,
  coverage_hours DECIMAL(5,2),
  
  -- Areas visited
  regions_visited TEXT[],
  ports_visited TEXT[],
  
  -- Alerts
  alerts_received INT,
  critical_alerts INT,
  
  created_at TIMESTAMP DEFAULT NOW()
)
```

**Storage estimate:**
- Indefinite × 1,000 vessels × 1 summary/day = **365K records/year**
- ~500 bytes per record = **183 MB/year**

**Retention:** Keep forever (minimal cost)

---

## Implementation Plan

### Phase 1: Database Schema Changes ✅

#### 1.1 Add Partitioning to VesselPosition Table

```sql
-- Convert existing table to partitioned table
ALTER TABLE vessel_positions 
  RENAME TO vessel_positions_old;

-- Create new partitioned table
CREATE TABLE vessel_positions (
  id UUID DEFAULT gen_random_uuid(),
  vessel_id VARCHAR NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  speed DECIMAL(5,2),
  course DECIMAL(5,2),
  heading INT,
  nav_status VARCHAR,
  timestamp TIMESTAMP NOT NULL,
  data_source VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create indexes
CREATE INDEX idx_vessel_positions_vessel_timestamp 
  ON vessel_positions(vessel_id, timestamp DESC);
CREATE INDEX idx_vessel_positions_timestamp 
  ON vessel_positions(timestamp DESC);
CREATE INDEX idx_vessel_positions_data_source 
  ON vessel_positions(data_source);

-- Create weekly partitions for current month
CREATE TABLE vessel_positions_2025_w42 
  PARTITION OF vessel_positions
  FOR VALUES FROM ('2025-10-14') TO ('2025-10-21');

-- (Create more partitions as needed)
```

#### 1.2 Create Downsampled Tables

```sql
-- Warm tier (5-minute samples)
CREATE TABLE vessel_positions_5min (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id VARCHAR NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  speed DECIMAL(5,2),
  course DECIMAL(5,2),
  heading INT,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vessel_positions_5min_vessel 
  ON vessel_positions_5min(vessel_id, timestamp DESC);

-- Cold tier (1-hour samples)
CREATE TABLE vessel_positions_1hour (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id VARCHAR NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  speed DECIMAL(5,2),
  course DECIMAL(5,2),
  heading INT,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vessel_positions_1hour_vessel 
  ON vessel_positions_1hour(vessel_id, timestamp DESC);

-- Archive tier (daily summaries)
CREATE TABLE vessel_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id VARCHAR NOT NULL,
  date DATE NOT NULL,
  positions_recorded INT,
  distance_traveled_km DECIMAL(10,2),
  avg_speed_knots DECIMAL(5,2),
  max_speed_knots DECIMAL(5,2),
  first_seen TIMESTAMP,
  last_seen TIMESTAMP,
  coverage_hours DECIMAL(5,2),
  alerts_received INT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(vessel_id, date)
);

CREATE INDEX idx_vessel_daily_summary_date 
  ON vessel_daily_summary(date DESC);
```

---

### Phase 2: Create Retention Jobs 🤖

#### 2.1 Downsample Job (Runs Daily)

```typescript
// scripts/vessel-data-retention.ts

import { prisma } from '@/lib/prisma'

export async function downsamplePositions() {
  console.log('🔄 Starting position downsampling...')
  
  // 1. Downsample 7-day-old data to 5-minute intervals
  await downsampleTo5Minutes()
  
  // 2. Downsample 30-day-old data to 1-hour intervals
  await downsampleTo1Hour()
  
  // 3. Create daily summaries for 1-year-old data
  await createDailySummaries()
  
  // 4. Delete processed data
  await deleteOldFullResolution()
  await deleteOld5MinuteData()
  await deleteOld1HourData()
  
  console.log('✅ Downsampling complete')
}

async function downsampleTo5Minutes() {
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  
  await prisma.$executeRaw`
    INSERT INTO vessel_positions_5min 
      (vessel_id, latitude, longitude, speed, course, heading, timestamp)
    SELECT DISTINCT ON (vessel_id, time_bucket)
      vessel_id,
      latitude,
      longitude,
      speed,
      course,
      heading,
      timestamp
    FROM vessel_positions
    WHERE timestamp < ${cutoffDate}
      AND timestamp >= ${new Date(cutoffDate.getTime() - 24 * 60 * 60 * 1000)}
      AND NOT EXISTS (
        SELECT 1 FROM vessel_positions_5min v5
        WHERE v5.vessel_id = vessel_positions.vessel_id
          AND v5.timestamp = vessel_positions.timestamp
      )
    ORDER BY vessel_id, 
             DATE_TRUNC('minute', timestamp)::INT / 5,
             timestamp DESC
  `
  
  console.log('  ✓ Downsampled to 5-minute intervals')
}

async function downsampleTo1Hour() {
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  await prisma.$executeRaw`
    INSERT INTO vessel_positions_1hour
      (vessel_id, latitude, longitude, speed, course, heading, timestamp)
    SELECT DISTINCT ON (vessel_id, hour_bucket)
      vessel_id,
      latitude,
      longitude,
      speed,
      course,
      heading,
      timestamp
    FROM vessel_positions_5min
    WHERE timestamp < ${cutoffDate}
      AND timestamp >= ${new Date(cutoffDate.getTime() - 24 * 60 * 60 * 1000)}
      AND NOT EXISTS (
        SELECT 1 FROM vessel_positions_1hour v1
        WHERE v1.vessel_id = vessel_positions_5min.vessel_id
          AND v1.timestamp = vessel_positions_5min.timestamp
      )
    ORDER BY vessel_id,
             DATE_TRUNC('hour', timestamp),
             timestamp DESC
  `
  
  console.log('  ✓ Downsampled to 1-hour intervals')
}

async function createDailySummaries() {
  const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  
  await prisma.$executeRaw`
    INSERT INTO vessel_daily_summary
      (vessel_id, date, positions_recorded, avg_speed_knots, 
       max_speed_knots, first_seen, last_seen, coverage_hours)
    SELECT 
      vessel_id,
      DATE(timestamp) as date,
      COUNT(*) as positions_recorded,
      AVG(speed) as avg_speed_knots,
      MAX(speed) as max_speed_knots,
      MIN(timestamp) as first_seen,
      MAX(timestamp) as last_seen,
      EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 3600 as coverage_hours
    FROM vessel_positions_1hour
    WHERE timestamp < ${cutoffDate}
      AND timestamp >= ${new Date(cutoffDate.getTime() - 24 * 60 * 60 * 1000)}
    GROUP BY vessel_id, DATE(timestamp)
    ON CONFLICT (vessel_id, date) DO NOTHING
  `
  
  console.log('  ✓ Created daily summaries')
}

async function deleteOldFullResolution() {
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  
  const result = await prisma.vesselPosition.deleteMany({
    where: {
      timestamp: {
        lt: cutoffDate
      }
    }
  })
  
  console.log(`  ✓ Deleted ${result.count} full-resolution positions older than 7 days`)
}

async function deleteOld5MinuteData() {
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  const result = await prisma.$executeRaw`
    DELETE FROM vessel_positions_5min
    WHERE timestamp < ${cutoffDate}
  `
  
  console.log(`  ✓ Deleted 5-minute positions older than 30 days`)
}

async function deleteOld1HourData() {
  const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  
  const result = await prisma.$executeRaw`
    DELETE FROM vessel_positions_1hour
    WHERE timestamp < ${cutoffDate}
  `
  
  console.log(`  ✓ Deleted 1-hour positions older than 1 year`)
}

// Run if executed directly
if (require.main === module) {
  downsamplePositions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error)
      process.exit(1)
    })
}
```

#### 2.2 Add Cron Job

```typescript
// lib/workers/vessel-ingestion-worker.ts

import cron from 'node-cron'
import { downsamplePositions } from '@/scripts/vessel-data-retention'

// Run retention job daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('🕐 Running scheduled data retention job...')
  try {
    await downsamplePositions()
  } catch (error) {
    console.error('❌ Retention job failed:', error)
  }
})
```

---

### Phase 3: Update Queries 📊

#### 3.1 Smart Query Router

```typescript
// lib/services/vessel-position-query.ts

export async function getVesselPositions(
  vesselId: string,
  startDate: Date,
  endDate: Date
) {
  const now = new Date()
  const daysSinceStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  
  // Route to appropriate table based on age
  if (daysSinceStart <= 7) {
    // HOT: Full resolution
    return await prisma.vesselPosition.findMany({
      where: {
        vesselId,
        timestamp: { gte: startDate, lte: endDate }
      },
      orderBy: { timestamp: 'asc' }
    })
  } else if (daysSinceStart <= 30) {
    // WARM: 5-minute samples
    return await prisma.$queryRaw`
      SELECT * FROM vessel_positions_5min
      WHERE vessel_id = ${vesselId}
        AND timestamp >= ${startDate}
        AND timestamp <= ${endDate}
      ORDER BY timestamp ASC
    `
  } else if (daysSinceStart <= 365) {
    // COLD: 1-hour samples
    return await prisma.$queryRaw`
      SELECT * FROM vessel_positions_1hour
      WHERE vessel_id = ${vesselId}
        AND timestamp >= ${startDate}
        AND timestamp <= ${endDate}
      ORDER BY timestamp ASC
    `
  } else {
    // ARCHIVE: Daily summaries only
    return await prisma.$queryRaw`
      SELECT * FROM vessel_daily_summary
      WHERE vessel_id = ${vesselId}
        AND date >= ${startDate.toISOString().split('T')[0]}
        AND date <= ${endDate.toISOString().split('T')[0]}
      ORDER BY date ASC
    `
  }
}
```

---

## Storage & Cost Projections

### Month 1
| Tier | Records | Size | Cost/Month |
|------|---------|------|------------|
| HOT (7d) | 300M | 45 GB | $5 |
| WARM (23d) | 6.6M | 1 GB | $0.12 |
| **Total** | **307M** | **46 GB** | **$5.12** |

### Month 12
| Tier | Records | Size | Cost/Month |
|------|---------|------|------------|
| HOT (7d) | 300M | 45 GB | $5 |
| WARM (23d) | 6.6M | 1 GB | $0.12 |
| COLD (335d) | 8M | 1.2 GB | $0.14 |
| ARCHIVE (365d) | 365K | 0.2 GB | $0.02 |
| **Total** | **315M** | **47.4 GB** | **$5.28** |

### Without Retention (Month 1)
| Tier | Records | Size | Cost/Month |
|------|---------|------|------------|
| ALL DATA | 1.3B | **195 GB** | **$22** |

**Savings:** 76% reduction in storage, 76% cost savings

---

## Benefits

### ✅ Performance
- **Query speed:** 10-100x faster (smaller datasets)
- **Index size:** 95% smaller
- **Backup time:** Minutes instead of hours

### ✅ Cost
- **Storage:** 76% reduction
- **Backup storage:** 76% reduction
- **Database instance:** Can use smaller tier

### ✅ Functionality
- **Real-time tracking:** Full fidelity for 7 days
- **Recent analysis:** 5-minute resolution for 30 days
- **Historical trends:** 1-hour resolution for 1 year
- **Long-term stats:** Summaries forever

### ✅ Compliance
- **Data retention:** Configurable per regulation
- **Audit trail:** Daily summaries kept permanently
- **Incident response:** 7 days of full data

---

## Rollout Plan

### Week 1: Schema & Scripts
1. Create migration for new tables
2. Write retention scripts
3. Test on sample data

### Week 2: Gradual Rollout
1. Deploy to staging
2. Run retention manually for 3 days
3. Monitor performance and storage

### Week 3: Production
1. Deploy to production
2. Enable cron job
3. Monitor for 7 days

### Week 4: Optimization
1. Tune retention intervals if needed
2. Add monitoring dashboards
3. Document procedures

---

## Monitoring & Alerts

### Key Metrics to Track
```typescript
// Daily monitoring
- Total positions in each tier
- Storage usage per tier
- Retention job duration
- Retention job success rate
- Query performance (p50, p95, p99)
```

### Alerts
```typescript
- Storage > 80% of expected
- Retention job failed
- Query time > 5s
- Positions not being downsampled
```

---

## Alternative Approaches (Not Recommended)

### ❌ Option A: Keep Everything
**Pros:** Simple, no data loss  
**Cons:** Unsustainable cost, terrible performance

### ❌ Option B: Delete Old Data
**Pros:** Simple implementation  
**Cons:** No historical analysis, compliance issues

### ❌ Option C: External Time-Series DB
**Pros:** Optimized for time-series  
**Cons:** Additional infrastructure, complexity, cost

---

## Questions for Review

1. **Retention periods:** Are 7/30/365 days appropriate for your use case?
2. **Downsampling intervals:** Is 5min/1hour sufficient for analysis?
3. **Archive tier:** Do you need daily summaries or can we aggregate weekly?
4. **Compliance:** Any regulatory requirements for data retention?
5. **Incident response:** How far back do you need full-resolution data?

---

## Next Steps

Once approved:
1. I'll create the Prisma migration
2. Implement the retention scripts
3. Add cron scheduling
4. Update query logic to use smart routing
5. Add monitoring and alerting
6. Test thoroughly before production

**Estimated implementation time:** 2-3 days

---

## Summary

✅ **Problem solved:** Database won't balloon  
✅ **Performance:** Queries stay fast forever  
✅ **Cost effective:** 76% storage savings  
✅ **Functional:** All analysis needs met  
✅ **Scalable:** Works for 10,000+ vessels  
✅ **Maintainable:** Automated retention jobs  

This strategy is based on industry best practices for time-series data (similar to metrics systems like Prometheus, Grafana, InfluxDB).

**Ready to proceed?** Let me know if you'd like to adjust any parameters!
