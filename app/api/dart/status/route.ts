import { NextResponse } from 'next/server'
import { DARTBuoySource } from '@/lib/data-sources/dart-buoy-source'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const dartSource = new DARTBuoySource()
    
    // Quick health check (just verify NDBC is accessible)
    const isHealthy = await dartSource.isAvailable()
    
    // Return status
    return NextResponse.json({
      success: true,
      status: {
        active: isHealthy ? 71 : 0,
        total: 71,
        health: isHealthy ? 100 : 0,
        lastUpdate: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('DART status check failed:', error)
    
    return NextResponse.json({
      success: false,
      status: {
        active: 0,
        total: 71,
        health: 0,
        lastUpdate: new Date().toISOString()
      },
      error: 'Failed to check DART network status'
    }, { status: 500 })
  }
}
