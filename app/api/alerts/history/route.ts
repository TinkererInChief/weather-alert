import { NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET() {
  try {
    // Get recent alert logs with notification details
    const alerts = await db.getDetailedAlertLogs(20) // Last 20 alerts
    
    return NextResponse.json({
      success: true,
      alerts,
      total: alerts.length
    })
  } catch (error) {
    console.error('Error fetching alert history:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch alert history',
      alerts: []
    }, { status: 500 })
  }
}
