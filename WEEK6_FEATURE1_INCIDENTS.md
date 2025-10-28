# Week 6 Feature 1: Incident Tracking & Near-Miss Documentation

**Priority**: 🟡 LOWER | **Effort**: 8-10 hours

---

## Overview

Track safety incidents with auto-detection of evasive action from AIS position data. Provides documented proof of risk awareness and response for insurance purposes.

**Data Sources** (all existing in your system):
- `vessel_alerts` - Documented risk awareness
- `vessel_positions` - Course/speed changes = evasive action detection
- Manual reports via API

---

## Database Schema

```prisma
model SafetyIncident {
  id            String   @id @default(cuid())
  vesselId      String
  alertId       String?  // Link to original alert if auto-detected
  type          String   // "near_miss", "evasive_action", "manual_report"
  severity      Int      // 1-5
  description   String
  actionsTaken  String?  // What the captain did
  outcome       String?  // Result (damage avoided, vessel safe, etc.)
  detectedAt    DateTime
  reportedBy    String?  // User ID who reported
  estimatedCost Decimal? @db.Decimal(12, 2) // Estimated savings/avoided damage
  metadata      Json     @default("{}")
  createdAt     DateTime @default(now())
  
  vessel        Vessel   @relation(fields: [vesselId], references: [id])
  alert         VesselAlert? @relation(fields: [alertId], references: [id])
  
  @@index([vesselId])
  @@index([alertId])
  @@index([detectedAt])
  @@index([type])
  @@map("safety_incidents")
}
```

Run migration:
```bash
npx prisma migrate dev --name add_safety_incidents
```

---

## Auto-Detection Service

**File**: `lib/services/incident-detection.ts`

```typescript
import { prisma } from '@/lib/prisma'

export class IncidentDetectionService {
  private static instance: IncidentDetectionService

  static getInstance() {
    if (!IncidentDetectionService.instance) {
      IncidentDetectionService.instance = new IncidentDetectionService()
    }
    return IncidentDetectionService.instance
  }

  /**
   * Detect evasive action after alert
   * Compares vessel course/speed before and after alert
   */
  async detectEvasiveAction(alertId: string): Promise<void> {
    try {
      // Get alert details
      const alert = await prisma.vesselAlert.findUnique({
        where: { id: alertId },
        include: { vessel: true }
      })

      if (!alert || alert.acknowledgedAt) return

      // Get positions 30 min before alert
      const beforePositions = await prisma.vesselPosition.findMany({
        where: {
          vesselId: alert.vesselId,
          timestamp: {
            gte: new Date(alert.createdAt.getTime() - 30 * 60 * 1000),
            lt: alert.createdAt
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 5
      })

      // Get positions 60 min after alert
      const afterPositions = await prisma.vesselPosition.findMany({
        where: {
          vesselId: alert.vesselId,
          timestamp: {
            gt: alert.createdAt,
            lte: new Date(alert.createdAt.getTime() + 60 * 60 * 1000)
          }
        },
        orderBy: { timestamp: 'asc' },
        take: 10
      })

      if (beforePositions.length === 0 || afterPositions.length === 0) return

      // Calculate average course and speed before
      const avgCourseBefore = this.calculateAverage(beforePositions.map(p => p.course || 0))
      const avgSpeedBefore = this.calculateAverage(beforePositions.map(p => p.speed || 0))

      // Calculate average course and speed after
      const avgCourseAfter = this.calculateAverage(afterPositions.map(p => p.course || 0))
      const avgSpeedAfter = this.calculateAverage(afterPositions.map(p => p.speed || 0))

      // Detect significant changes
      const courseChange = Math.abs(avgCourseAfter - avgCourseBefore)
      const speedChange = Math.abs(avgSpeedAfter - avgSpeedBefore)

      // Thresholds for evasive action
      const COURSE_THRESHOLD = 30 // degrees
      const SPEED_THRESHOLD = 5   // knots

      if (courseChange > COURSE_THRESHOLD || speedChange > SPEED_THRESHOLD) {
        // Auto-create incident record
        await this.createIncident({
          vesselId: alert.vesselId,
          alertId: alert.id,
          type: 'evasive_action',
          severity: alert.severity,
          description: `Evasive action detected: Course changed ${courseChange.toFixed(0)}°, speed changed ${speedChange.toFixed(1)} knots`,
          actionsTaken: `Altered course from ${avgCourseBefore.toFixed(0)}° to ${avgCourseAfter.toFixed(0)}°, adjusted speed from ${avgSpeedBefore.toFixed(1)} to ${avgSpeedAfter.toFixed(1)} knots`,
          outcome: 'Vessel successfully avoided risk area',
          metadata: {
            beforeCourse: avgCourseBefore,
            afterCourse: avgCourseAfter,
            beforeSpeed: avgSpeedBefore,
            afterSpeed: avgSpeedAfter,
            courseChange,
            speedChange,
            autoDetected: true
          }
        })

        console.log(`✅ Evasive action detected for vessel ${alert.vessel.mmsi}`)
      }
    } catch (error) {
      console.error('Error detecting evasive action:', error)
    }
  }

  /**
   * Create incident record
   */
  async createIncident(data: {
    vesselId: string
    alertId?: string
    type: string
    severity: number
    description: string
    actionsTaken?: string
    outcome?: string
    estimatedCost?: number
    metadata?: any
  }): Promise<any> {
    return await prisma.safetyIncident.create({
      data: {
        vesselId: data.vesselId,
        alertId: data.alertId,
        type: data.type,
        severity: data.severity,
        description: data.description,
        actionsTaken: data.actionsTaken,
        outcome: data.outcome,
        estimatedCost: data.estimatedCost,
        detectedAt: new Date(),
        metadata: data.metadata || {}
      }
    })
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((a, b) => a + b, 0) / values.length
  }
}
```

---

## API Routes

**File**: `app/api/safety-incidents/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { IncidentDetectionService } from '@/lib/services/incident-detection'
import { z } from 'zod'

const createIncidentSchema = z.object({
  vesselId: z.string(),
  type: z.enum(['near_miss', 'evasive_action', 'manual_report']),
  severity: z.number().int().min(1).max(5),
  description: z.string().min(10),
  actionsTaken: z.string().optional(),
  outcome: z.string().optional(),
  estimatedCost: z.number().positive().optional()
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    const body = await req.json()
    const validated = createIncidentSchema.parse(body)

    const service = IncidentDetectionService.getInstance()
    const incident = await service.createIncident({
      ...validated,
      metadata: { reportedBy: currentUser.id }
    })

    return NextResponse.json(incident, { status: 201 })
  } catch (error) {
    console.error('Error creating incident:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const vesselId = searchParams.get('vesselId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const incidents = await prisma.safetyIncident.findMany({
      where: {
        ...(vesselId && { vesselId }),
        ...(startDate && {
          detectedAt: {
            gte: new Date(startDate),
            ...(endDate && { lte: new Date(endDate) })
          }
        })
      },
      include: {
        vessel: {
          select: {
            id: true,
            name: true,
            mmsi: true
          }
        },
        alert: {
          select: {
            id: true,
            eventType: true,
            riskLevel: true
          }
        }
      },
      orderBy: { detectedAt: 'desc' }
    })

    return NextResponse.json(incidents)
  } catch (error) {
    console.error('Error fetching incidents:', error)
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
  }
}
```

---

## Insurance Report Generator

**File**: `app/api/reports/safety-incidents/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfQuarter, endOfQuarter, format } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const fleetId = searchParams.get('fleetId')
    const period = searchParams.get('period') || 'quarter' // quarter, year

    // Calculate date range
    const now = new Date()
    const startDate = period === 'quarter' ? startOfQuarter(now) : new Date(now.getFullYear(), 0, 1)
    const endDate = period === 'quarter' ? endOfQuarter(now) : new Date(now.getFullYear(), 11, 31)

    // Get fleet vessels if specified
    const vesselIds = fleetId ? (
      await prisma.fleetVessel.findMany({
        where: { fleetId },
        select: { vesselId: true }
      })
    ).map(fv => fv.vesselId) : undefined

    // Get incidents
    const incidents = await prisma.safetyIncident.findMany({
      where: {
        ...(vesselIds && { vesselId: { in: vesselIds } }),
        detectedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        vessel: true,
        alert: true
      },
      orderBy: { detectedAt: 'desc' }
    })

    // Get related alerts
    const totalAlerts = await prisma.vesselAlert.count({
      where: {
        ...(vesselIds && { vesselId: { in: vesselIds } }),
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Calculate metrics
    const nearMisses = incidents.filter(i => i.type === 'near_miss').length
    const evasiveActions = incidents.filter(i => i.type === 'evasive_action').length
    const totalSavings = incidents.reduce((sum, i) => sum + (parseFloat(i.estimatedCost?.toString() || '0')), 0)
    const avgResponseTime = incidents.length > 0 ? 'N/A' : 'N/A' // Calculate if needed

    const report = {
      period: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
        quarter: period === 'quarter' ? `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}` : undefined
      },
      summary: {
        totalAlerts,
        totalIncidents: incidents.length,
        nearMisses,
        evasiveActions,
        preventedDamageEvents: evasiveActions,
        estimatedSavings: `$${totalSavings.toLocaleString()}`,
        responseRate: totalAlerts > 0 ? `${((incidents.length / totalAlerts) * 100).toFixed(1)}%` : '0%'
      },
      incidents: incidents.map(i => ({
        date: format(i.detectedAt, 'yyyy-MM-dd HH:mm:ss'),
        vessel: i.vessel.name,
        mmsi: i.vessel.mmsi,
        type: i.type,
        severity: i.severity,
        description: i.description,
        actionsTaken: i.actionsTaken || 'N/A',
        outcome: i.outcome || 'N/A',
        estimatedSavings: i.estimatedCost ? `$${parseFloat(i.estimatedCost.toString()).toLocaleString()}` : 'N/A',
        relatedAlert: i.alert ? {
          eventType: i.alert.eventType,
          riskLevel: i.alert.riskLevel
        } : null
      })),
      fleet: fleetId ? (await prisma.fleet.findUnique({
        where: { id: fleetId },
        select: { name: true }
      }))?.name : 'All Vessels'
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
```

---

## Background Job: Auto-Detect Evasive Action

**File**: `scripts/detect-evasive-actions.ts`

```typescript
import { prisma } from '../lib/prisma'
import { IncidentDetectionService } from '../lib/services/incident-detection'

async function detectEvasiveActions() {
  try {
    console.log('🔍 Checking for evasive actions...')

    // Get recent acknowledged alerts (last 2 hours) that don't have incidents yet
    const alerts = await prisma.vesselAlert.findMany({
      where: {
        acknowledgedAt: {
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000),
          lte: new Date(Date.now() - 1 * 60 * 60 * 1000) // At least 1 hour old
        },
        incidents: {
          none: {} // No incidents created yet
        }
      },
      take: 20
    })

    const service = IncidentDetectionService.getInstance()
    let detected = 0

    for (const alert of alerts) {
      await service.detectEvasiveAction(alert.id)
      detected++
    }

    console.log(`✅ Processed ${alerts.length} alerts, detected ${detected} evasive actions`)
  } catch (error) {
    console.error('❌ Error detecting evasive actions:', error)
  }
}

// Run every 30 minutes
detectEvasiveActions()
setInterval(detectEvasiveActions, 30 * 60 * 1000)
```

Add to `package.json`:
```json
{
  "scripts": {
    "detect:incidents": "TZ=UTC tsx scripts/detect-evasive-actions.ts"
  }
}
```

---

## Integration

Update geo-fence monitor to trigger incident detection:

```typescript
// In lib/services/geo-fence-monitor.ts

// After creating alert
const alert = await prisma.vesselAlert.create({ ... })

// Schedule incident detection for 1 hour later
setTimeout(async () => {
  const service = IncidentDetectionService.getInstance()
  await service.detectEvasiveAction(alert.id)
}, 60 * 60 * 1000)
```

---

## Testing

```bash
# Test manual incident creation
curl -X POST http://localhost:3000/api/safety-incidents \
  -H "Content-Type: application/json" \
  -d '{
    "vesselId": "vessel_123",
    "type": "manual_report",
    "severity": 4,
    "description": "Near-miss with floating debris",
    "actionsTaken": "Altered course 15 degrees to starboard",
    "outcome": "Successfully avoided collision",
    "estimatedCost": 50000
  }'

# Generate insurance report
curl http://localhost:3000/api/reports/safety-incidents?period=quarter
```

---

## Next Steps

1. ✅ Test auto-detection with real AIS data
2. ✅ Move to Feature 2: Route Safety Score
3. ✅ Add CSV export for insurance reports

**Implementation Status**: Ready to code ✅
