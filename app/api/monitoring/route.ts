import { NextResponse } from 'next/server'
import { alertManager } from '@/lib/alert-manager'
import { Permission, withPermission } from '@/lib/rbac'

/**
 * GET /api/monitoring
 * Get monitoring status (requires VIEW_ALERTS permission)
 */
export const GET = withPermission(Permission.VIEW_ALERTS, async (req, session) => {
  try {
    const status = alertManager.getMonitoringStatus()
    
    return NextResponse.json({
      success: true,
      ...status
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get monitoring status'
      },
      { status: 500 }
    )
  }
})

/**
 * POST /api/monitoring
 * Start/stop monitoring (requires MANAGE_SETTINGS permission)
 */
export const POST = withPermission(Permission.MANAGE_SETTINGS, async (request, session) => {
  try {
    const { action } = await request.json()
    
    if (action === 'start') {
      alertManager.startMonitoring()
      return NextResponse.json({
        success: true,
        message: 'Monitoring started'
      })
    } else if (action === 'stop') {
      alertManager.stopMonitoring()
      return NextResponse.json({
        success: true,
        message: 'Monitoring stopped'
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Use "start" or "stop"'
        },
        { status: 400 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to control monitoring'
      },
      { status: 500 }
    )
  }
})
