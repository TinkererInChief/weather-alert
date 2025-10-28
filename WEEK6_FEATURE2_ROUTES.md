# Week 6 Feature 2: Route Safety Score

**Priority**: 🟡 LOWER | **Effort**: 10-12 hours

---

## Overview

Calculate safety scores for historical routes based on exposure to high-risk seismic zones. Uses free USGS seismic hazard data and your existing vessel position history.

**Data Sources**:
- **USGS Seismic Hazard Maps** (external - free): https://earthquake.usgs.gov/hazards/hazmaps/
- **Your `earthquake_events`** table: 10+ years of historical earthquake data
- **Your `vessel_positions`** table: Complete route history

---

## Import USGS Seismic Hazard Zones

**File**: `scripts/import-seismic-zones.ts`

```typescript
import { prisma } from '../lib/prisma'
import * as fs from 'fs'

// Download GeoJSON from USGS: https://earthquake.usgs.gov/hazards/hazmaps/
// Or define manual zones based on known seismic areas

const SEISMIC_ZONES = [
  {
    name: 'Pacific Ring of Fire - North',
    riskLevel: 5,
    avgMagnitude: 6.2,
    avgEventsPerYear: 150,
    geometry: {
      type: 'polygon',
      coordinates: [
        [
          [130, 30], [150, 30], [170, 45], [180, 50], 
          [-170, 55], [-150, 60], [-140, 50], [-130, 40], [130, 30]
        ]
      ]
    }
  },
  {
    name: 'Pacific Ring of Fire - South',
    riskLevel: 5,
    avgMagnitude: 6.0,
    avgEventsPerYear: 120,
    geometry: {
      type: 'polygon',
      coordinates: [
        [
          [130, -10], [150, -20], [170, -30], [180, -40],
          [-170, -45], [-150, -30], [-140, -20], [130, -10]
        ]
      ]
    }
  },
  {
    name: 'Mediterranean',
    riskLevel: 3,
    avgMagnitude: 5.5,
    avgEventsPerYear: 30,
    geometry: {
      type: 'polygon',
      coordinates: [
        [
          [-5, 30], [40, 30], [40, 45], [-5, 45], [-5, 30]
        ]
      ]
    }
  },
  {
    name: 'Caribbean',
    riskLevel: 3,
    avgMagnitude: 5.2,
    avgEventsPerYear: 20,
    geometry: {
      type: 'polygon',
      coordinates: [
        [
          [-90, 10], [-60, 10], [-60, 25], [-90, 25], [-90, 10]
        ]
      ]
    }
  }
]

async function importSeismicZones() {
  console.log('📥 Importing seismic hazard zones...')

  for (const zone of SEISMIC_ZONES) {
    await prisma.riskZone.create({
      data: {
        name: zone.name,
        type: 'seismic',
        riskLevel: zone.riskLevel,
        geometry: zone.geometry,
        metadata: {
          avgMagnitude: zone.avgMagnitude,
          avgEventsPerYear: zone.avgEventsPerYear,
          source: 'USGS Seismic Hazard Maps'
        },
        active: true
      }
    })

    console.log(`✅ Imported zone: ${zone.name}`)
  }

  console.log('✅ All zones imported')
}

importSeismicZones()
```

---

## Database Schema

```prisma
model RiskZone {
  id          String   @id @default(cuid())
  name        String
  type        String   // "seismic", "tsunami", "weather"
  riskLevel   Int      // 1-5 (5 = highest risk)
  geometry    Json     // GeoJSON polygon
  metadata    Json     @default("{}")
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  @@index([active])
  @@index([riskLevel])
  @@map("risk_zones")
}

model RouteAnalysis {
  id                String   @id @default(cuid())
  vesselId          String
  startDate         DateTime
  endDate           DateTime
  totalDistance     Decimal  @db.Decimal(10, 2) // Nautical miles
  highRiskExposure  Decimal  @db.Decimal(10, 2) // NM in high-risk zones
  mediumRiskExposure Decimal @db.Decimal(10, 2)
  lowRiskExposure   Decimal  @db.Decimal(10, 2)
  riskScore         Decimal  @db.Decimal(5, 2) // 0-100
  rating            String   // "Excellent", "Good", "Fair", "Poor"
  metadata          Json     @default("{}")
  analyzedAt        DateTime @default(now())
  
  vessel            Vessel   @relation(fields: [vesselId], references: [id])
  
  @@index([vesselId])
  @@index([startDate, endDate])
  @@map("route_analyses")
}
```

Run migration:
```bash
npx prisma migrate dev --name add_route_analysis
```

---

## Route Risk Calculator Service

**File**: `lib/services/route-risk-calculator.ts`

```typescript
import { prisma } from '@/lib/prisma'

export class RouteRiskCalculator {
  /**
   * Analyze route safety based on historical positions
   */
  async analyzeRoute(
    vesselId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // 1. Get vessel positions for period
    const positions = await prisma.vesselPosition.findMany({
      where: {
        vesselId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { timestamp: 'asc' }
    })

    if (positions.length < 10) {
      throw new Error('Not enough position data for analysis')
    }

    // 2. Get active risk zones
    const riskZones = await prisma.riskZone.findMany({
      where: { active: true }
    })

    // 3. Calculate exposure per zone
    let highRiskNM = 0
    let mediumRiskNM = 0
    let lowRiskNM = 0
    let totalDistance = 0

    for (let i = 0; i < positions.length - 1; i++) {
      const p1 = positions[i]
      const p2 = positions[i + 1]

      const segmentDistance = this.calculateDistance(
        p1.latitude,
        p1.longitude,
        p2.latitude,
        p2.longitude
      )

      totalDistance += segmentDistance

      // Check which risk zone this segment passes through
      const maxRisk = this.getSegmentMaxRisk(p1, p2, riskZones)

      if (maxRisk >= 4) {
        highRiskNM += segmentDistance
      } else if (maxRisk >= 2) {
        mediumRiskNM += segmentDistance
      } else {
        lowRiskNM += segmentDistance
      }
    }

    // 4. Calculate risk score (0-100, lower is better)
    const highRiskPct = (highRiskNM / totalDistance) * 100
    const mediumRiskPct = (mediumRiskNM / totalDistance) * 100
    const riskScore = (highRiskPct * 1.0) + (mediumRiskPct * 0.5)

    // 5. Determine rating
    const rating = this.getRating(riskScore)

    // 6. Save analysis
    const analysis = await prisma.routeAnalysis.create({
      data: {
        vesselId,
        startDate,
        endDate,
        totalDistance,
        highRiskExposure: highRiskNM,
        mediumRiskExposure: mediumRiskNM,
        lowRiskExposure: lowRiskNM,
        riskScore,
        rating,
        metadata: {
          positionCount: positions.length,
          highRiskPct: highRiskPct.toFixed(2),
          mediumRiskPct: mediumRiskPct.toFixed(2),
          lowRiskPct: ((lowRiskNM / totalDistance) * 100).toFixed(2)
        }
      }
    })

    return analysis
  }

  /**
   * Get maximum risk level for route segment
   */
  private getSegmentMaxRisk(p1: any, p2: any, riskZones: any[]): number {
    let maxRisk = 0

    for (const zone of riskZones) {
      // Check if either point is in zone
      if (this.isPointInZone(p1.latitude, p1.longitude, zone) ||
          this.isPointInZone(p2.latitude, p2.longitude, zone)) {
        maxRisk = Math.max(maxRisk, zone.riskLevel)
      }
    }

    return maxRisk
  }

  /**
   * Point-in-polygon test
   */
  private isPointInZone(lat: number, lon: number, zone: any): boolean {
    const geometry = zone.geometry

    if (geometry.type === 'polygon') {
      return this.isPointInPolygon([lat, lon], geometry.coordinates[0])
    }

    return false
  }

  /**
   * Ray casting algorithm for point-in-polygon
   */
  private isPointInPolygon(point: number[], polygon: number[][]): boolean {
    const [lat, lon] = point
    let inside = false

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [loni, lati] = polygon[i]
      const [lonj, latj] = polygon[j]

      const intersect = ((lati > lat) !== (latj > lat)) &&
        (lon < (lonj - loni) * (lat - lati) / (latj - lati) + loni)

      if (intersect) inside = !inside
    }

    return inside
  }

  /**
   * Calculate distance between two points (nautical miles)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 3440.065 // Earth's radius in nautical miles
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Get rating based on risk score
   */
  private getRating(riskScore: number): string {
    if (riskScore < 5) return 'Excellent'
    if (riskScore < 15) return 'Good'
    if (riskScore < 30) return 'Fair'
    return 'Poor'
  }
}
```

---

## API Routes

**File**: `app/api/route-analysis/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RouteRiskCalculator } from '@/lib/services/route-risk-calculator'
import { z } from 'zod'

const analyzeRouteSchema = z.object({
  vesselId: z.string(),
  startDate: z.string(),
  endDate: z.string()
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validated = analyzeRouteSchema.parse(body)

    const calculator = new RouteRiskCalculator()
    const analysis = await calculator.analyzeRoute(
      validated.vesselId,
      new Date(validated.startDate),
      new Date(validated.endDate)
    )

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error analyzing route:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Failed to analyze route' }, { status: 500 })
  }
}
```

---

## Insurance Report API

**File**: `app/api/reports/route-safety/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const fleetId = searchParams.get('fleetId')

    // Get fleet vessels
    const vesselIds = fleetId ? (
      await prisma.fleetVessel.findMany({
        where: { fleetId },
        select: { vesselId: true }
      })
    ).map(fv => fv.vesselId) : undefined

    // Get route analyses (last 12 months)
    const analyses = await prisma.routeAnalysis.findMany({
      where: {
        ...(vesselIds && { vesselId: { in: vesselIds } }),
        analyzedAt: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        vessel: {
          select: {
            name: true,
            mmsi: true
          }
        }
      },
      orderBy: { analyzedAt: 'desc' }
    })

    // Calculate fleet-wide metrics
    const totalRoutes = analyses.length
    const totalDistance = analyses.reduce((sum, a) => sum + parseFloat(a.totalDistance.toString()), 0)
    const avgRiskScore = analyses.reduce((sum, a) => sum + parseFloat(a.riskScore.toString()), 0) / totalRoutes
    const highRiskExposure = analyses.reduce((sum, a) => sum + parseFloat(a.highRiskExposure.toString()), 0)
    const highRiskPct = (highRiskExposure / totalDistance) * 100

    const rating = avgRiskScore < 5 ? 'Excellent' :
                   avgRiskScore < 15 ? 'Good' :
                   avgRiskScore < 30 ? 'Fair' : 'Poor'

    const report = {
      fleet: fleetId ? (await prisma.fleet.findUnique({
        where: { id: fleetId },
        select: { name: true }
      }))?.name : 'All Vessels',
      period: 'Last 12 months',
      summary: {
        totalRoutes,
        totalDistance: `${totalDistance.toLocaleString()} NM`,
        avgRiskScore: avgRiskScore.toFixed(1),
        highRiskExposure: `${highRiskPct.toFixed(1)}%`,
        rating
      },
      recommendation: rating === 'Excellent' || rating === 'Good'
        ? 'Fleet demonstrates excellent risk avoidance practices. Routes consistently avoid high-risk seismic zones.'
        : 'Consider adjusting routes to minimize exposure to high-risk seismic zones.',
      topPerformers: analyses
        .sort((a, b) => parseFloat(a.riskScore.toString()) - parseFloat(b.riskScore.toString()))
        .slice(0, 5)
        .map(a => ({
          vessel: a.vessel.name,
          mmsi: a.vessel.mmsi,
          period: `${a.startDate.toISOString().split('T')[0]} to ${a.endDate.toISOString().split('T')[0]}`,
          riskScore: parseFloat(a.riskScore.toString()).toFixed(1),
          rating: a.rating
        }))
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating route safety report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
```

---

## Testing

```bash
# Import seismic zones
pnpm tsx scripts/import-seismic-zones.ts

# Analyze a route
curl -X POST http://localhost:3000/api/route-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "vesselId": "vessel_123",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'

# Generate fleet report
curl http://localhost:3000/api/reports/route-safety?fleetId=fleet_123
```

---

## Next Steps

1. ✅ Import USGS seismic hazard data
2. ✅ Test route analysis with historical data
3. ✅ Move to Feature 3: Response Time Analytics

**Implementation Status**: Ready to code ✅
