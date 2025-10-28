# Week 2 Day 1-3: Escalation Policy Engine

**Priority**: 🔴 CRITICAL | **Effort**: 16-20 hours

---

## Overview

Time-based escalation system that automatically notifies higher-priority contacts if alerts aren't acknowledged within specified timeframes.

**Flow**: Alert → Step 1 (Captain) → Wait 5min → No ACK? → Step 2 (Chief Officer + Captain) → Wait 15min → No ACK? → Step 3 (Operations Manager + Fleet Manager)

---

## Database Schema

### Migration File: `prisma/migrations/XXX_add_escalation_system.sql`

```prisma
// Add to schema.prisma

model EscalationPolicy {
  id          String           @id @default(cuid())
  name        String
  description String?
  fleetId     String?          // null = global policy, else fleet-specific
  eventTypes  String[]         @default([])  // ["earthquake", "tsunami"] or [] for all
  severityMin Int              @default(3)   // Minimum severity (1-5) to trigger
  active      Boolean          @default(true)
  metadata    Json             @default("{}")
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  
  rules       EscalationRule[]
  fleet       Fleet?           @relation(fields: [fleetId], references: [id], onDelete: SetNull)
  
  @@index([fleetId])
  @@index([active])
  @@map("escalation_policies")
}

model EscalationRule {
  id              String            @id @default(cuid())
  policyId        String
  step            Int               // 1, 2, 3 (escalation levels)
  severityMin     Int               @default(3)  // Minimum severity for this step
  delayMinutes    Int               // Wait time before escalating (0 for immediate)
  channels        String[]          // ["sms", "whatsapp", "voice", "email"]
  contactRoles    String[]          // ["captain", "chief_officer", "operations_manager"]
  requireAck      Boolean           @default(false)  // Whether ACK is required
  maxAttempts     Int               @default(3)  // Max notification attempts
  metadata        Json              @default("{}")
  createdAt       DateTime          @default(now())
  
  policy          EscalationPolicy  @relation(fields: [policyId], references: [id], onDelete: Cascade)
  
  @@unique([policyId, step])
  @@index([policyId])
  @@map("escalation_rules")
}

model EscalationLog {
  id               String    @id @default(cuid())
  alertId          String
  policyId         String
  step             Int
  triggeredAt      DateTime  @default(now())
  completedAt      DateTime?
  acknowledgedBy   String?   // User ID who acknowledged
  contactsNotified Int       @default(0)
  attemptsCount    Int       @default(0)
  status           String    // "pending", "in_progress", "completed", "cancelled", "failed"
  metadata         Json      @default("{}")
  
  @@index([alertId])
  @@index([status, triggeredAt])
  @@index([policyId])
  @@map("escalation_logs")
}
```

Run migration:
```bash
npx prisma migrate dev --name add_escalation_system
```

---

## Escalation Service

**File**: `lib/services/escalation-service.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { ContactHierarchyService } from './contact-hierarchy'
import { AlertQueue } from './alert-queue'

export class EscalationService {
  private static instance: EscalationService
  private contactService: ContactHierarchyService

  private constructor() {
    this.contactService = ContactHierarchyService.getInstance()
  }

  static getInstance() {
    if (!EscalationService.instance) {
      EscalationService.instance = new EscalationService()
    }
    return EscalationService.instance
  }

  /**
   * Get applicable escalation policy for a vessel alert
   */
  async getPolicy(
    vesselId: string,
    eventType: string,
    severity: number
  ): Promise<any | null> {
    // 1. Get vessel's fleet
    const fleetVessel = await prisma.fleetVessel.findFirst({
      where: { vesselId },
      include: { fleet: true }
    })

    // 2. Try fleet-specific policy first
    if (fleetVessel) {
      const fleetPolicy = await prisma.escalationPolicy.findFirst({
        where: {
          fleetId: fleetVessel.fleetId,
          active: true,
          severityMin: { lte: severity },
          OR: [
            { eventTypes: { isEmpty: true } },  // Applies to all event types
            { eventTypes: { has: eventType } }
          ]
        },
        include: {
          rules: {
            orderBy: { step: 'asc' }
          }
        }
      })

      if (fleetPolicy) return fleetPolicy
    }

    // 3. Fall back to global policy
    const globalPolicy = await prisma.escalationPolicy.findFirst({
      where: {
        fleetId: null,
        active: true,
        severityMin: { lte: severity },
        OR: [
          { eventTypes: { isEmpty: true } },
          { eventTypes: { has: eventType } }
        ]
      },
      include: {
        rules: {
          orderBy: { step: 'asc' }
        }
      }
    })

    return globalPolicy
  }

  /**
   * Start escalation process for an alert
   */
  async initiateEscalation(
    alert: any,
    policy: any
  ): Promise<void> {
    if (!policy || !policy.rules || policy.rules.length === 0) {
      console.log('No escalation policy or rules found')
      return
    }

    // Create escalation log for step 1 (immediate)
    const step1Rule = policy.rules.find((r: any) => r.step === 1)
    
    if (step1Rule) {
      await prisma.escalationLog.create({
        data: {
          alertId: alert.id,
          policyId: policy.id,
          step: 1,
          status: step1Rule.delayMinutes === 0 ? 'in_progress' : 'pending',
          metadata: {
            rule: step1Rule,
            vesselId: alert.vesselId,
            severity: alert.severity
          }
        }
      })

      // If step 1 has no delay, execute immediately
      if (step1Rule.delayMinutes === 0) {
        await this.executeEscalationStep(alert.id, policy.id, 1)
      }
    }

    // Schedule future steps (if needed)
    for (const rule of policy.rules.slice(1)) {
      if (rule.delayMinutes > 0) {
        await prisma.escalationLog.create({
          data: {
            alertId: alert.id,
            policyId: policy.id,
            step: rule.step,
            status: 'pending',
            metadata: {
              rule,
              vesselId: alert.vesselId,
              severity: alert.severity,
              scheduledFor: new Date(Date.now() + rule.delayMinutes * 60 * 1000)
            }
          }
        })
      }
    }

    console.log(`✅ Escalation initiated for alert ${alert.id}`)
  }

  /**
   * Process pending escalations (called by background monitor every 1 min)
   */
  async processEscalations(): Promise<void> {
    // Get pending escalations that are ready to execute
    const pendingEscalations = await prisma.escalationLog.findMany({
      where: {
        status: 'pending',
        triggeredAt: {
          lte: new Date()
        }
      },
      include: {
        // We need alert info to check if it's been acknowledged
      }
    })

    for (const escalation of pendingEscalations) {
      // Check if alert has been acknowledged
      const alert = await prisma.vesselAlert.findUnique({
        where: { id: escalation.alertId }
      })

      if (!alert) {
        await this.cancelEscalation(escalation.id, 'Alert not found')
        continue
      }

      if (alert.acknowledgedAt) {
        await this.cancelEscalation(escalation.id, 'Alert already acknowledged')
        continue
      }

      // Execute this escalation step
      await this.executeEscalationStep(
        escalation.alertId,
        escalation.policyId,
        escalation.step
      )
    }

    // Check in_progress escalations for timeouts
    await this.checkEscalationTimeouts()
  }

  /**
   * Execute a specific escalation step
   */
  private async executeEscalationStep(
    alertId: string,
    policyId: string,
    step: number
  ): Promise<void> {
    try {
      console.log(`🔔 Executing escalation step ${step} for alert ${alertId}`)

      // Get alert details
      const alert = await prisma.vesselAlert.findUnique({
        where: { id: alertId },
        include: { vessel: true }
      })

      if (!alert) {
        throw new Error('Alert not found')
      }

      // Get policy and rule
      const policy = await prisma.escalationPolicy.findUnique({
        where: { id: policyId },
        include: { rules: true }
      })

      if (!policy) {
        throw new Error('Policy not found')
      }

      const rule = policy.rules.find(r => r.step === step)
      
      if (!rule) {
        throw new Error(`Rule for step ${step} not found`)
      }

      // Get contacts for this step's roles
      const contacts = await this.contactService.getContactsForRoles(
        alert.vesselId,
        rule.contactRoles,
        this.severityToAlertLevel(alert.severity)
      )

      if (contacts.length === 0) {
        console.warn(`No contacts found for step ${step}`)
        await this.updateEscalationStatus(alertId, step, 'failed', 0)
        return
      }

      // Update status to in_progress
      await prisma.escalationLog.updateMany({
        where: {
          alertId,
          step,
          status: 'pending'
        },
        data: {
          status: 'in_progress',
          triggeredAt: new Date()
        }
      })

      // Dispatch notifications to each contact
      let notifiedCount = 0

      for (const contact of contacts) {
        for (const channel of rule.channels) {
          try {
            await AlertQueue.getInstance().addAlert({
              alertJobId: `${alertId}-escalation-${step}`,
              contactId: contact.id,
              channel,
              templateData: {
                type: 'vessel_proximity_alert',
                severity: alert.severity,
                escalationStep: step,
                data: {
                  vesselName: alert.vessel.name,
                  vesselMMSI: alert.vessel.mmsi,
                  eventType: alert.eventType,
                  distance: alert.distance,
                  riskLevel: alert.riskLevel,
                  recommendation: alert.recommendation,
                  contactName: contact.name,
                  mapLink: `https://www.openstreetmap.org/?mlat=${alert.vessel.latitude}&mlon=${alert.vessel.longitude}`
                }
              },
              priority: alert.severity
            })

            notifiedCount++
          } catch (error) {
            console.error(`Failed to queue alert for contact ${contact.id}:`, error)
          }
        }
      }

      // Update escalation log
      await this.updateEscalationStatus(alertId, step, 'completed', notifiedCount)

      console.log(`✅ Escalation step ${step} completed: ${notifiedCount} notifications sent`)

      // Schedule next step if exists and alert not acknowledged
      const nextRule = policy.rules.find(r => r.step === step + 1)
      if (nextRule && !alert.acknowledgedAt) {
        const nextStepTime = new Date(Date.now() + nextRule.delayMinutes * 60 * 1000)
        
        await prisma.escalationLog.create({
          data: {
            alertId,
            policyId,
            step: step + 1,
            status: 'pending',
            triggeredAt: nextStepTime,
            metadata: {
              rule: nextRule,
              scheduledFor: nextStepTime
            }
          }
        })

        console.log(`📅 Scheduled step ${step + 1} for ${nextStepTime.toISOString()}`)
      }
    } catch (error) {
      console.error(`Error executing escalation step ${step}:`, error)
      await this.updateEscalationStatus(alertId, step, 'failed', 0)
    }
  }

  /**
   * Acknowledge an alert and stop escalation
   */
  async acknowledgeAlert(
    alertId: string,
    userId: string
  ): Promise<void> {
    // Update alert
    await prisma.vesselAlert.update({
      where: { id: alertId },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy: userId
      }
    })

    // Cancel all pending escalations
    await prisma.escalationLog.updateMany({
      where: {
        alertId,
        status: { in: ['pending', 'in_progress'] }
      },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        acknowledgedBy: userId,
        metadata: {
          cancelReason: 'Alert acknowledged by user'
        }
      }
    })

    console.log(`✅ Alert ${alertId} acknowledged, escalations cancelled`)
  }

  /**
   * Cancel escalation
   */
  private async cancelEscalation(
    escalationId: string,
    reason: string
  ): Promise<void> {
    await prisma.escalationLog.update({
      where: { id: escalationId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        metadata: { cancelReason: reason }
      }
    })
  }

  /**
   * Update escalation status
   */
  private async updateEscalationStatus(
    alertId: string,
    step: number,
    status: string,
    contactsNotified: number
  ): Promise<void> {
    await prisma.escalationLog.updateMany({
      where: { alertId, step },
      data: {
        status,
        completedAt: new Date(),
        contactsNotified,
        attemptsCount: { increment: 1 }
      }
    })
  }

  /**
   * Check for escalation timeouts
   */
  private async checkEscalationTimeouts(): Promise<void> {
    const timeout = 30 * 60 * 1000 // 30 minutes

    const timedOut = await prisma.escalationLog.findMany({
      where: {
        status: 'in_progress',
        triggeredAt: {
          lt: new Date(Date.now() - timeout)
        }
      }
    })

    for (const escalation of timedOut) {
      await this.updateEscalationStatus(
        escalation.alertId,
        escalation.step,
        'failed',
        escalation.contactsNotified
      )
    }
  }

  /**
   * Convert numeric severity to alert level
   */
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

**File**: `scripts/escalation-monitor.ts`

```typescript
import { EscalationService } from '../lib/services/escalation-service'

async function monitorEscalations() {
  const service = EscalationService.getInstance()
  
  console.log('🔔 Starting escalation monitor (checking every 1 minute)...')

  // Run immediately on startup
  await service.processEscalations()

  // Then run every minute
  setInterval(async () => {
    try {
      await service.processEscalations()
    } catch (error) {
      console.error('❌ Error processing escalations:', error)
    }
  }, 60000) // Every 1 minute
}

// Start monitoring
monitorEscalations()

// Graceful shutdown
const shutdown = () => {
  console.log('\n👋 Shutting down escalation monitor...')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
```

### Add to package.json

```json
{
  "scripts": {
    "monitor:escalation": "TZ=UTC tsx scripts/escalation-monitor.ts"
  }
}
```

---

## API Routes

### 1. CRUD Escalation Policies

**File**: `app/api/escalation-policies/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, Permission } from '@/lib/rbac/roles'
import { z } from 'zod'

const createPolicySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  fleetId: z.string().optional(),
  eventTypes: z.array(z.string()).default([]),
  severityMin: z.number().int().min(1).max(5).default(3),
  rules: z.array(z.object({
    step: z.number().int().min(1),
    severityMin: z.number().int().min(1).max(5).default(3),
    delayMinutes: z.number().int().min(0),
    channels: z.array(z.enum(['sms', 'whatsapp', 'voice', 'email'])),
    contactRoles: z.array(z.string()),
    requireAck: z.boolean().default(false),
    maxAttempts: z.number().int().min(1).default(3)
  })).min(1)
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    
    if (!hasPermission(currentUser.role, Permission.MANAGE_ESCALATION_POLICIES)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const validated = createPolicySchema.parse(body)

    const policy = await prisma.escalationPolicy.create({
      data: {
        name: validated.name,
        description: validated.description,
        fleetId: validated.fleetId,
        eventTypes: validated.eventTypes,
        severityMin: validated.severityMin,
        rules: {
          create: validated.rules
        }
      },
      include: {
        rules: {
          orderBy: { step: 'asc' }
        }
      }
    })

    return NextResponse.json(policy, { status: 201 })
  } catch (error) {
    console.error('Error creating escalation policy:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const policies = await prisma.escalationPolicy.findMany({
      where: { active: true },
      include: {
        rules: {
          orderBy: { step: 'asc' }
        },
        fleet: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(policies)
  } catch (error) {
    console.error('Error fetching policies:', error)
    return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 })
  }
}
```

### 2. Acknowledge Alert

**File**: `app/api/vessel-alerts/[id]/acknowledge/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EscalationService } from '@/lib/services/escalation-service'
import { z } from 'zod'

const ackSchema = z.object({
  notes: z.string().optional()
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    const body = await req.json()
    const validated = ackSchema.parse(body)

    const escalationService = EscalationService.getInstance()
    
    await escalationService.acknowledgeAlert(params.id, currentUser.id)

    return NextResponse.json({ 
      success: true,
      acknowledgedAt: new Date(),
      acknowledgedBy: currentUser.id
    })
  } catch (error) {
    console.error('Error acknowledging alert:', error)
    return NextResponse.json({ error: 'Failed to acknowledge alert' }, { status: 500 })
  }
}
```

---

## PM2 Configuration

Update `ecosystem.config.js`:

```javascript
{
  name: 'escalation-monitor',
  script: 'pnpm',
  args: 'monitor:escalation',
  instances: 1,
  exec_mode: 'fork',
  max_memory_restart: '128M',
  env: {
    NODE_ENV: 'production'
  }
}
```

---

## Testing

### Create Test Policy

```bash
curl -X POST http://localhost:3000/api/escalation-policies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Critical Event Escalation",
    "eventTypes": ["earthquake", "tsunami"],
    "severityMin": 3,
    "rules": [
      {
        "step": 1,
        "delayMinutes": 0,
        "channels": ["sms", "whatsapp"],
        "contactRoles": ["captain"],
        "requireAck": true
      },
      {
        "step": 2,
        "delayMinutes": 5,
        "channels": ["sms", "whatsapp", "voice"],
        "contactRoles": ["captain", "chief_officer"],
        "requireAck": true
      },
      {
        "step": 3,
        "delayMinutes": 15,
        "channels": ["voice"],
        "contactRoles": ["operations_manager", "owner"],
        "requireAck": false
      }
    ]
  }'
```

---

## Next Steps

1. ✅ Create UI for escalation policies (`/dashboard/escalation-policies`)
2. ✅ Move to Week 3: Geo-Fence Monitor
3. ✅ Integrate with alert dispatch system

**Implementation Status**: Ready to code ✅
