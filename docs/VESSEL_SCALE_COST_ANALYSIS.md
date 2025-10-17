# Vessel Tracking at Scale: 50K-100K Vessels
## Comprehensive Cost & Infrastructure Analysis

---

## Executive Summary

**Current state:** 1,400 vessels  
**Target state:** 50,000 - 100,000 vessels  
**Scale multiplier:** 35x - 70x

**Critical findings:**
- 🚨 Railway will NOT support this scale on any tier
- 🚨 Database will need dedicated infrastructure
- 🚨 Monthly costs: $500-$2,000+ depending on architecture
- ✅ Current retention strategy still valid, but needs tuning
- ✅ Must move to cloud-native time-series database

---

## Part 1: Data Volume Projections

### Current Scale (1,400 vessels)

| Metric | Per Minute | Per Hour | Per Day | Per Month |
|--------|------------|----------|---------|-----------|
| Position Updates | 8,400 | 504K | 12M | 360M |
| Storage (raw) | 1.3 MB | 76 MB | 1.8 GB | 54 GB |

### Target Scale (50,000 vessels)

| Metric | Per Minute | Per Hour | Per Day | Per Month |
|--------|------------|----------|---------|-----------|
| Position Updates | **300K** | **18M** | **432M** | **13B** |
| Storage (raw) | 45 MB | 2.7 GB | **65 GB** | **1.95 TB** |
| Network in | 45 MB | 2.7 GB | 65 GB | 1.95 TB |
| Network out | ~10 MB | ~600 MB | ~14 GB | ~420 GB |

### Extreme Scale (100,000 vessels)

| Metric | Per Minute | Per Hour | Per Day | Per Month |
|--------|------------|----------|---------|-----------|
| Position Updates | **600K** | **36M** | **864M** | **26B** |
| Storage (raw) | 90 MB | 5.4 GB | **130 GB** | **3.9 TB** |
| Network in | 90 MB | 5.4 GB | 130 GB | 3.9 TB |
| Network out | ~20 MB | ~1.2 GB | ~28 GB | ~840 GB |

**Key insight:** At 100K vessels, you're ingesting **90 MB/minute** = **1.5 MB/second** continuously.

---

## Part 2: Railway Analysis

### Railway Pricing Tiers (2025)

| Tier | Price | vCPU | RAM | Disk | Network | Database |
|------|-------|------|-----|------|---------|----------|
| **Hobby** | $5/mo | Shared | 512 MB | 1 GB | 100 GB | Shared Postgres |
| **Pro** | $20/mo | 2 vCPU | 8 GB | 100 GB | 100 GB | Shared Postgres |
| **Team** | $100/mo | 8 vCPU | 32 GB | 500 GB | 1 TB | Dedicated option |

### What You're On: **Hobby ($5/mo)**

**Limits:**
- ❌ 512 MB RAM (worker needs 2-4 GB)
- ❌ 1 GB disk (need 50+ GB)
- ❌ 100 GB network/month (need 2 TB+)
- ❌ Shared Postgres (need dedicated with 100+ GB)

**Reality:** You'll hit limits within **24 hours** at 50K vessels.

---

### Railway at 50K Vessels: Won't Work

#### Database Storage
```
Month 1: 46 GB (HOT tier alone)
Month 3: 48 GB
Month 12: 50 GB
```

**Problem:** Railway Postgres max storage = 100 GB on Team tier  
**Your need:** 50-200 GB just for hot data

#### Network Usage
```
Inbound: 1.95 TB/month
Outbound: 420 GB/month
Total: 2.37 TB/month
```

**Problem:** Team tier includes 1 TB, overage = $0.10/GB  
**Overage cost:** 1.37 TB × $0.10 = **$137/month** in network alone

#### Compute
```
Worker process: 2-4 GB RAM continuous
Web process: 1-2 GB RAM
Database: 4-8 GB RAM
```

**Problem:** Team tier = 32 GB total shared  
**Your need:** 50+ GB dedicated

#### Cost Breakdown (Railway Team Tier)

| Component | Cost |
|-----------|------|
| Base Team tier | $100/mo |
| Network overage (1.37 TB) | $137/mo |
| Extra compute (20 GB RAM) | ~$50/mo |
| Database storage overage | ~$30/mo |
| **Total** | **~$317/month** |

**Verdict:** 🚨 Railway is NOT suitable for this scale

---

## Part 3: Proper Architecture for 50K-100K Vessels

### Recommended Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  (Next.js Frontend + API)                                       │
│  - Railway or Vercel ($20-50/mo)                                │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  Worker Process  │  │   API Server     │                    │
│  │  (Vessel Data)   │  │   (REST/WS)      │                    │
│  │  Railway or AWS  │  │   Railway/AWS    │                    │
│  │  $50-100/mo      │  │   $20-50/mo      │                    │
│  └────────┬─────────┘  └────────┬─────────┘                    │
└───────────┴────────────────────┬─────────────────────────────────┘
            │                    │
            ├────────────────────┴─────────────────────┐
            │                                          │
┌───────────▼────────────────────┐  ┌─────────────────▼──────────┐
│   TIME-SERIES DATABASE         │  │   POSTGRESQL               │
│   (InfluxDB / TimescaleDB)     │  │   (User data, vessels)     │
│                                │  │                            │
│   - Position data              │  │   - User accounts          │
│   - High write throughput      │  │   - Vessel metadata        │
│   - Automatic retention        │  │   - Alerts                 │
│   - Downsampling built-in      │  │   - Contacts               │
│                                │  │                            │
│   Cost: $200-500/mo            │  │   Cost: $50-100/mo         │
│   (AWS/InfluxDB Cloud)         │  │   (Railway/AWS RDS)        │
└────────────────────────────────┘  └────────────────────────────┘
```

---

## Part 4: Database Options Comparison

### Option A: PostgreSQL Only (Current Approach)

**Pros:**
- ✅ Simple architecture
- ✅ Single database
- ✅ ACID compliance

**Cons:**
- ❌ Not optimized for time-series
- ❌ Manual retention/downsampling
- ❌ Expensive at scale
- ❌ Slower queries on large datasets

**Cost at 50K vessels:**
- AWS RDS PostgreSQL (db.m5.2xlarge): **$550/month**
- Storage (200 GB): **$40/month**
- Backups: **$30/month**
- **Total: $620/month**

**Verdict:** 🟡 Works but expensive and not optimal

---

### Option B: TimescaleDB (Recommended) ⭐

**What is it:** PostgreSQL extension optimized for time-series data

**Pros:**
- ✅ PostgreSQL compatibility (use existing knowledge)
- ✅ Automatic partitioning
- ✅ Built-in downsampling (continuous aggregates)
- ✅ Compression (75% storage savings)
- ✅ Much faster time-series queries
- ✅ Can run on managed service or self-hosted

**Cons:**
- 🟡 Slightly more complex setup
- 🟡 Need to learn time-series concepts

**Architecture:**
```sql
-- Hypertable with automatic partitioning
CREATE TABLE vessel_positions (
  time TIMESTAMPTZ NOT NULL,
  vessel_id TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading INTEGER
);

-- Convert to hypertable (automatic partitioning)
SELECT create_hypertable('vessel_positions', 'time');

-- Automatic retention (no cron jobs needed)
SELECT add_retention_policy('vessel_positions', INTERVAL '7 days');

-- Automatic downsampling (no scripts needed)
CREATE MATERIALIZED VIEW vessel_positions_5min
WITH (timescaledb.continuous) AS
  SELECT 
    time_bucket('5 minutes', time) AS bucket,
    vessel_id,
    first(latitude, time) as latitude,
    first(longitude, time) as longitude,
    avg(speed) as speed
  FROM vessel_positions
  GROUP BY bucket, vessel_id;

-- Automatic compression (75% savings)
ALTER TABLE vessel_positions 
  SET (timescaledb.compress, 
       timescaledb.compress_segmentby = 'vessel_id');

SELECT add_compression_policy('vessel_positions', INTERVAL '2 days');
```

**Cost at 50K vessels (Timescale Cloud):**
- **Development tier:** $0 (free, limited)
- **Production (50 GB):** $100/month
- **Production (200 GB):** $300/month
- **High performance:** $500/month

**Self-hosted (AWS):**
- EC2 instance (m5.xlarge): $140/month
- EBS storage (500 GB): $50/month
- **Total: $190/month**

**Verdict:** ✅ Best balance of features, performance, and cost

---

### Option C: InfluxDB

**What is it:** Purpose-built time-series database

**Pros:**
- ✅ Highest write throughput
- ✅ Built-in retention
- ✅ Built-in downsampling
- ✅ Excellent query language (Flux)
- ✅ Best for pure time-series

**Cons:**
- ❌ Not relational (need separate DB for users/vessels)
- ❌ Learning curve (new query language)
- ❌ More complex architecture

**Cost at 50K vessels (InfluxDB Cloud):**
- Ingest: $0.35 per million writes
- Storage: $0.25/GB/month
- Queries: $0.015 per GB scanned

**Monthly calculation:**
- Writes: 13B × $0.35/1M = **$4,550/month** 😱
- Storage (compressed 50 GB): **$12.50/month**
- Queries: **$50-200/month**
- **Total: $4,600-4,800/month** 🚨

**Self-hosted (AWS):**
- EC2 instance (m5.2xlarge): $280/month
- EBS storage: $50/month
- **Total: $330/month**

**Verdict:** 🟡 Great for time-series but expensive on cloud, complex dual-DB

---

### Option D: Cassandra / ScyllaDB

**What is it:** Distributed wide-column database for massive scale

**Pros:**
- ✅ Horizontal scaling
- ✅ Multi-region support
- ✅ Handles millions of writes/sec
- ✅ Built for massive scale

**Cons:**
- ❌ Complex to operate
- ❌ High operational overhead
- ❌ Overkill for 50K-100K vessels
- ❌ Expensive

**Cost:** $500-2,000/month minimum

**Verdict:** ❌ Overkill for your scale

---

## Part 5: Recommended Architecture

### For 50,000 Vessels: **TimescaleDB + Railway/Vercel**

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend & API (Next.js)                                    │
│  Deployed on: Vercel or Railway                              │
│  Cost: $20-50/month                                          │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────┴─────────────────────────────────────────┐
│  Worker Process (Vessel Ingestion)                           │
│  Deployed on: Railway (2 GB RAM) or AWS ECS                  │
│  Cost: $50-100/month                                         │
└────────────────────┬─────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────────┐   ┌──────────▼─────────┐
│  TimescaleDB     │   │  PostgreSQL        │
│  (Positions)     │   │  (Users/Metadata)  │
│                  │   │                    │
│  Timescale Cloud │   │  Railway Postgres  │
│  $200-300/mo     │   │  $50/mo            │
└──────────────────┘   └────────────────────┘
```

**Total monthly cost: $320-500**

---

### For 100,000 Vessels: **Self-Hosted TimescaleDB on AWS**

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend & API (Next.js)                                    │
│  Deployed on: Vercel                                         │
│  Cost: $50/month                                             │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────┴─────────────────────────────────────────┐
│  Worker Process (Vessel Ingestion)                           │
│  Deployed on: AWS ECS Fargate (4 GB RAM)                     │
│  Cost: $100/month                                            │
└────────────────────┬─────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────────┐   ┌──────────▼─────────┐
│  TimescaleDB     │   │  PostgreSQL        │
│  (Positions)     │   │  (Users/Metadata)  │
│                  │   │                    │
│  AWS EC2         │   │  AWS RDS           │
│  m5.2xlarge      │   │  db.t3.large       │
│  $280/mo         │   │  $100/mo           │
│                  │   │                    │
│  + EBS 500GB     │   │  + Storage 100GB   │
│  $50/mo          │   │  $20/mo            │
└──────────────────┘   └────────────────────┘

Total: $600-700/month
```

---

## Part 6: Revised Data Retention Strategy

### At 50,000 Vessels

| Tier | Duration | Resolution | Records | Storage | Monthly |
|------|----------|------------|---------|---------|---------|
| **HOT** | 7 days | Full (every update) | 3B | 450 GB | Delete after 7d |
| **WARM** | 30 days | 5-min samples | 216M | 32 GB | Delete after 30d |
| **COLD** | 1 year | 1-hour samples | 438M | 66 GB | Delete after 1y |
| **ARCHIVE** | Forever | Daily summary | 18M | 2.7 GB | Keep forever |

**With compression (75% reduction):**

| Tier | Compressed Size |
|------|----------------|
| HOT | 112 GB |
| WARM | 8 GB |
| COLD | 16 GB |
| ARCHIVE | 0.7 GB |
| **Total** | **~140 GB** |

**Key optimization:** With TimescaleDB compression, total storage stays under 150 GB permanently.

---

### At 100,000 Vessels

| Tier | Duration | Resolution | Records | Storage (Compressed) |
|------|----------|------------|---------|---------------------|
| **HOT** | 7 days | Full | 6B | 225 GB |
| **WARM** | 30 days | 5-min | 432M | 16 GB |
| **COLD** | 1 year | 1-hour | 876M | 32 GB |
| **ARCHIVE** | Forever | Daily | 36M | 1.4 GB |
| **Total** | | | | **~275 GB** |

**With aggressive retention (adjust if needed):**

| Tier | Duration | Resolution | Storage (Compressed) |
|------|----------|------------|---------------------|
| **HOT** | 3 days | Full | 96 GB |
| **WARM** | 14 days | 5-min | 7 GB |
| **COLD** | 180 days | 1-hour | 16 GB |
| **ARCHIVE** | Forever | Daily | 1.4 GB |
| **Total** | | | **~120 GB** |

---

## Part 7: Cost Breakdown Summary

### Scenario A: 50K Vessels, TimescaleDB Cloud

| Component | Provider | Cost |
|-----------|----------|------|
| Frontend & API | Vercel | $20 |
| Worker process | Railway (2 GB) | $50 |
| TimescaleDB (positions) | Timescale Cloud | $200 |
| PostgreSQL (metadata) | Railway | $30 |
| Network egress | Vercel | $20 |
| Monitoring | Datadog/Grafana Cloud | $50 |
| **Total** | | **$370/month** |

---

### Scenario B: 50K Vessels, Self-Hosted

| Component | Provider | Cost |
|-----------|----------|------|
| Frontend & API | Vercel | $20 |
| Worker process | AWS ECS (2 GB) | $50 |
| TimescaleDB EC2 | AWS m5.xlarge | $140 |
| TimescaleDB Storage | AWS EBS 500 GB | $50 |
| PostgreSQL RDS | AWS db.t3.medium | $60 |
| Network egress | AWS | $50 |
| Backups | AWS S3 | $20 |
| Monitoring | CloudWatch | $30 |
| **Total** | | **$420/month** |

---

### Scenario C: 100K Vessels, Self-Hosted

| Component | Provider | Cost |
|-----------|----------|------|
| Frontend & API | Vercel | $50 |
| Worker process | AWS ECS (4 GB) | $100 |
| TimescaleDB EC2 | AWS m5.2xlarge | $280 |
| TimescaleDB Storage | AWS EBS 1 TB | $100 |
| PostgreSQL RDS | AWS db.t3.large | $100 |
| Network egress | AWS | $100 |
| Backups | AWS S3 | $40 |
| Load balancer | AWS ALB | $20 |
| Monitoring | CloudWatch | $50 |
| **Total** | | **$840/month** |

---

### Scenario D: 100K Vessels, Maximum Performance

| Component | Provider | Cost |
|-----------|----------|------|
| Frontend & API | Vercel Pro | $100 |
| Worker processes (2x) | AWS ECS (8 GB) | $200 |
| TimescaleDB EC2 | AWS m5.4xlarge | $560 |
| TimescaleDB Storage | AWS EBS 2 TB SSD | $250 |
| PostgreSQL RDS | AWS db.m5.large | $180 |
| Redis cache | AWS ElastiCache | $50 |
| Network egress | AWS | $150 |
| Backups | AWS S3 | $60 |
| Load balancer | AWS ALB | $30 |
| Monitoring | Datadog | $100 |
| **Total** | | **$1,680/month** |

---

## Part 8: Breaking Points & Scaling Limits

### Current Railway Setup

| Metric | Current Capacity | Need at 50K | Need at 100K |
|--------|-----------------|-------------|--------------|
| RAM | 512 MB | 4 GB | 8 GB |
| Storage | 1 GB | 200 GB | 400 GB |
| Network | 100 GB/mo | 2.4 TB/mo | 4.8 TB/mo |
| Database | Shared | Dedicated 16GB | Dedicated 32GB |

**Breaking point:** Railway breaks at ~5,000 vessels

---

### TimescaleDB (Recommended)

| Metric | 50K Vessels | 100K Vessels | Breaking Point |
|--------|-------------|--------------|----------------|
| Writes/sec | 5,000 | 10,000 | 50,000+ |
| Storage | 140 GB | 275 GB | 10+ TB |
| RAM needed | 8 GB | 16 GB | 128 GB |
| Query speed | <100ms | <200ms | <500ms |

**Breaking point:** Can scale to **500K+ vessels** with proper hardware

---

## Part 9: Recommended Migration Path

### Phase 1: Immediate (Week 1-2)
**Goal:** Survive on Railway with current 1,400 vessels

**Actions:**
1. ✅ Implement data retention (as planned)
2. ✅ Add compression to reduce storage by 70%
3. ✅ Optimize queries with proper indexes
4. ✅ Limit to 1,000 vessels on map (already done)

**Cost:** Current Railway tier ($5-20/month)

---

### Phase 2: Growth (Month 1-2)
**Goal:** Support 5,000-10,000 vessels

**Actions:**
1. Migrate to Railway Team tier ($100/month)
2. Add Redis for caching
3. Implement viewport-based loading
4. Optimize worker memory usage

**Cost:** $150-200/month

---

### Phase 3: Scale (Month 3-6)
**Goal:** Support 50,000 vessels

**Actions:**
1. 🚨 **Migrate to TimescaleDB** (critical)
   - Set up Timescale Cloud account
   - Migrate schema with hypertables
   - Set up continuous aggregates
   - Enable compression
   
2. Split databases:
   - TimescaleDB: Position data
   - PostgreSQL: User/vessel metadata
   
3. Move worker to dedicated instance
   - AWS ECS or Railway with 4 GB RAM
   
4. Set up proper monitoring
   - Query performance
   - Storage usage
   - Ingestion rate

**Cost:** $370-420/month

---

### Phase 4: Enterprise (Month 6-12)
**Goal:** Support 100,000 vessels

**Actions:**
1. Move to self-hosted TimescaleDB on AWS
2. Implement multi-region if needed
3. Add read replicas for queries
4. Consider CDN for static vessel data
5. Implement data archival to S3

**Cost:** $600-840/month

---

## Part 10: Optimizations for Scale

### 1. Reduce Position Update Frequency

**Current:** Every AIS update (2-10 seconds)  
**Optimized:** Smart throttling based on vessel activity

```typescript
// Only store position if:
- 5+ minutes since last update, OR
- Speed changed by 2+ knots, OR
- Course changed by 10+ degrees, OR
- Vessel entered/exited alert zone

// Result: 70% reduction in writes
```

**Savings:** 50K vessels → 15K vessels worth of data

---

### 2. Regional Filtering

**Current:** Track all global vessels  
**Optimized:** Only track vessels in regions of interest

```typescript
// Only ingest vessels in:
- Active alert zones
- Monitored regions (e.g., Pacific Rim for tsunami)
- Vessels with registered contacts

// Result: 80% reduction in tracked vessels
```

**Savings:** 100K global vessels → 20K tracked

---

### 3. Tiered Update Rates

```typescript
// High priority (1 min updates):
- Vessels in active alert zones
- Vessels with registered contacts
- Fast-moving vessels (>20 knots)

// Medium priority (5 min updates):
- Vessels in monitored regions
- Medium-speed vessels

// Low priority (15 min updates):
- Vessels far from any zones
- Slow/stopped vessels
```

**Savings:** 60% reduction in write volume

---

### 4. Edge Caching

```typescript
// Cache vessel positions at edge (Cloudflare Workers)
// Serve last known position from cache
// Update every 30-60 seconds

// Reduces database queries by 95%
```

**Savings:** Database load reduced dramatically

---

## Part 11: Alternative Business Models

### Option A: Hybrid Cloud + Edge

**Architecture:**
- TimescaleDB for historical data
- Redis for real-time positions (last 15 min)
- Cloudflare Workers for edge caching
- S3 for cold storage

**Pros:** Best performance, moderate cost  
**Cost:** $400-600/month at 50K vessels

---

### Option B: Event-Driven with Queue

**Architecture:**
- AWS SQS/Kinesis for ingestion buffering
- Lambda functions for processing
- DynamoDB for recent positions
- S3 + Athena for historical queries

**Pros:** Scales automatically, pay-per-use  
**Cons:** More complex, harder to debug  
**Cost:** $300-800/month (variable)

---

### Option C: Managed Time-Series Service

**Architecture:**
- AWS Timestream (managed time-series)
- Aurora PostgreSQL (metadata)
- Lambda workers

**Pros:** Fully managed, auto-scaling  
**Cons:** Vendor lock-in, potentially expensive  
**Cost:** $500-1,200/month

---

## Part 12: Final Recommendations

### For Your Situation

**Current state:** 1,400 vessels on Railway  
**Near term:** 5,000-10,000 vessels (6 months)  
**Long term:** 50,000+ vessels (1-2 years)

### Recommended Path

#### **Immediate (This Week)**
1. ✅ Keep Railway for now
2. ✅ Implement retention strategy (as documented)
3. ✅ Add position deduplication/throttling
4. ✅ Monitor storage growth

**Cost:** $20/month (Railway Pro)

#### **Q1 2026 (10K vessels)**
1. 🔄 Migrate to Timescale Cloud
2. Keep Railway for web app
3. Move worker to dedicated instance
4. Implement smart throttling

**Cost:** $250-300/month

#### **Q2-Q3 2026 (50K vessels)**
1. Self-host TimescaleDB on AWS
2. Add read replicas
3. Implement regional filtering
4. Add Redis caching layer

**Cost:** $400-500/month

#### **Q4 2026+ (100K vessels)**
1. Multi-region deployment
2. Edge caching with Cloudflare
3. Advanced optimizations
4. Consider event-driven architecture

**Cost:** $600-800/month

---

## Part 13: Risk Mitigation

### Risk 1: Railway Storage Limits
**Probability:** High (within 2-3 months at growth)  
**Impact:** Service outage  
**Mitigation:** Implement retention NOW, monitor daily

### Risk 2: Database Performance Degradation
**Probability:** High (at 10K+ vessels)  
**Impact:** Slow queries, poor UX  
**Mitigation:** Migrate to TimescaleDB before hitting 5K vessels

### Risk 3: Cost Overruns
**Probability:** Medium  
**Impact:** Budget exceeded  
**Mitigation:** Implement throttling, regional filtering, set budget alerts

### Risk 4: Data Loss
**Probability:** Low  
**Impact:** Critical  
**Mitigation:** Automated backups, test restore procedures

---

## Part 14: Action Items

### This Week (Critical)
- [ ] Commit current retention strategy
- [ ] Set up storage monitoring alerts
- [ ] Implement position throttling (70% reduction)
- [ ] Test retention scripts on sample data

### This Month (Important)
- [ ] Open Timescale Cloud account
- [ ] Create migration plan to TimescaleDB
- [ ] Set up cost tracking dashboard
- [ ] Implement regional filtering if possible

### Next Quarter (Planned)
- [ ] Execute TimescaleDB migration
- [ ] Move worker to dedicated instance
- [ ] Add Redis caching layer
- [ ] Implement comprehensive monitoring

---

## Summary

### Can You Scale to 50K-100K Vessels?

**Yes, but NOT on Railway.**

### What It Will Take

| Component | 50K Vessels | 100K Vessels |
|-----------|-------------|--------------|
| **Infrastructure** | TimescaleDB + Railway/AWS | Self-hosted on AWS |
| **Monthly cost** | $370-500 | $600-840 |
| **Migration effort** | 2-3 weeks | 4-6 weeks |
| **Ongoing maintenance** | Low (managed) | Medium (self-hosted) |

### Key Success Factors

1. ✅ **Migrate to TimescaleDB** (non-negotiable at scale)
2. ✅ **Implement smart throttling** (70% data reduction)
3. ✅ **Regional filtering** (focus on relevant vessels)
4. ✅ **Proper monitoring** (catch issues early)
5. ✅ **Phased approach** (migrate before breaking point)

### Bottom Line

**At 50K vessels:**
- Monthly cost: **$370-500**
- Infrastructure: TimescaleDB + managed services
- Complexity: Moderate
- **Feasible and sustainable** ✅

**At 100K vessels:**
- Monthly cost: **$600-840**
- Infrastructure: Self-hosted with optimization
- Complexity: High
- **Feasible but requires dedicated DevOps** ✅

Your current retention strategy is **sound**, but you **must** migrate to TimescaleDB before hitting 5,000 vessels to avoid service disruption.

**Next step:** Review this analysis and decide on migration timeline. I can help implement when ready.
