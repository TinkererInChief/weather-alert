# Week 3 Day 1-3: Geo-Fence Monitor Service

**Priority**: 🔴 CRITICAL | **Effort**: 18-22 hours

---

## Overview

Automatic proximity detection that monitors fleet vessels against earthquake/tsunami events every 2 minutes and auto-triggers alerts for vessels at risk.

**Flow**: Monitor → Detect Event → Find Vessels in Radius → Check Risk → Create Alert → Dispatch Notifications → Start Escalation

---

## Geo-Fence Monitor Service

**File**: `lib/services/geo-fence-monitor.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { EscalationService } from './escalation-service'
import { ContactHierarchyService } from './contact-hierarchy'
import { AlertQueue } from './alert-queue'

type RiskLevel = 'critical' | 'high' | 'moderate' | 'low'

export class GeoFenceMonitor {
  private static instance: GeoFenceMonitor
  private escalationService: EscalationService
  private contactService: ContactHierarchyService

  private constructor() {
    this.escalationService = EscalationService.getInstance()
    this.contactService = ContactHierarchyService.getInstance()
  }

  static getInstance() {
    if (!GeoFenceMonitor.instance) {
      GeoFenceMonitor.instance = new GeoFenceMonitor()
    }
    return GeoFenceMonitor.instance
  }

  /**
   * Main monitoring loop - checks all fleet vessels against recent events
   */
  async checkFleetProximity(): Promise<void> {
    try {
      console.log('🗺️ Starting geo-fence proximity check...')
      const startTime = Date.now()

      // 1. Get recent events (last 6 hours)
      const events = await this.getRecentEvents()
      console.log(`Found ${events.length} recent events`)

      if (events.length === 0) {
        console.log('No recent events to check')
        return
      }

      // 2. Get active fleet vessels with recent positions
      const fleetVessels = await this.getActiveFleetVessels()
      console.log(`Found ${fleetVessels.length} active fleet vessels`)

      if (fleetVessels.length === 0) {
        console.log('No active fleet vessels to monitor')
        return
      }

      // 3. Check each event against all vessels
      let alertsCreated = 0

      for (const event of events) {
        const vesselsAtRisk = this.findVesselsInRadius(
          fleetVessels,
          event.latitude,
          event.longitude,
          this.getRadiusForEvent(event)
        )

        console.log(`Event ${event.type} (${event.magnitude}): ${vesselsAtRisk.length} vessels at risk`)

        // 4. Create alerts for vessels at risk
        for (const vesselData of vesselsAtRisk) {
          const created = await this.createAndDispatchAlert(vesselData, event)
          if (created) alertsCreated++
        }
      }

      const duration = Date.now() - startTime
      console.log(`✅ Geo-fence check complete: ${alertsCreated} new alerts created in ${duration}ms`)

    } catch (error) {
      console.error('❌ Error in geo-fence monitoring:', error)
    }
  }

  /**
   * Get recent earthquake and tsunami events (last 6 hours)
   */
  private async getRecentEvents(): Promise<any[]> {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)

    const [earthquakes, tsunamis] = await Promise.all([
      prisma.earthquakeEvent.findMany({
        where: {
          occurredAt: { gte: sixHoursAgo },
          magnitude: { gte: 5.0 }  // Only M5.0+
        },
        orderBy: { occurredAt: 'desc' }
      }),

      prisma.tsunamiAlert.findMany({
        where: {
          issuedAt: { gte: sixHoursAgo },
          status: { notIn: ['cancelled', 'ended'] }
        },
        orderBy: { issuedAt: 'desc' }
      })
    ])

    return [
      ...earthquakes.map(e => ({
        id: e.id,
        type: 'earthquake' as const,
        latitude: e.latitude,
        longitude: e.longitude,
        magnitude: e.magnitude,
        depth: e.depth,
        occurredAt: e.occurredAt,
        location: e.place
      })),
      ...tsunamis.map(t => ({
        id: t.id,
        type: 'tsunami' as const,
        latitude: t.latitude,
        longitude: t.longitude,
        magnitude: t.magnitude || 0,
        depth: 0,
        occurredAt: t.issuedAt,
        location: t.region
      }))
    ]
  }

  /**
   * Get active fleet vessels with their latest positions
   */
  private async getActiveFleetVessels(): Promise<any[]> {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)

    // Get all vessels in active fleets
    const fleetVessels = await prisma.fleetVessel.findMany({
      where: {
        fleet: { active: true }
      },
      include: {
        vessel: {
          include: {
            // Get latest position via subquery would be ideal,
            // but Prisma doesn't support that well, so we'll do it separately
          }
        },
        fleet: true
      }
    })

    // Get latest positions for all these vessels
    const vesselIds = fleetVessels.map(fv => fv.vesselId)

    const latestPositions = await prisma.$queryRaw<any[]>`
      SELECT DISTINCT ON ("vesselId")
        "vesselId",
        latitude,
        longitude,
        timestamp,
        speed,
        course,
        heading
      FROM vessel_positions
      WHERE "vesselId" = ANY(${vesselIds}::text[])
        AND timestamp >= ${thirtyMinAgo}
      ORDER BY "vesselId", timestamp DESC
    `

    // Merge positions with vessel data
    return fleetVessels
      .map(fv => {
        const position = latestPositions.find(p => p.vesselId === fv.vesselId)
        if (!position) return null

        return {
          fleetVessel: fv,
          vessel: fv.vessel,
          fleet: fv.fleet,
          position
        }
      })
      .filter(Boolean)
  }

  /**
   * Find vessels within risk radius of event
   */
  private findVesselsInRadius(
    vessels: any[],
    eventLat: number,
    eventLon: number,
    maxRadius: number
  ): Array<{ vessel: any; position: any; distance: number; riskLevel: RiskLevel }> {
    return vessels
      .map(v => {
        const distance = this.calculateDistance(
          v.position.latitude,
          v.position.longitude,
          eventLat,
          eventLon
        )

        if (distance > maxRadius) return null

        return {
          vessel: v.vessel,
          fleet: v.fleet,
          position: v.position,
          distance,
          riskLevel: this.calculateRiskLevel(distance, maxRadius)
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance) // Closest first
  }

  /**
   * Create alert and dispatch notifications
   */
  private async createAndDispatchAlert(
    vesselData: any,
    event: any
  ): Promise<boolean> {
    try {
      // Check if alert already exists for this vessel + event combination
      const existingAlert = await prisma.vesselAlert.findFirst({
        where: {
          vesselId: vesselData.vessel.id,
          eventType: event.type,
          metadata: {
            path: ['eventId'],
            equals: event.id
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
          }
        }
      })

      if (existingAlert) {
        console.log(`Alert already exists for vessel ${vesselData.vessel.mmsi} and event ${event.id}`)
        return false
      }

      // Calculate severity (1-5)
      const severity = this.calculateSeverity(vesselData.riskLevel, event.magnitude)

      // Create vessel alert
      const alert = await prisma.vesselAlert.create({
        data: {
          vesselId: vesselData.vessel.id,
          eventType: event.type,
          severity,
          riskLevel: vesselData.riskLevel,
          distance: Math.round(vesselData.distance),
          recommendation: this.getRecommendation(vesselData.riskLevel, event.type),
          metadata: {
            eventId: event.id,
            eventLocation: event.location,
            magnitude: event.magnitude,
            depth: event.depth,
            occurredAt: event.occurredAt,
            vesselPosition: {
              latitude: vesselData.position.latitude,
              longitude: vesselData.position.longitude,
              speed: vesselData.position.speed,
              course: vesselData.position.course,
              timestamp: vesselData.position.timestamp
            },
            fleetId: vesselData.fleet.id,
            fleetName: vesselData.fleet.name
          }
        }
      })

      console.log(`✅ Created alert ${alert.id} for vessel ${vesselData.vessel.mmsi}`)

      // Get escalation policy
      const policy = await this.escalationService.getPolicy(
        vesselData.vessel.id,
        event.type,
        severity
      )

      // Get contacts based on severity
      const contacts = await this.contactService.getVesselContacts(
        vesselData.vessel.id,
        this.severityToAlertLevel(severity)
      )

      if (contacts.length === 0) {
        console.warn(`No contacts found for vessel ${vesselData.vessel.mmsi}`)
      }

      // Dispatch notifications
      for (const contact of contacts) {
        const channels = this.contactService.getNotificationChannels(
          contact,
          this.severityToAlertLevel(severity)
        )

        for (const channel of channels) {
          await AlertQueue.getInstance().addAlert({
            alertJobId: alert.id,
            contactId: contact.id,
            channel,
            templateData: {
              type: 'vessel_proximity_alert',
              severity,
              data: {
                vesselName: vesselData.vessel.name,
                vesselMMSI: vesselData.vessel.mmsi,
                eventType: event.type,
                magnitude: event.magnitude,
                distance: vesselData.distance.toFixed(0),
                riskLevel: vesselData.riskLevel,
                recommendation: this.getRecommendation(vesselData.riskLevel, event.type),
                contactName: contact.name,
                mapLink: `https://www.openstreetmap.org/?mlat=${vesselData.position.latitude}&mlon=${vesselData.position.longitude}&zoom=8`,
                ackLink: `${process.env.NEXT_PUBLIC_APP_URL}/api/vessel-alerts/${alert.id}/ack?token=TODO` // TODO: Generate token
              }
            },
            priority: severity
          })
        }
      }

      // Start escalation if policy exists and requires it
      if (policy && policy.rules && policy.rules.length > 0) {
        await this.escalationService.initiateEscalation(alert, policy)
        console.log(`🔔 Escalation initiated for alert ${alert.id}`)
      }

      return true
    } catch (error) {
      console.error('Error creating/dispatching alert:', error)
      return false
    }
  }

  /**
   * Get risk radius for event (in nautical miles)
   */
  private getRadiusForEvent(event: any): number {
    if (event.type === 'tsunami') {
      return 500 // 500 NM for tsunamis
    }

    // For earthquakes, radius based on magnitude
    // M5.0 = 100nm, M6.0 = 200nm, M7.0 = 350nm, M8.0 = 500nm
    return Math.min(event.magnitude * 50, 500)
  }

  /**
   * Calculate risk level based on distance and max radius
   */
  private calculateRiskLevel(distance: number, maxRadius: number): RiskLevel {
    const percentage = (distance / maxRadius) * 100

    if (percentage < 20) return 'critical'
    if (percentage < 40) return 'high'
    if (percentage < 70) return 'moderate'
    return 'low'
  }

  /**
   * Calculate severity (1-5) based on risk level and magnitude
   */
  private calculateSeverity(riskLevel: RiskLevel, magnitude: number): number {
    let baseSeverity = {
      critical: 5,
      high: 4,
      moderate: 3,
      low: 2
    }[riskLevel]

    // Adjust for magnitude
    if (magnitude >= 7.0) baseSeverity = Math.min(baseSeverity + 1, 5)
    if (magnitude >= 8.0) baseSeverity = 5

    return baseSeverity
  }

  /**
   * Get recommendation text
   */
  private getRecommendation(riskLevel: RiskLevel, eventType: string): string {
    if (eventType === 'tsunami') {
      if (riskLevel === 'critical') {
        return 'IMMEDIATE ACTION REQUIRED: Move to deep water (>200m depth) or away from coast immediately. Head perpendicular to expected wave direction.'
      }
      if (riskLevel === 'high') {
        return 'Move to deeper water or increase distance from coast. Monitor tsunami warnings closely.'
      }
      return 'Monitor tsunami warnings. Be prepared to take evasive action if situation develops.'
    }

    // Earthquake
    if (riskLevel === 'critical') {
      return 'Seek shelter at nearest safe port. Inspect vessel for damage. Monitor aftershocks and tsunami warnings.'
    }
    if (riskLevel === 'high') {
      return 'Alter course away from epicenter if possible. Monitor for aftershocks. Check vessel systems.'
    }
    return 'Monitor situation. Be aware of potential aftershocks.'
  }

  /**
   * Calculate distance between two points (Haversine formula)
   * Returns distance in nautical miles
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

  private severityToAlertLevel(severity: number): 'low' | 'medium' | 'high' | 'critical' {
    if (severity >= 5) return 'critical'
    if (severity >= 4) return 'high'
    if (severity >= 3) return 'medium'
    return 'low'
  }
}
```

---

## Background Monitor Script

**File**: `scripts/geo-fence-monitor.ts`

```typescript
import { GeoFenceMonitor } from '../lib/services/geo-fence-monitor'

async function startGeoFenceMonitoring() {
  const monitor = GeoFenceMonitor.getInstance()

  console.log('🗺️ Starting geo-fence monitoring...')
  console.log('⏱️  Check frequency: Every 2 minutes')
  console.log('📡 Monitoring: Earthquakes M5.0+ and active tsunami alerts')
  console.log('🚢 Fleet vessels with positions in last 30 minutes')
  console.log('')

  // Run initial check
  await monitor.checkFleetProximity()

  // Run every 2 minutes
  setInterval(async () => {
    try {
      await monitor.checkFleetProximity()
    } catch (error) {
      console.error('❌ Error in monitoring cycle:', error)
    }
  }, 120000) // 2 minutes
}

// Start monitoring
startGeoFenceMonitoring()

// Graceful shutdown
const shutdown = () => {
  console.log('\n👋 Shutting down geo-fence monitor...')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
```

### Add to package.json

```json
{
  "scripts": {
    "monitor:geo-fence": "TZ=UTC tsx scripts/geo-fence-monitor.ts"
  }
}
```

---

## Manual Trigger API (For Testing)

**File**: `app/api/geo-fence/trigger-manual/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GeoFenceMonitor } from '@/lib/services/geo-fence-monitor'
import { hasPermission, Permission } from '@/lib/rbac/roles'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any

    if (!hasPermission(currentUser.role, Permission.MANAGE_ALERTS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    console.log(`Manual geo-fence check triggered by ${currentUser.email}`)

    const monitor = GeoFenceMonitor.getInstance()
    await monitor.checkFleetProximity()

    return NextResponse.json({
      success: true,
      message: 'Geo-fence check completed',
      triggeredBy: currentUser.email,
      triggeredAt: new Date()
    })
  } catch (error) {
    console.error('Error in manual geo-fence trigger:', error)
    return NextResponse.json(
      { error: 'Failed to trigger geo-fence check' },
      { status: 500 }
    )
  }
}
```

---

## PM2 Configuration

Update `ecosystem.config.js`:

```javascript
{
  name: 'geo-fence-monitor',
  script: 'pnpm',
  args: 'monitor:geo-fence',
  instances: 1,
  exec_mode: 'fork',
  max_memory_restart: '256M',
  env: {
    NODE_ENV: 'production'
  }
}
```

---

## Testing

### Test Script Locally

```bash
# Run monitor
pnpm monitor:geo-fence

# Should see output like:
# 🗺️ Starting geo-fence monitoring...
# Found 3 recent events
# Found 12 active fleet vessels
# Event earthquake (6.5): 2 vessels at risk
# ✅ Created alert abc123 for vessel 123456789
# ✅ Geo-fence check complete: 2 new alerts created in 1234ms
```

### Test Manual Trigger API

```bash
curl -X POST http://localhost:3000/api/geo-fence/trigger-manual \
  -H "Content-Type: application/json"
```

### Test with Real Data

```sql
-- Check recent events
SELECT 
  'earthquake' as type,
  id,
  magnitude,
  place,
  occurred_at
FROM earthquake_events
WHERE occurred_at >= NOW() - INTERVAL '6 hours'
  AND magnitude >= 5.0
ORDER BY occurred_at DESC;

-- Check fleet vessels with positions
SELECT 
  fv.id,
  v.mmsi,
  v.name,
  f.name as fleet_name,
  COUNT(vp.id) as position_count
FROM fleet_vessels fv
JOIN vessels v ON fv.vessel_id = v.id
JOIN fleets f ON fv.fleet_id = f.id
LEFT JOIN vessel_positions vp ON v.id = vp.vessel_id
  AND vp.timestamp >= NOW() - INTERVAL '30 minutes'
WHERE f.active = true
GROUP BY fv.id, v.id, f.name;

-- Check created alerts
SELECT 
  va.id,
  v.mmsi,
  v.name,
  va.event_type,
  va.severity,
  va.risk_level,
  va.distance,
  va.created_at
FROM vessel_alerts va
JOIN vessels v ON va.vessel_id = v.id
WHERE va.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY va.created_at DESC;
```

---

## Performance Monitoring

Add performance logging to monitor script:

```typescript
let checkCount = 0
let totalDuration = 0
let maxDuration = 0
let totalAlertsCreated = 0

setInterval(async () => {
  const start = Date.now()
  
  await monitor.checkFleetProximity()
  
  const duration = Date.now() - start
  checkCount++
  totalDuration += duration
  maxDuration = Math.max(maxDuration, duration)
  
  if (checkCount % 10 === 0) {
    console.log('📊 Performance stats (last 10 checks):', {
      avg: `${(totalDuration / checkCount).toFixed(0)}ms`,
      max: `${maxDuration}ms`,
      checks: checkCount,
      alertsCreated: totalAlertsCreated
    })
  }
}, 120000)
```

---

## Troubleshooting

### No Alerts Being Created

```bash
# Check if events exist
psql $DATABASE_URL -c "SELECT COUNT(*) FROM earthquake_events WHERE occurred_at >= NOW() - INTERVAL '6 hours'"

# Check if fleet vessels exist
psql $DATABASE_URL -c "SELECT COUNT(*) FROM fleet_vessels WHERE fleet_id IN (SELECT id FROM fleets WHERE active = true)"

# Check if positions exist
psql $DATABASE_URL -c "SELECT COUNT(*) FROM vessel_positions WHERE timestamp >= NOW() - INTERVAL '30 minutes'"
```

### High Memory Usage

```bash
# Monitor memory
pm2 monit

# If exceeds 256MB, optimize queries or reduce check frequency
```

---

## Next Steps

1. ✅ Test with real earthquake data
2. ✅ Move to Week 3 Day 4-5: Enhanced Alert Dispatch
3. ✅ Integrate with Week 2 escalation system

**Implementation Status**: Ready to code ✅
