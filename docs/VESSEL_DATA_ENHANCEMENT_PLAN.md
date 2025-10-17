# Vessel Data Enhancement Plan

**Date**: 2025-10-17  
**Objective**: Capture high-value missing data from AISStream and OpenShipData feeds

## 📊 Current Gap Analysis

### High-Value Data We're Receiving But Not Storing

#### 1. **VesselPosition Fields** (Schema exists, not populated)
- ✅ Schema has `destination` (String?)
- ✅ Schema has `eta` (DateTime?)
- ✅ Schema has `draught` (Float?) - for current voyage draught
- ❌ Missing: `rateOfTurn`, `positionAccuracy`

#### 2. **Vessel Fields** (Need schema additions)
- ❌ Missing: `height` (bridge clearance planning)
- ❌ Missing: `captain` (emergency contact)
- ❌ Missing: `destinationCoordinates` (JSON for lat/lon)

## 🎯 Implementation Plan

### Phase 1: Schema Updates (5 min)

**Add to `Vessel` model:**
```prisma
model Vessel {
  // ... existing fields
  height        Float?   // meters - vessel height for bridge clearance
  captain       String?  // captain name from OpenShipData
}
```

**Add to `VesselPosition` model:**
```prisma
model VesselPosition {
  // ... existing fields
  rateOfTurn       Float?   // degrees per minute (collision risk indicator)
  positionAccuracy Boolean? // true = high accuracy (<10m), false = low accuracy (>10m)
  
  // Note: destination, eta, draught already exist!
}
```

### Phase 2: Data Extraction Updates (30 min)

#### 2.1 AISStream PositionReport Enhancement
**File**: `lib/services/aisstream-service.ts`

Add to `PositionReport` type:
```typescript
PositionReport?: {
  // ... existing
  RateOfTurn?: number
  PositionAccuracy?: boolean
}
```

Update `prisma.vesselPosition.create()`:
```typescript
await prisma.vesselPosition.create({
  data: {
    vesselId: vessel.id,
    latitude: pos.Latitude,
    longitude: pos.Longitude,
    speed: pos.Sog,
    course: pos.Cog,
    heading: pos.TrueHeading,
    navStatus: this.mapNavStatus(pos.NavigationalStatus),
    rateOfTurn: pos.RateOfTurn,                    // NEW
    positionAccuracy: pos.PositionAccuracy,        // NEW
    timestamp: new Date(message.MetaData.time_utc || Date.now()),
    dataSource: 'aisstream'
  }
})
```

#### 2.2 AISStream ShipStaticData Enhancement
**File**: `lib/services/aisstream-service.ts`

Current issue: `Destination` and `Eta` from ShipStaticData are NOT being saved to positions.

**Problem**: We only save these to `Vessel` table, but they change per voyage.

**Solution**: Save to BOTH:
1. Save destination/ETA to the **next position record** created for this vessel
2. Keep a "current voyage" destination on the vessel for quick reference

Add helper to parse AIS ETA format:
```typescript
private parseAISEta(eta?: { Month: number, Day: number, Hour: number, Minute: number }): Date | undefined {
  if (!eta || eta.Month === 0) return undefined
  
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = eta.Month - 1 // JS months are 0-indexed
  
  // If the month has passed this year, assume next year
  const etaYear = month < now.getUTCMonth() ? year + 1 : year
  
  return new Date(Date.UTC(etaYear, month, eta.Day, eta.Hour, eta.Minute))
}
```

Store voyage data in class state and attach to next position:
```typescript
private voyageData: Map<string, { destination: string, eta?: Date, draught?: number }> = new Map()

// In ShipStaticData handler:
if (staticData.Destination) {
  this.voyageData.set(mmsi, {
    destination: staticData.Destination,
    eta: this.parseAISEta(staticData.Eta),
    draught: staticData.MaximumStaticDraught
  })
}

// In PositionReport handler:
const voyage = this.voyageData.get(mmsi)
await prisma.vesselPosition.create({
  data: {
    // ... existing fields
    destination: voyage?.destination,              // NEW
    eta: voyage?.eta,                             // NEW
    draught: voyage?.draught,                     // NEW (current voyage draught)
  }
})
```

#### 2.3 OpenShipData Enhancement
**File**: `lib/services/openshipdata-service.ts`

Update vessel upsert to include new fields:
```typescript
const vessel = await prisma.vessel.upsert({
  where: { mmsi: report.mmsi },
  update: {
    // ... existing
    height: report.heightMeters,                   // NEW
    captain: report.captain,                       // NEW
  },
  create: {
    // ... existing
    height: report.heightMeters,                   // NEW
    captain: report.captain,                       // NEW
  }
})
```

Add destination data to positions:
```typescript
await prisma.vesselPosition.create({
  data: {
    // ... existing
    destination: report.destinationName,           // NEW
    eta: report.etaSecUtc ? new Date(report.etaSecUtc * 1000) : undefined, // NEW
  }
})
```

### Phase 3: Database Migration (2 min)

```bash
# Generate migration
npx prisma migrate dev --name add_vessel_height_captain_position_accuracy

# Or for production (skip migration, just push)
npx prisma db push
```

## 🔄 Backfill Strategy for Existing Data

### Challenge
- **13,796 vessels** already in database
- **300,374 positions** already recorded
- Missing: destination, ETA, draught, rateOfTurn, positionAccuracy, height, captain

### Backfill Approaches

#### Option 1: Natural Backfill (Recommended for POC)
**Strategy**: Let new incoming data populate fields over time

**Pros**:
- Zero risk
- No database load
- Automatic as vessels transmit

**Cons**:
- Takes 1-7 days for full coverage (depending on vessel activity)

**Timeline**:
- Active vessels: 6-24 hours (transmit frequently)
- Occasional vessels: 2-7 days
- Inactive vessels: Never (acceptable - they're inactive)

#### Option 2: Active Re-ingestion (If needed urgently)
**Strategy**: Force re-fetch data for all active vessels

**Steps**:
1. Query all vessels with `active = true` and `lastSeen > NOW() - INTERVAL '7 days'`
2. For each MMSI, check if OpenShipData has recent data
3. Re-process to populate missing fields

**SQL to identify coverage gaps**:
```sql
-- Vessels missing height/captain
SELECT COUNT(*) 
FROM vessels 
WHERE active = true 
  AND (height IS NULL OR captain IS NULL);

-- Recent positions missing voyage data
SELECT COUNT(*) 
FROM vessel_positions 
WHERE timestamp > NOW() - INTERVAL '24 hours'
  AND (destination IS NULL OR eta IS NULL);
```

**Backfill script** (if needed):
```typescript
// scripts/backfill-vessel-voyage-data.ts
async function backfillVoyageData() {
  const activeVessels = await prisma.vessel.findMany({
    where: {
      active: true,
      lastSeen: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    },
    select: { mmsi: true }
  })
  
  console.log(`Backfilling ${activeVessels.length} active vessels...`)
  
  for (const vessel of activeVessels) {
    // Trigger re-ingestion by requesting current data
    // This will naturally populate the new fields
    await openshipDataService.lookupVessel(vessel.mmsi)
    await sleep(100) // Rate limit: 10/sec
  }
}
```

#### Option 3: Hybrid Approach (Best Balance)
**Strategy**: 
1. **Immediate**: Deploy code changes → new data populates automatically
2. **Day 1-2**: Monitor coverage metrics
3. **Day 3**: If coverage < 70%, run targeted backfill for high-priority vessels only

**High-priority criteria**:
- Vessels with recent alerts
- Vessels in monitored zones
- Vessels > 200m length (large commercial ships)

## 📈 Success Metrics

### Coverage Targets (7 days post-deployment)

| Field | Target Coverage | Measurement |
|-------|----------------|-------------|
| `destination` | 60%+ of active vessels | Vessels transmit this when underway |
| `eta` | 50%+ of active vessels | Only available when voyage is set |
| `draught` | 80%+ of active vessels | Most vessels transmit |
| `rateOfTurn` | 95%+ of positions | Transmitted in every position report |
| `positionAccuracy` | 95%+ of positions | Transmitted in every position report |
| `height` | 30%+ of vessels | OpenShipData coverage is spotty |
| `captain` | 20%+ of vessels | Only available for some vessels |

### Monitoring Queries

```sql
-- Coverage dashboard
SELECT 
  COUNT(*) as total_active_vessels,
  COUNT(CASE WHEN height IS NOT NULL THEN 1 END) as has_height,
  COUNT(CASE WHEN captain IS NOT NULL THEN 1 END) as has_captain,
  ROUND(100.0 * COUNT(CASE WHEN height IS NOT NULL THEN 1 END) / COUNT(*), 2) as height_coverage_pct,
  ROUND(100.0 * COUNT(CASE WHEN captain IS NOT NULL THEN 1 END) / COUNT(*), 2) as captain_coverage_pct
FROM vessels
WHERE active = true
  AND last_seen > NOW() - INTERVAL '7 days';

-- Recent positions coverage
SELECT 
  COUNT(*) as total_positions,
  COUNT(CASE WHEN destination IS NOT NULL THEN 1 END) as has_destination,
  COUNT(CASE WHEN eta IS NOT NULL THEN 1 END) as has_eta,
  COUNT(CASE WHEN rate_of_turn IS NOT NULL THEN 1 END) as has_rot,
  COUNT(CASE WHEN position_accuracy IS NOT NULL THEN 1 END) as has_accuracy,
  ROUND(100.0 * COUNT(CASE WHEN destination IS NOT NULL THEN 1 END) / COUNT(*), 2) as dest_coverage_pct
FROM vessel_positions
WHERE timestamp > NOW() - INTERVAL '24 hours';
```

## 🚀 Deployment Plan

### Step 1: Update Schema (Production)
```bash
cd /Users/yash/weather-alert
npx prisma db push
```

### Step 2: Update Code & Deploy
```bash
# Run tests locally (if any)
npm run test

# Deploy to Railway
railway service peaceful-abundance
railway up
```

### Step 3: Monitor (First 24 hours)
- Check logs for any errors in new field extraction
- Run coverage queries every 6 hours
- Verify no performance degradation

### Step 4: Validate (Day 2-3)
- Sample 10 random vessels and verify data accuracy
- Check that destination/ETA make sense
- Confirm rateOfTurn values are within expected range (-720 to +720 deg/min)

### Step 5: Backfill Decision (Day 3)
- If coverage < 50% for critical fields → Run targeted backfill
- If coverage > 50% → Continue natural backfill
- If coverage > 80% → Success, no action needed

## 🎯 Implementation Order

1. ✅ **Schema migration** (2 min)
2. ✅ **AISStream PositionReport** - rateOfTurn, positionAccuracy (10 min)
3. ✅ **AISStream ShipStaticData** - destination, ETA to positions (15 min)
4. ✅ **OpenShipData** - height, captain, destinationName, ETA (10 min)
5. ✅ **Deploy** (5 min)
6. ⏳ **Monitor coverage** (48 hours)
7. 🔄 **Backfill if needed** (optional, 1 hour)

**Total Estimated Time**: 1 hour implementation + 48 hours natural backfill

## 📝 Notes

### Data Quality Considerations

**Destination field**:
- Often contains `@@@@@@@@` characters as padding
- Should strip/clean before storing
- Empty destinations should be NULL not empty string

**ETA parsing**:
- AIS ETA format is `{Month, Day, Hour, Minute}` - no year
- Must infer year intelligently (could be current or next year)
- Month=0 means "not available"

**Rate of Turn**:
- Values: -720 to +720 degrees per minute
- Special values: 0 = not turning, -128 = not available
- Should validate range before storing

**Height**:
- Critical for bridge clearance calculations
- Should be stored in meters consistently
- Validate reasonable range (1-100m for most vessels)

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Schema change breaks app | High | Test locally first, use `db push` not `migrate` |
| Increased storage costs | Medium | Monitor database size, retention already planned |
| New fields cause null errors | Medium | Use optional chaining `field?.value` everywhere |
| Backfill overloads DB | Low | Rate limit, run during low-traffic hours |
| Bad data quality | Medium | Add validation, sanitization for destination/ETA |

## 🎉 Expected Benefits

1. **Better vessel tracking**: Know where ships are going and when they'll arrive
2. **Collision risk detection**: Rate of turn indicates maneuvering vessels
3. **Bridge clearance**: Height data prevents bridge strikes
4. **Emergency contact**: Captain information for critical alerts
5. **Voyage planning**: Destination coordinates for route analysis
6. **Data accuracy**: Position accuracy flag for GPS quality assessment

## 📊 Storage Impact Estimate

**Current**: 300,374 positions × ~100 bytes = ~30 MB  
**After**: 300,374 positions × ~140 bytes = ~42 MB  
**Increase**: ~12 MB (~40% increase in position table size)

**For 1M positions/month**: Additional ~40 MB/month storage  
**Cost impact**: Negligible (< $0.01/month on Railway)
