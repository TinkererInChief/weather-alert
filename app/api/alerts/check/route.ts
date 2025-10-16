import { NextResponse } from 'next/server'
import { log } from '@/lib/logger'
import { alertManager } from '@/lib/alert-manager'

export async function POST() {
  try {
    const newEarthquakes = await alertManager.checkForNewEarthquakes()
    
    return NextResponse.json({
      success: true,
      newAlerts: newEarthquakes.length,
      earthquakes: newEarthquakes.map(eq => ({
        id: eq.id,
        magnitude: eq.properties.mag,
        location: eq.properties.place,
        time: new Date(eq.properties.time).toISOString()
      }))
    })
  } catch (error) {
    log.error('Error checking for earthquakes', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check for earthquakes'
      },
      { status: 500 }
    )
  }
}
