import { NextResponse } from 'next/server'
import { TsunamiService } from '@/lib/tsunami-service'

export async function GET() {
  try {
    console.log('🌊 Starting tsunami alert monitoring...')
    
    // Fetch latest tsunami alerts from NOAA
    const alerts = await TsunamiService.fetchLatestAlerts()
    
    if (alerts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active tsunami alerts',
        data: {
          alertCount: 0,
          alerts: []
        }
      })
    }

    // Process each alert and assess threat level
    const processedAlerts = []
    
    for (const alert of alerts) {
      try {
        // Assess tsunami threat (simplified - no earthquake data for now)
        const mockEarthquake = {
          magnitude: alert.magnitude || 0,
          depth: alert.depth ? parseFloat(alert.depth.replace(/[^\d.]/g, '')) : 0,
          latitude: alert.latitude,
          longitude: alert.longitude,
          location: alert.location
        }

        const threat = TsunamiService.assessTsunamiThreat(mockEarthquake, alerts)
        
        // Store in database if significant threat
        if (threat.level !== 'information' || threat.confidence > 0.3) {
          await TsunamiService.storeTsunamiAlert(alert, threat)
        }

        processedAlerts.push({
          ...alert,
          threat,
          processedAt: new Date().toISOString()
        })

      } catch (error) {
        console.error(`❌ Error processing alert ${alert.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedAlerts.length} tsunami alerts`,
      data: {
        alertCount: processedAlerts.length,
        alerts: processedAlerts,
        sources: ['NTWC', 'PTWC'],
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
    const alerts = await TsunamiService.fetchLatestAlerts()
    
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
