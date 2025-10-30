# DAY 1-2: Auto-Trigger Pipeline + Alert Routing

## MORNING: Database & API Setup (3-4 hours)

### 1. Database Migrations

```prisma
// Add to schema.prisma

model VesselAlert {
  id              String   @id @default(cuid())
  vesselId        String
  eventId         String   // Reference to earthquake/tsunami event
  eventType       String   // "earthquake" | "tsunami"
  severity        String   // "low" | "moderate" | "high" | "critical"
  distance        Float    // Distance from event (km)
  message         String   @db.Text
  coordinates     Json     // {lat, lon}
  status          String   @default("pending") // "pending" | "sent" | "acknowledged" | "expired"
  acknowledgedAt  DateTime?
  acknowledgedBy  String?  // Contact ID who acknowledged
  sentAt          DateTime?
  expiresAt       DateTime?
  metadata        Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  vessel          Vessel   @relation(fields: [vesselId], references: [id])
  deliveryLogs    DeliveryLog[]
  
  @@index([vesselId])
  @@index([status])
  @@index([eventId])
}

model DeliveryLog {
  id              String   @id @default(cuid())
  alertId         String
  contactId       String
  channel         String   // "sms" | "email" | "whatsapp" | "voice"
  status          String   // "pending" | "sent" | "delivered" | "failed" | "acknowledged"
  attempts        Int      @default(0)
  lastAttemptAt   DateTime?
  deliveredAt     DateTime?
  failureReason   String?
  metadata        Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  alert           VesselAlert @relation(fields: [alertId], references: [id])
  contact         Contact     @relation(fields: [contactId], references: [id])
  
  @@index([alertId])
  @@index([contactId])
  @@index([status])
}
```

### 2. Run Migration

```bash
npx prisma db push
npx prisma generate
```

### 3. API Routes to Create

#### `/api/alerts/vessel/[vesselId]/route.ts` - CREATE Auto-Alert
```typescript
POST /api/alerts/vessel/[vesselId]
Body: {
  eventId: string
  eventType: "earthquake" | "tsunami"
  severity: "low" | "moderate" | "high" | "critical"
  distance: number
  coordinates: {lat: number, lon: number}
  message: string
}

Returns: {
  alert: VesselAlert
  deliveryLogs: DeliveryLog[]
  recipientCount: number
}
```

#### `/api/alerts/[alertId]/acknowledge/route.ts` - Acknowledge Alert
```typescript
POST /api/alerts/[alertId]/acknowledge
Body: {
  contactId: string
  notes?: string
}

Returns: {
  alert: VesselAlert (with acknowledgedAt, acknowledgedBy)
  success: true
}
```

#### `/api/alerts/[alertId]/delivery-status/route.ts` - Check Delivery
```typescript
GET /api/alerts/[alertId]/delivery-status

Returns: {
  alert: VesselAlert
  deliveryLogs: DeliveryLog[]
  summary: {
    total: number
    sent: number
    delivered: number
    failed: number
    acknowledged: number
  }
}
```

---

## AFTERNOON: Alert Routing Service (3-4 hours)

### 4. Create Alert Routing Service

File: `/lib/services/alert-routing-service.ts`

```typescript
import { prisma } from '@/lib/db'
import { NotificationService } from './notification-service'

export class AlertRoutingService {
  private notificationService: NotificationService

  constructor() {
    this.notificationService = new NotificationService()
  }

  /**
   * Get contacts for vessel based on severity
   */
  async getContactsForVessel(
    vesselId: string,
    severity: 'low' | 'moderate' | 'high' | 'critical'
  ) {
    // Query vessel contacts with role hierarchy
    const vesselContacts = await prisma.vesselContact.findMany({
      where: {
        vesselId,
        active: true,
        // Filter by notification preferences (severity threshold)
        notificationPreferences: {
          path: ['minSeverity'],
          // Include contacts who want this severity or lower
          lte: this.getSeverityLevel(severity)
        }
      },
      include: {
        contact: true
      },
      orderBy: [
        { priority: 'asc' },
        { role: 'asc' }
      ]
    })

    return vesselContacts.map(vc => ({
      ...vc.contact,
      role: vc.role,
      priority: vc.priority,
      channels: vc.notificationChannels as string[]
    }))
  }

  /**
   * Create alert and route to contacts
   */
  async createAndRouteAlert(params: {
    vesselId: string
    eventId: string
    eventType: string
    severity: 'low' | 'moderate' | 'high' | 'critical'
    distance: number
    coordinates: { lat: number; lon: number }
    message: string
  }) {
    // 1. Create vessel alert
    const alert = await prisma.vesselAlert.create({
      data: {
        vesselId: params.vesselId,
        eventId: params.eventId,
        eventType: params.eventType,
        severity: params.severity,
        distance: params.distance,
        coordinates: params.coordinates,
        message: params.message,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    })

    // 2. Get contacts to notify
    const contacts = await this.getContactsForVessel(params.vesselId, params.severity)

    // 3. Send notifications
    const deliveryLogs = []
    for (const contact of contacts) {
      // Send via preferred channels
      const channels = contact.channels || ['sms']
      
      for (const channel of channels) {
        const log = await this.sendNotification(alert, contact, channel)
        deliveryLogs.push(log)
      }
    }

    // 4. Update alert status
    await prisma.vesselAlert.update({
      where: { id: alert.id },
      data: {
        status: 'sent',
        sentAt: new Date()
      }
    })

    return {
      alert,
      deliveryLogs,
      recipientCount: contacts.length
    }
  }

  /**
   * Send notification via channel
   */
  private async sendNotification(
    alert: any,
    contact: any,
    channel: string
  ) {
    const log = await prisma.deliveryLog.create({
      data: {
        alertId: alert.id,
        contactId: contact.id,
        channel,
        status: 'pending',
        attempts: 0
      }
    })

    try {
      // Send based on channel
      if (channel === 'sms' && contact.phone) {
        await this.notificationService.sendSMS(contact.phone, alert.message)
      } else if (channel === 'email' && contact.email) {
        await this.notificationService.sendEmail(
          contact.email,
          `Alert: ${alert.eventType}`,
          alert.message
        )
      } else if (channel === 'whatsapp' && contact.whatsapp) {
        await this.notificationService.sendWhatsApp(contact.whatsapp, alert.message)
      }

      // Update log
      await prisma.deliveryLog.update({
        where: { id: log.id },
        data: {
          status: 'sent',
          lastAttemptAt: new Date(),
          attempts: 1
        }
      })

      return log
    } catch (error) {
      // Log failure
      await prisma.deliveryLog.update({
        where: { id: log.id },
        data: {
          status: 'failed',
          failureReason: error.message,
          lastAttemptAt: new Date(),
          attempts: 1
        }
      })

      console.error(`Failed to send ${channel} to ${contact.name}:`, error)
      return log
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, contactId: string) {
    const alert = await prisma.vesselAlert.update({
      where: { id: alertId },
      data: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: contactId
      }
    })

    // Update delivery logs
    await prisma.deliveryLog.updateMany({
      where: {
        alertId,
        contactId
      },
      data: {
        status: 'acknowledged',
        deliveredAt: new Date()
      }
    })

    return alert
  }

  /**
   * Get severity level (for filtering)
   */
  private getSeverityLevel(severity: string): number {
    const levels = { low: 1, moderate: 2, high: 3, critical: 4 }
    return levels[severity] || 1
  }
}
```

---

## EVENING: Background Monitor (2-3 hours)

### 5. Create Vessel Proximity Monitor

File: `/scripts/monitor-vessel-proximity.ts`

```typescript
import { prisma } from '../lib/db'
import { AlertRoutingService } from '../lib/services/alert-routing-service'
import { calculateDistance } from '../lib/utils/geo'

const alertRouter = new AlertRoutingService()

// Danger zone thresholds (km)
const DANGER_ZONES = {
  earthquake: {
    critical: 200,  // < 200km
    high: 500,      // 200-500km
    moderate: 1000  // 500-1000km
  },
  tsunami: {
    critical: 100,
    high: 300,
    moderate: 600
  }
}

async function checkVesselProximity() {
  console.log('[Monitor] Starting vessel proximity check...')

  try {
    // 1. Get active events (last 24 hours)
    const events = await getActiveEvents()
    console.log(`[Monitor] Found ${events.length} active events`)

    // 2. Get fleet vessels with recent positions
    const vessels = await getFleetVesselsWithPositions()
    console.log(`[Monitor] Checking ${vessels.length} fleet vessels`)

    // 3. Check each vessel against each event
    for (const vessel of vessels) {
      for (const event of events) {
        await checkVesselAgainstEvent(vessel, event)
      }
    }

    console.log('[Monitor] Proximity check complete')
  } catch (error) {
    console.error('[Monitor] Error:', error)
  }
}

async function getActiveEvents() {
  // Get earthquakes from last 24h
  const earthquakes = await prisma.earthquake.findMany({
    where: {
      eventTime: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      magnitude: { gte: 6.0 }
    }
  })

  // Get tsunamis from last 24h
  const tsunamis = await prisma.tsunami.findMany({
    where: {
      detectedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    }
  })

  return [
    ...earthquakes.map(e => ({ ...e, type: 'earthquake' })),
    ...tsunamis.map(t => ({ ...t, type: 'tsunami' }))
  ]
}

async function getFleetVesselsWithPositions() {
  // Get vessels in fleets with their latest position
  const fleetVessels = await prisma.fleetVessel.findMany({
    where: {
      fleet: { active: true }
    },
    include: {
      vessel: {
        include: {
          positions: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      }
    }
  })

  return fleetVessels
    .filter(fv => fv.vessel.positions.length > 0)
    .map(fv => ({
      ...fv.vessel,
      latestPosition: fv.vessel.positions[0]
    }))
}

async function checkVesselAgainstEvent(vessel: any, event: any) {
  const position = vessel.latestPosition
  
  // Calculate distance
  const distance = calculateDistance(
    position.latitude,
    position.longitude,
    event.latitude,
    event.longitude
  )

  // Determine severity
  const severity = getSeverity(event.type, distance)
  
  if (!severity) return // Outside all danger zones

  // Check if alert already sent
  const existingAlert = await prisma.vesselAlert.findFirst({
    where: {
      vesselId: vessel.id,
      eventId: event.id,
      status: { in: ['sent', 'acknowledged'] }
    }
  })

  if (existingAlert) return // Already notified

  // Create and route alert
  console.log(`[Monitor] ⚠️  Alert: ${vessel.name} is ${distance.toFixed(0)}km from ${event.type} (${severity})`)

  const message = `ALERT: ${severity.toUpperCase()} - Your vessel "${vessel.name}" is ${distance.toFixed(0)}km from a magnitude ${event.magnitude || 'N/A'} ${event.type}. Location: ${event.latitude.toFixed(2)}, ${event.longitude.toFixed(2)}. Please acknowledge this alert.`

  await alertRouter.createAndRouteAlert({
    vesselId: vessel.id,
    eventId: event.id,
    eventType: event.type,
    severity,
    distance,
    coordinates: { lat: event.latitude, lon: event.longitude },
    message
  })
}

function getSeverity(eventType: string, distance: number): string | null {
  const zones = DANGER_ZONES[eventType]
  if (!zones) return null

  if (distance < zones.critical) return 'critical'
  if (distance < zones.high) return 'high'
  if (distance < zones.moderate) return 'moderate'
  
  return null // Outside all zones
}

// Run every 5 minutes
setInterval(checkVesselProximity, 5 * 60 * 1000)

// Run immediately on start
checkVesselProximity()

console.log('[Monitor] Vessel proximity monitor started (checks every 5 minutes)')
```

### 6. Add to package.json

```json
{
  "scripts": {
    "monitor:vessels": "tsx scripts/monitor-vessel-proximity.ts"
  }
}
```

---

## DAY 1-2 CHECKLIST

- [ ] Database schema updated (VesselAlert, DeliveryLog)
- [ ] Migration run successfully
- [ ] API routes created (/api/alerts/*)
- [ ] AlertRoutingService implemented
- [ ] Vessel proximity monitor script created
- [ ] Test: Manual alert creation works
- [ ] Test: Alert routing sends SMS
- [ ] Test: Acknowledgment updates status
- [ ] Background monitor running

**End of Day 2:** Auto-alerts are being sent when vessels enter danger zones! 🎉
