import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { alertRoutingService } from '@/lib/services/alert-routing-service'

// Validation schema
const createAlertSchema = z.object({
  eventId: z.string(),
  eventType: z.enum(['earthquake', 'tsunami', 'storm']),
  severity: z.enum(['low', 'moderate', 'high', 'critical']),
  distance: z.number().positive(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180)
  }),
  message: z.string().min(10),
  eventMagnitude: z.number().optional(),
  waveHeight: z.number().optional()
})

/**
 * POST /api/alerts/vessel/[vesselId]
 * Create a vessel alert and route to assigned contacts
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { vesselId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { vesselId } = params
    const body = await req.json()

    // Validate input
    const validatedData = createAlertSchema.parse(body)

    // Use AlertRoutingService to create and route the alert
    const result = await alertRoutingService.createAndRouteAlert({
      vesselId,
      eventId: validatedData.eventId,
      eventType: validatedData.eventType,
      severity: validatedData.severity,
      distance: validatedData.distance,
      coordinates: validatedData.coordinates,
      message: validatedData.message,
      eventMagnitude: validatedData.eventMagnitude,
      waveHeight: validatedData.waveHeight
    })

    if (result.isDuplicate) {
      return NextResponse.json(
        { error: 'Alert already exists for this event', alert: result.alert },
        { status: 409 }
      )
    }

    return NextResponse.json({
      alert: result.alert,
      recipientCount: result.recipientCount,
      deliveryLogs: result.deliveryLogs.length,
      success: true,
      ...(result.warning && { warning: result.warning })
    })

  } catch (error) {
    console.error('[Alert API] Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    )
  }
}
