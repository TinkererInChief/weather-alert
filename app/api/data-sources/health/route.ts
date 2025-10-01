import { NextResponse } from 'next/server'
import { dataAggregator } from '@/lib/data-sources'

/**
 * GET /api/data-sources/health
 * Returns health status of all earthquake and tsunami data sources
 */
export async function GET() {
  try {
    const health = dataAggregator.getSourcesHealth()
    
    return NextResponse.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching data source health:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch source health'
      },
      { status: 500 }
    )
  }
}
