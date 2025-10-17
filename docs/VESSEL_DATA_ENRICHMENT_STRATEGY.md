# Vessel Data Enrichment Strategy

## Current State vs Target State

### ✅ Already Capturing (from AIS/OpenShipData)
- MMSI, IMO, Name, Callsign
- Length, Width, Draught, Flag
- VesselType, Height (new)
- Position, Speed, Course, Heading

### ❌ Missing (Require External Sources)
- **Gross Tonnage** - Vessel size/capacity
- **Owner** - Legal vessel owner
- **Operator** - Company operating the vessel
- **Captain** - Current master (voyage-specific)

## Architectural Decision: Captain Location

### ❌ WRONG: Captain in Vessel Table
```prisma
model Vessel {
  captain String?  // ❌ Captains change between voyages!
}
```

### ✅ CORRECT: Captain in VesselPosition Table
```prisma
model VesselPosition {
  captain String?  // ✅ Voyage-specific, changes with crew rotation
}
```

**Rationale:**
- Captains are assigned per voyage, not permanently to vessels
- Historical tracking: "Who was captain when vessel X was at location Y on date Z?"
- Same vessel can have different captains on different days
- Allows tracking captain performance, routes taken by specific captains

### ✅ CORRECT: Owner/Operator in Vessel Table
```prisma
model Vessel {
  owner String?     // ✅ Changes only when vessel is sold
  operator String?  // ✅ Changes only when charter ends
  grossTonnage Float? // ✅ Fixed vessel characteristic
}
```

**Rationale:**
- These are vessel characteristics, not voyage data
- Change infrequently (months/years)
- Used for vessel identification and classification
- Don't need historical tracking of ownership changes (yet)

## Enrichment Strategy: Three-Tier Approach

### Tier 1: Free AIS Data (Current)
**Coverage**: 100% of tracked vessels  
**Fields**: MMSI, IMO, Name, Callsign, Flag, Dimensions, Type  
**Cost**: $0  
**Update Frequency**: Real-time

### Tier 2: Free Public Databases (Batch Enrichment)
**Source**: Equasis.org, OpenCorporates, Wikipedia  
**Coverage**: ~60% of commercial vessels with IMO  
**Fields**: Gross Tonnage, Owner (sometimes)  
**Cost**: $0  
**Update Frequency**: Monthly batch job  
**Approach**: Web scraping or manual CSV import

### Tier 3: Commercial APIs (On-Demand)
**Source**: VesselFinder, MarineTraffic, FleetMon  
**Coverage**: 90%+ commercial vessels  
**Fields**: All missing data  
**Cost**: $0.10-0.50 per lookup  
**Update Frequency**: On-demand for high-priority vessels

## Implementation Plan

### Phase 1: Schema Update (Immediate)
```prisma
model Vessel {
  // ... existing fields
  
  // Commercial data (from external sources)
  grossTonnage    Float?
  owner           String?
  operator        String?
  manager         String?   // Ship management company
  
  // Vessel details
  buildYear       Int?
  buildCountry    String?
  
  // Data quality
  enrichedAt      DateTime?  // When external data was last fetched
  enrichmentSource String?   // "equasis", "vesselfinder", "manual"
}

model VesselPosition {
  // ... existing fields
  
  // Voyage crew (from OpenShipData when available)
  captain         String?
}
```

### Phase 2: Free Enrichment Pipeline (Week 1)

**2.1 Create Equasis Scraper** (if legally allowed)
```typescript
// lib/enrichment/equasis-enricher.ts
export async function enrichFromEquasis(imo: string) {
  // Equasis requires login but is free
  // Could scrape or use their CSV export
  const data = await fetchEquasisData(imo)
  
  return {
    grossTonnage: data.gt,
    owner: data.registered_owner,
    buildYear: data.year_built,
    flag: data.flag
  }
}
```

**2.2 Create Batch Enrichment Job**
```typescript
// scripts/enrich-vessels-batch.ts
async function enrichHighPriorityVessels() {
  // Get vessels that need enrichment
  const vessels = await prisma.vessel.findMany({
    where: {
      imo: { not: null },
      enrichedAt: null,  // Never enriched
      active: true,
      OR: [
        { length: { gte: 100 } },  // Large vessels
        { vesselType: { in: ['cargo', 'tanker', 'passenger'] } }  // Commercial
      ]
    },
    take: 100,  // Batch size
    select: { id: true, imo: true, mmsi: true }
  })
  
  console.log(`Enriching ${vessels.length} vessels...`)
  
  for (const vessel of vessels) {
    try {
      const enrichment = await enrichFromEquasis(vessel.imo!)
      
      await prisma.vessel.update({
        where: { id: vessel.id },
        data: {
          ...enrichment,
          enrichedAt: new Date(),
          enrichmentSource: 'equasis'
        }
      })
      
      console.log(`✅ Enriched ${vessel.mmsi}`)
      await sleep(2000)  // Rate limit: 0.5 req/sec
      
    } catch (error) {
      console.error(`❌ Failed to enrich ${vessel.mmsi}:`, error)
    }
  }
}
```

**2.3 Schedule Daily Enrichment**
```typescript
// Add to vessel-ingestion-worker.ts
setInterval(async () => {
  await enrichHighPriorityVessels()
}, 24 * 60 * 60 * 1000)  // Once per day
```

### Phase 3: Paid API Integration (On-Demand)

**3.1 VesselFinder API Setup**
```typescript
// lib/enrichment/vesselfinder-enricher.ts
export class VesselFinderEnricher {
  private apiKey = process.env.VESSELFINDER_API_KEY
  private baseUrl = 'https://api.vesselfinder.com'
  
  async enrichVessel(mmsi: string) {
    const response = await fetch(
      `${this.baseUrl}/vesselsearch?userkey=${this.apiKey}&mmsi=${mmsi}`
    )
    
    if (!response.ok) throw new Error(`VesselFinder API error: ${response.status}`)
    
    const data = await response.json()
    
    return {
      grossTonnage: data.GT,
      owner: data.OWNER,
      operator: data.OPERATOR,
      manager: data.MANAGER,
      buildYear: data.YEAR_BUILT
    }
  }
}
```

**3.2 Selective Enrichment Trigger**
```typescript
// Enrich on-demand for critical vessels
async function enrichIfNeeded(vesselId: string) {
  const vessel = await prisma.vessel.findUnique({
    where: { id: vesselId },
    select: { grossTonnage: true, enrichedAt: true }
  })
  
  // Only enrich if:
  // 1. Never enriched, OR
  // 2. High value vessel and enrichment is stale (>90 days)
  const needsEnrichment = 
    !vessel.enrichedAt ||
    (vessel.length > 200 && isOlderThan(vessel.enrichedAt, 90))
  
  if (needsEnrichment) {
    const enricher = new VesselFinderEnricher()
    const data = await enricher.enrichVessel(vessel.mmsi)
    
    await prisma.vessel.update({
      where: { id: vesselId },
      data: {
        ...data,
        enrichedAt: new Date(),
        enrichmentSource: 'vesselfinder'
      }
    })
  }
}
```

### Phase 4: Captain Data from OpenShipData

**4.1 Update OpenShipData Processing**
```typescript
// lib/services/openshipdata-service.ts
await prisma.vesselPosition.create({
  data: {
    vesselId: vessel.id,
    latitude: report.point.latitude,
    longitude: report.point.longitude,
    speed: this.kmhToKnots(report.speedKmh),
    course: report.bearingDeg,
    captain: report.captain,  // ✅ Add captain to position
    timestamp: new Date(report.timeSecUtc * 1000),
    dataSource: 'openshipdata'
  }
})
```

## Priority & Coverage

### High Priority (Enrich First)
- Cargo vessels > 100m
- Tankers (all sizes)
- Passenger vessels
- Vessels with recent alerts
- Vessels in monitored zones

### Coverage Targets (90 days)

| Field | Free Sources | Paid API | Combined Target |
|-------|--------------|----------|-----------------|
| Gross Tonnage | 40% | 85% | 90% |
| Owner | 30% | 80% | 85% |
| Operator | 20% | 75% | 80% |
| Captain | 15% | N/A | 15% |

### Cost Estimates

**Scenario: 13,796 vessels in database**

**Option A: Free Only**
- Cost: $0
- Coverage: 40% gross tonnage, 30% owner
- Time: 2-4 weeks (rate limits)

**Option B: Hybrid (Recommended)**
- Free enrichment: 8,000 vessels (60% of total)
- Paid enrichment: 2,000 high-priority vessels
- Cost: $200-400 one-time
- Coverage: 85%+ for all fields
- Time: 1 week

**Option C: Paid Only**
- Enrich all 13,796 vessels
- Cost: $1,400-7,000 one-time
- Coverage: 90%+
- Time: 2 days

## Data Quality & Validation

### Validation Rules
```typescript
function validateEnrichment(data: any) {
  // Gross tonnage should be reasonable
  if (data.grossTonnage && (data.grossTonnage < 10 || data.grossTonnage > 500000)) {
    throw new Error('Invalid gross tonnage')
  }
  
  // Owner should not be empty string
  if (data.owner === '' || data.owner === 'N/A') {
    data.owner = null
  }
  
  // Build year should be reasonable
  if (data.buildYear && (data.buildYear < 1900 || data.buildYear > new Date().getFullYear())) {
    throw new Error('Invalid build year')
  }
  
  return data
}
```

### Data Freshness Strategy
- **Static data** (GT, build year): Never refresh
- **Semi-static** (owner, operator): Refresh every 6-12 months
- **Dynamic** (captain): Refresh with each position update

## Recommended Next Steps

1. ✅ **Update schema** - Add grossTonnage, owner, operator to Vessel
2. ✅ **Move captain** - Add to VesselPosition instead of Vessel
3. ✅ **Add enrichment metadata** - enrichedAt, enrichmentSource fields
4. 🔄 **Build free enrichment** - Equasis scraper for batch enrichment
5. 🔄 **Integrate paid API** - VesselFinder for on-demand high-priority enrichment
6. 📊 **Monitor coverage** - Track enrichment progress and data quality

## Alternative: Manual CSV Import

For POC, could also:
1. Export list of IMO numbers: `SELECT DISTINCT imo FROM vessels WHERE imo IS NOT NULL`
2. Manually look up on Equasis.org (bulk CSV export available)
3. Import CSV back into database

**Pros**: No API costs, no rate limits  
**Cons**: Manual effort, one-time only, not automated
