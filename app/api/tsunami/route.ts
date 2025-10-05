import { NextResponse } from 'next/server'
import { TsunamiService } from '@/lib/services/tsunami-service'

export async function GET() {
  try {
    console.log('🌊 Starting tsunami alert monitoring...')
    
    // Fetch latest tsunami alerts from NOAA and PTWC
    const tsunamiService = TsunamiService.getInstance()
    const alerts = await tsunamiService.getNewTsunamiAlerts()
    
    if (alerts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active tsunami alerts',
        data: {
          alertCount: 0,
          alerts: [],
          sources: ['noaa', 'ptwc'],
          lastChecked: new Date().toISOString()
        }
      })
    }

    // Store alerts in database
    const storedAlerts = []
    
    for (const alert of alerts) {
      try {
        await tsunamiService.storeTsunamiAlert(alert)
        storedAlerts.push({
          ...alert,
          processedAt: new Date().toISOString(),
          formattedMessage: tsunamiService.formatTsunamiAlert(alert)
        })
      } catch (error) {
        console.error(`❌ Error storing alert ${alert.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${storedAlerts.length} tsunami alerts`,
      data: {
        alertCount: storedAlerts.length,
        alerts: storedAlerts,
        sources: Array.from(new Set(storedAlerts.map(a => a.source))),
        lastChecked: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Tsunami monitoring error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tsunami alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('🌊 Manual tsunami alert check triggered...')
    
    // This endpoint allows manual triggering of tsunami monitoring
    const tsunamiService = TsunamiService.getInstance()
    const alerts = await tsunamiService.getNewTsunamiAlerts()
    
    return NextResponse.json({
      success: true,
      message: 'Manual tsunami check completed',
      data: {
        alertCount: alerts.length,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Manual tsunami check error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Manual tsunami check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
