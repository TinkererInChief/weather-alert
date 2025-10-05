import { NextRequest, NextResponse } from 'next/server'
import { perplexityService } from '@/lib/services/perplexity-service'

/**
 * GET /api/maritime/intelligence
 * Get AI-powered maritime intelligence for an earthquake/tsunami event
 * 
 * Query params:
 * - magnitude: number
 * - location: string
 * - latitude: number
 * - longitude: number
 * - type: 'earthquake' | 'tsunami'
 * - timestamp: ISO string
 * - tsunamiWarning: boolean (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Extract query parameters
    const magnitude = parseFloat(searchParams.get('magnitude') || '0')
    const location = searchParams.get('location') || 'Unknown'
    const latitude = parseFloat(searchParams.get('latitude') || '0')
    const longitude = parseFloat(searchParams.get('longitude') || '0')
    const type = (searchParams.get('type') || 'earthquake') as 'earthquake' | 'tsunami'
    const timestamp = searchParams.get('timestamp') 
      ? new Date(searchParams.get('timestamp')!)
      : new Date()
    const tsunamiWarning = searchParams.get('tsunamiWarning') === 'true'

    // Validate required parameters
    if (!magnitude || !location) {
      return NextResponse.json(
        { error: 'Missing required parameters: magnitude, location' },
        { status: 400 }
      )
    }

    // Get maritime intelligence from Perplexity
    const intelligence = await perplexityService.getMaritimeIntelligence({
      type,
      magnitude,
      location,
      latitude,
      longitude,
      timestamp,
      tsunamiWarning
    })

    return NextResponse.json({
      success: true,
      data: intelligence
    })

  } catch (error) {
    console.error('Maritime intelligence API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch maritime intelligence',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/maritime/intelligence
 * Alternative method with body parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      type = 'earthquake',
      magnitude,
      location,
      latitude,
      longitude,
      timestamp = new Date().toISOString(),
      tsunamiWarning = false
    } = body

    // Validate required parameters
    if (!magnitude || !location || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Missing required parameters: magnitude, location, latitude, longitude' },
        { status: 400 }
      )
    }

    // Get maritime intelligence from Perplexity
    const intelligence = await perplexityService.getMaritimeIntelligence({
      type,
      magnitude,
      location,
      latitude,
      longitude,
      timestamp: new Date(timestamp),
      tsunamiWarning
    })

    return NextResponse.json({
      success: true,
      data: intelligence
    })

  } catch (error) {
    console.error('Maritime intelligence API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch maritime intelligence',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
