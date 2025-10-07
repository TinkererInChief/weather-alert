import { NextRequest, NextResponse } from 'next/server'
import { fetchSeaState } from '@/lib/services/noaa-ndbc-service'
import { fetchTidalData } from '@/lib/services/noaa-tides-service'
import { fetchAftershockForecast } from '@/lib/services/usgs-aftershock-service'
import { findSARResources } from '@/lib/services/sar-service'

/**
 * POST /api/maritime/environmental
 * Fetch all Phase 1 environmental data sources for a maritime event
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { latitude, longitude, magnitude, tsunamiWarning } = body

    if (!latitude || !longitude) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    // Fetch all Phase 1 data sources in parallel
    // Use Promise.allSettled to handle individual failures gracefully
    const [seaStateResult, tidalResult, aftershockResult, sarResult] = await Promise.allSettled([
      fetchSeaState(latitude, longitude),
      fetchTidalData(latitude, longitude, 500),
      magnitude ? fetchAftershockForecast(
        `event-${latitude}-${longitude}-${Date.now()}`, // mainshockId
        magnitude,
        latitude,
        longitude,
        10, // depth - default if not provided
        `${latitude.toFixed(2)}°N ${longitude.toFixed(2)}°E`, // location
        new Date() // timestamp
      ) : Promise.resolve(null),
      findSARResources(latitude, longitude)
    ])

    // Extract successful results, null for failures
    const seaState = seaStateResult.status === 'fulfilled' ? seaStateResult.value : null
    const tidal = tidalResult.status === 'fulfilled' ? tidalResult.value : null
    const aftershockForecast = aftershockResult.status === 'fulfilled' ? aftershockResult.value : null
    const sarSummary = sarResult.status === 'fulfilled' ? sarResult.value : null

    // Transform aftershock forecast to simplified format for display
    const aftershock = aftershockForecast ? {
      probability24h: Math.round((aftershockForecast.probabilities.find(p => p.timeframe === 'next 24 hours')?.probability || 0) * 100),
      probabilityWeek: Math.round((aftershockForecast.probabilities.find(p => p.timeframe === 'next week')?.probability || 0) * 100),
      expectedMagnitude: aftershockForecast.probabilities[0]?.magnitude || magnitude - 1.2,
      peakRiskTime: '6-12 hours from event'
    } : null

    // Transform SAR summary to simplified format for display
    const sar = sarSummary?.nearestCoastGuard ? {
      nearestResource: sarSummary.nearestCoastGuard.name,
      distance: Math.round(sarSummary.nearestCoastGuard.distance),
      eta: sarSummary.nearestCoastGuard.estimatedResponseTime,
      resourceType: sarSummary.nearestCoastGuard.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    } : null

    // Log results for debugging
    console.log('[Environmental API] Data availability:', {
      location: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      seaState: seaState ? `Available (${seaState.buoyName})` : 'Not available (no buoy within 500km)',
      tidal: tidal ? `Available (${tidal.stationName})` : 'Not available (no tide station within 500km)',
      aftershock: aftershock ? 'Available' : 'Not calculated',
      sar: sar ? `Available (${sar.nearestResource})` : 'Not available'
    })
    
    // Log any failures for debugging
    if (seaStateResult.status === 'rejected') {
      console.warn('[Environmental API] Sea state fetch failed:', seaStateResult.reason)
    }
    if (tidalResult.status === 'rejected') {
      console.warn('[Environmental API] Tidal data fetch failed:', tidalResult.reason)
    }
    if (aftershockResult.status === 'rejected') {
      console.warn('[Environmental API] Aftershock forecast failed:', aftershockResult.reason)
    }
    if (sarResult.status === 'rejected') {
      console.warn('[Environmental API] SAR resources fetch failed:', sarResult.reason)
    }

    return NextResponse.json({
      success: true,
      data: {
        seaState,
        tidal,
        aftershock,
        sar
      },
      metadata: {
        latitude,
        longitude,
        fetchedAt: new Date().toISOString(),
        dataSources: {
          seaState: seaState ? 'available' : 'unavailable',
          tidal: tidal ? 'available' : 'unavailable',
          aftershock: aftershock ? 'available' : 'unavailable',
          sar: sar ? 'available' : 'unavailable'
        }
      }
    })
  } catch (error) {
    console.error('[Environmental API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch environmental data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
