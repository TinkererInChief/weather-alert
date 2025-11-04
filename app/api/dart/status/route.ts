import { NextResponse } from 'next/server'
import { getCachedDartStatus } from '@/lib/services/dart-live-status.service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for fetching all stations

/**
 * GET /api/dart/status
 * Returns real-time status of all DART buoys from NOAA NDBC
 * Uses 5-minute cache to avoid overwhelming NOAA servers
 */
export async function GET() {
  try {
    console.log('📡 API Request: /api/dart/status')
    
    // Fetch live status (uses cache if available)
    const liveStatus = await getCachedDartStatus()
    
    // Calculate health percentage
    const health = Math.round((liveStatus.online / liveStatus.total) * 100)
    
    return NextResponse.json({
      success: true,
      status: {
        total: liveStatus.total,
        online: liveStatus.online,
        detecting: liveStatus.detecting,
        offline: liveStatus.offline,
        health,
        lastUpdate: liveStatus.lastUpdated.toISOString()
      },
      stations: liveStatus.stations,
      cache: {
        ttl: 300, // 5 minutes in seconds
        nextUpdate: new Date(liveStatus.lastUpdated.getTime() + 5 * 60 * 1000).toISOString()
      }
    })
  } catch (error) {
    console.error('❌ DART status check failed:', error)
    
    return NextResponse.json({
      success: false,
      status: {
        total: 71,
        online: 0,
        detecting: 0,
        offline: 71,
        health: 0,
        lastUpdate: new Date().toISOString()
      },
      error: 'Failed to fetch DART network status from NOAA'
    }, { status: 500 })
  }
}
