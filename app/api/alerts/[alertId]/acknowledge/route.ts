import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const acknowledgeSchema = z.object({
  contactId: z.string().optional(),
  notes: z.string().optional()
})

/**
 * POST /api/alerts/[alertId]/acknowledge
 * Acknowledge a vessel alert
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { alertId } = params
    const body = await req.json()
    const { contactId, notes } = acknowledgeSchema.parse(body)

    // Find the alert
    const alert = await prisma.vesselAlert.findUnique({
      where: { id: alertId },
      include: {
        vessel: {
          select: { id: true, name: true, mmsi: true }
        }
      }
    })

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    // Check if already acknowledged
    if (alert.status === 'acknowledged') {
      return NextResponse.json({
        alert,
        message: 'Alert was already acknowledged',
        acknowledgedAt: alert.acknowledgedAt,
        acknowledgedBy: alert.acknowledgedBy
      })
    }

    // Update alert
    const updatedAlert = await prisma.vesselAlert.update({
      where: { id: alertId },
      data: {
        status: 'acknowledged',
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: contactId || session.user.id
      },
      include: {
        vessel: {
          select: { id: true, name: true, mmsi: true }
        }
      }
    })

    // Update all delivery logs for this alert
    await prisma.deliveryLog.updateMany({
      where: {
        vesselAlertId: alertId,
        status: { in: ['pending', 'sent', 'delivered'] }
      },
      data: {
        status: 'acknowledged',
        deliveredAt: new Date()
      }
    })

    // If contactId provided, update specific delivery logs
    if (contactId) {
      await prisma.deliveryLog.updateMany({
        where: {
          vesselAlertId: alertId,
          contactId
        },
        data: {
          status: 'acknowledged',
          deliveredAt: new Date()
        }
      })
    }

    console.log(`[Alert] Acknowledged: ${alert.vessel.name} - ${alert.eventType} (${alertId})`)

    return NextResponse.json({
      alert: updatedAlert,
      success: true,
      message: 'Alert acknowledged successfully',
      acknowledgedAt: updatedAlert.acknowledgedAt,
      acknowledgedBy: updatedAlert.acknowledgedBy
    })

  } catch (error) {
    console.error('[Alert Acknowledge] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to acknowledge alert' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/alerts/[alertId]/acknowledge
 * Get acknowledgment status
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const { alertId } = params

    const alert = await prisma.vesselAlert.findUnique({
      where: { id: alertId },
      select: {
        id: true,
        status: true,
        acknowledged: true,
        acknowledgedAt: true,
        acknowledgedBy: true,
        vessel: {
          select: { name: true, mmsi: true }
        }
      }
    })

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    return NextResponse.json({
      alert,
      isAcknowledged: alert.acknowledged
    })

  } catch (error) {
    console.error('[Alert Acknowledge Status] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get acknowledgment status' },
      { status: 500 }
    )
  }
}
