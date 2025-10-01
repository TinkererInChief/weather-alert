import { NextResponse } from 'next/server'
import { dataAggregator } from '@/lib/data-sources'

/**
 * GET /api/data-sources/test
 * Test multi-source earthquake data aggregation
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const minMagnitude = parseFloat(searchParams.get('minMagnitude') || '4.0')
    const timeWindowHours = parseInt(searchParams.get('hours') || '24')
    
    console.log(`🧪 Testing multi-source fetch: minMag=${minMagnitude}, hours=${timeWindowHours}`)
    
    const startTime = Date.now()
    
    // Fetch from all sources
    const earthquakes = await dataAggregator.fetchAggregatedEarthquakes({
      minMagnitude,
      timeWindowHours
    })
    
    const fetchTime = Date.now() - startTime
    
    // Get source health
    const health = dataAggregator.getSourcesHealth()
    
    return NextResponse.json({
      success: true,
      data: {
        earthquakes,
        count: earthquakes.length,
        fetchTimeMs: fetchTime,
        sourceHealth: health,
        parameters: {
          minMagnitude,
          timeWindowHours
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error testing multi-source fetch:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test multi-source fetch'
      },
      { status: 500 }
    )
  }
}
