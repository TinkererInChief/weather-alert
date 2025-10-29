import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 10 // 10 second timeout for this route

// Cache stats for 30 seconds - good enough for dashboard
let cache: {
  ts: number
  data: any
} | null = null

const CACHE_TTL = 30 * 1000 // 30 seconds

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        cached: true,
        stats: cache.data
      })
    }

    // Read from pre-computed realtime_stats table (instant!)
    // This table is updated by a background job every 30 seconds
    const stats = await prisma.$queryRaw<Array<{
      positions_last_hour: number
      positions_last_15min: number
      vessels_active_last_hour: number
      total_vessels: number
      total_positions_estimate: bigint
      updated_at: Date
    }>>(Prisma.sql`
      SELECT 
        positions_last_hour,
        positions_last_15min,
        vessels_active_last_hour,
        total_vessels,
        total_positions_estimate,
        updated_at
      FROM "realtime_stats" 
      WHERE id = 'singleton'
    `)

    if (!stats || stats.length === 0) {
      // Table not populated yet - return zeros
      return NextResponse.json({
        success: true,
        cached: false,
        stats: {
          tables: [],
          totalSize: 'N/A',
          positionStats: { total: 0, today: 0, lastHour: 0, last15Min: 0 },
          vesselStats: { total: 0, withPositions: 0, recentlyActive: 0, newToday: 0 },
          alertStats: { total: 0, active: 0, critical: 0 },
          userStats: { total: 0, admins: 0 }
        },
        message: 'Stats not yet populated - background job starting'
      })
    }

    const s = stats[0]
    
    // Compute today's positions (estimate based on rate)
    const positionsToday = Math.round(s.positions_last_hour * 24 * 0.7) // rough estimate
    const vesselsNewToday = Math.round(s.total_vessels * 0.001) // 0.1% new per day estimate
    
    const data = {
      tables: [], // Will be populated by other endpoints if needed
      totalSize: 'N/A', // Can add db size query later if needed
      positionStats: {
        total: Number(s.total_positions_estimate),
        today: positionsToday,
        lastHour: s.positions_last_hour,
        last15Min: s.positions_last_15min
      },
      vesselStats: {
        total: s.total_vessels,
        withPositions: Math.round(s.total_vessels * 0.85), // estimate
        recentlyActive: s.vessels_active_last_hour,
        newToday: vesselsNewToday
      },
      alertStats: {
        total: 0,
        active: 0,
        critical: 0
      },
      userStats: {
        total: 1, // At least the admin we just created
        admins: 1
      }
    }

    // Update cache
    cache = {
      ts: Date.now(),
      data
    }

    return NextResponse.json({
      success: true,
      cached: false,
      stats: data
    })
  } catch (error) {
    console.error('Cached stats error:', error)
    // Return stale cache on error
    if (cache) {
      return NextResponse.json({
        success: true,
        cached: true,
        stale: true,
        stats: cache.data
      })
    }
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 })
  }
}
