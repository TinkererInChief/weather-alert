import { NextResponse } from 'next/server'
import { VesselTrackingCoordinator } from '@/lib/services/vessel-tracking-coordinator'

export const dynamic = 'force-dynamic'

/**
 * POST /api/vessel-tracking/start
 * Start vessel tracking services (AISStream + OpenShipData)
 */
export async function POST() {
  try {
    const coordinator = VesselTrackingCoordinator.getInstance()
    
    // Start with default high-risk regions
    await coordinator.start()
    
    const status = coordinator.getStatus()
    
    return NextResponse.json({
      success: true,
      message: 'Vessel tracking started successfully',
      status
    })
  } catch (error) {
    console.error('Error starting vessel tracking:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/vessel-tracking/start
 * Get current status
 */
export async function GET() {
  try {
    const coordinator = VesselTrackingCoordinator.getInstance()
    const status = coordinator.getStatus()
    
    return NextResponse.json({
      success: true,
      status
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
