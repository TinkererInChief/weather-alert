import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/alerts/[alertId]/delivery-status
 * Get detailed delivery status for an alert
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { alertId } = params

    // Get alert with delivery logs
    const alert = await prisma.vesselAlert.findUnique({
      where: { id: alertId },
      include: {
        vessel: {
          select: { id: true, name: true, mmsi: true }
        },
        deliveryLogs: {
          include: {
            contact: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                whatsapp: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    // Calculate summary statistics
    const deliveryLogs = alert.deliveryLogs
    const summary = {
      total: deliveryLogs.length,
      pending: deliveryLogs.filter(l => l.status === 'pending').length,
      sent: deliveryLogs.filter(l => l.status === 'sent').length,
      delivered: deliveryLogs.filter(l => l.status === 'delivered').length,
      failed: deliveryLogs.filter(l => l.status === 'failed').length,
      acknowledged: deliveryLogs.filter(l => l.status === 'acknowledged').length
    }

    // Calculate delivery rate
    const successfulDeliveries = summary.sent + summary.delivered + summary.acknowledged
    const deliveryRate = summary.total > 0 
      ? Math.round((successfulDeliveries / summary.total) * 100) 
      : 0

    // Calculate response time (if acknowledged)
    let responseTime = null
    if (alert.acknowledgedAt && alert.sentAt) {
      responseTime = Math.floor((alert.acknowledgedAt.getTime() - alert.sentAt.getTime()) / 1000) // seconds
    }

    // Group logs by channel
    const byChannel = {
      sms: deliveryLogs.filter(l => l.channel === 'sms'),
      email: deliveryLogs.filter(l => l.channel === 'email'),
      whatsapp: deliveryLogs.filter(l => l.channel === 'whatsapp'),
      voice: deliveryLogs.filter(l => l.channel === 'voice')
    }

    // Get unique contacts
    const uniqueContacts = Array.from(
      new Set(deliveryLogs.map(l => l.contactId))
    ).length

    return NextResponse.json({
      alert: {
        id: alert.id,
        vesselId: alert.vesselId,
        vesselName: alert.vessel.name,
        eventType: alert.eventType,
        severity: alert.severity,
        status: alert.status,
        message: alert.message,
        distance: alert.distance,
        coordinates: alert.coordinates,
        createdAt: alert.createdAt,
        sentAt: alert.sentAt,
        acknowledgedAt: alert.acknowledgedAt,
        acknowledgedBy: alert.acknowledgedBy,
        expiresAt: alert.expiresAt
      },
      summary: {
        ...summary,
        deliveryRate: `${deliveryRate}%`,
        uniqueContacts,
        responseTime: responseTime ? `${responseTime}s` : null
      },
      byChannel: {
        sms: {
          count: byChannel.sms.length,
          sent: byChannel.sms.filter(l => l.status === 'sent' || l.status === 'delivered').length,
          failed: byChannel.sms.filter(l => l.status === 'failed').length
        },
        email: {
          count: byChannel.email.length,
          sent: byChannel.email.filter(l => l.status === 'sent' || l.status === 'delivered').length,
          failed: byChannel.email.filter(l => l.status === 'failed').length
        },
        whatsapp: {
          count: byChannel.whatsapp.length,
          sent: byChannel.whatsapp.filter(l => l.status === 'sent' || l.status === 'delivered').length,
          failed: byChannel.whatsapp.filter(l => l.status === 'failed').length
        }
      },
      deliveryLogs: deliveryLogs.map(log => ({
        id: log.id,
        contact: {
          id: log.contact.id,
          name: log.contact.name,
          [log.channel]: log.contact[log.channel as keyof typeof log.contact]
        },
        channel: log.channel,
        status: log.status,
        attempts: log.attempts,
        sentAt: log.sentAt,
        deliveredAt: log.deliveredAt,
        lastAttemptAt: log.lastAttemptAt,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt
      }))
    })

  } catch (error) {
    console.error('[Alert Delivery Status] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get delivery status' },
      { status: 500 }
    )
  }
}
