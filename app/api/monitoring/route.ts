import { NextResponse } from 'next/server'
import { alertManager } from '@/lib/alert-manager'

export async function GET() {
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
}

export async function POST(request: Request) {
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
}
