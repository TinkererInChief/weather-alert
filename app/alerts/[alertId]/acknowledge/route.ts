import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /alerts/[alertId]/acknowledge
 * Public endpoint to acknowledge alerts via email/SMS link
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const { alertId } = params

    // Find the alert
    const alert = await prisma.vesselAlert.findUnique({
      where: { id: alertId },
      include: {
        vessel: {
          select: {
            name: true,
            mmsi: true
          }
        }
      }
    })

    if (!alert) {
      return NextResponse.redirect(new URL('/404', req.url))
    }

    // Check if already acknowledged
    if (alert.acknowledged) {
      return NextResponse.redirect(
        new URL(`/alerts/${alertId}/already-acknowledged`, req.url)
      )
    }

    // Acknowledge the alert
    await prisma.vesselAlert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        status: 'acknowledged'
      }
    })

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/alerts/${alertId}/acknowledged`, req.url)
    )

  } catch (error) {
    console.error('[Acknowledge] Error:', error)
    return NextResponse.json(
      { error: 'Failed to acknowledge alert' },
      { status: 500 }
    )
  }
}
