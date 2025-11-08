import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { escalationService } from '@/lib/services/escalation.service'

/**
 * Test endpoint to trigger a mock alert for escalation testing
 * 
 * POST /api/test/trigger-alert
 * Body: {
 *   vesselId: string
 *   eventType: 'earthquake' | 'tsunami'
 *   severity: 'critical' | 'high' | 'moderate' | 'low'
 *   policyId?: string (optional - auto-select if not provided)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { vesselId, eventType, severity, policyId, sendNotifications = false } = body

    // Validate inputs
    if (!vesselId || !eventType || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields: vesselId, eventType, severity' },
        { status: 400 }
      )
    }

    // Get vessel
    const vessel = await prisma.vessel.findUnique({
      where: { id: vesselId },
      include: {
        contacts: {
          include: { contact: true },
          orderBy: { priority: 'asc' }
        }
      }
    })

    if (!vessel) {
      return NextResponse.json({ error: 'Vessel not found' }, { status: 404 })
    }

    // Find applicable escalation policy
    let policy
    if (policyId) {
      policy = await prisma.escalationPolicy.findUnique({
        where: { id: policyId }
      })
    } else {
      // Auto-select policy based on event type and severity
      policy = await prisma.escalationPolicy.findFirst({
        where: {
          active: true,
          eventTypes: { has: eventType },
          severityLevels: { has: severity }
        }
      })
    }

    if (!policy) {
      return NextResponse.json(
        { 
          error: 'No matching escalation policy found',
          hint: `Create a policy for eventType="${eventType}" and severity="${severity}"`
        },
        { status: 404 }
      )
    }

    // Create test alert
    const alert = await prisma.vesselAlert.create({
      data: {
        vesselId: vessel.id,
        type: eventType,
        severity,
        eventId: `TEST-${Date.now()}`,
        eventType: eventType.toUpperCase(),
        riskLevel: severity,
        recommendation: `[TEST] This is a test ${eventType} alert for escalation testing`,
        message: `Test ${eventType} alert - Severity: ${severity}. Testing escalation policy: ${policy.name}`,
        status: 'pending',
        
        // Link to escalation policy
        escalationPolicyId: policy.id,
        escalationStep: 0,
        escalationStarted: false,
        
        // Mock event data
        distance: 150.5,
        waveHeight: eventType === 'tsunami' ? 2.5 : undefined,
        tsunamiETA: eventType === 'tsunami' ? 45 : undefined,
        coordinates: {
          lat: 0,
          lon: 0
        }
      }
    })

    // Trigger escalation (with dry run option)
    const escalationResult = await escalationService.initiateEscalation(
      alert.id,
      !sendNotifications // dryRun = true if sendNotifications is false
    )

    console.log(`📊 Test Alert ${sendNotifications ? 'SENT' : 'Created (DRY RUN)'}:`)
    console.log(`   Vessel: ${vessel.name || vessel.mmsi}`)
    console.log(`   Event: ${eventType} - ${severity}`)
    console.log(`   Policy: ${policy.name}`)
    console.log(`   Notifications Sent: ${escalationResult.notificationsSent}`)
    escalationResult.logs.forEach((log: string) => console.log(`   ${log}`))

    return NextResponse.json({
      success: true,
      dryRun: !sendNotifications,
      alert: {
        id: alert.id,
        vesselId: alert.vesselId,
        vesselName: vessel.name || vessel.mmsi,
        eventType,
        severity,
        policy: {
          id: policy.id,
          name: policy.name,
          steps: policy.steps
        },
        contacts: vessel.contacts.map(vc => ({
          name: vc.contact.name,
          role: vc.role,
          priority: vc.priority,
          phone: vc.contact.phone
        })),
        escalation: {
          started: escalationResult.escalationStarted,
          stepExecuted: escalationResult.stepExecuted,
          notificationsSent: escalationResult.notificationsSent,
          logs: escalationResult.logs
        },
        nextSteps: sendNotifications 
          ? `✅ Real notifications sent!\n${escalationResult.logs.join('\n')}`
          : `[DRY RUN] Alert created. Enable "Send Real Notifications" to actually send messages.\n\nWhat would happen:\n${escalationResult.logs.join('\n')}`
      }
    })
  } catch (error: any) {
    console.error('Error triggering test alert:', error)
    return NextResponse.json(
      { 
        error: 'Failed to trigger test alert',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
