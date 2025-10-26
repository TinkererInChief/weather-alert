import { NextResponse } from 'next/server'
import { VesselTrackingCoordinator } from '@/lib/services/vessel-tracking-coordinator'

export const dynamic = 'force-dynamic'

/**
 * POST /api/vessel-tracking/stop
 * Stop vessel tracking services
 */
export async function POST() {
  try {
    const coordinator = VesselTrackingCoordinator.getInstance()
    coordinator.stop()
    
    return NextResponse.json({
      success: true,
      message: 'Vessel tracking stopped successfully'
    })
  } catch (error) {
    console.error('Error stopping vessel tracking:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
