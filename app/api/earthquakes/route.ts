import { NextResponse } from 'next/server'
import { EarthquakeService } from '@/lib/earthquake-service'

export async function GET() {
  try {
    const earthquakeService = EarthquakeService.getInstance()
    const earthquakes = await earthquakeService.fetchRecentEarthquakes()
    
    return NextResponse.json({
      success: true,
      data: earthquakes,
      count: earthquakes.length
    })
  } catch (error) {
    console.error('Error fetching earthquakes:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch earthquakes'
      },
      { status: 500 }
    )
  }
}
