import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * Health check for realtime stats updater service
 * GET /api/health/stats
 * 
 * Returns:
 * - healthy: Stats updated within 2 minutes
 * - warning: Stats updated 2-5 minutes ago
 * - critical: Stats updated >5 minutes ago or missing
 */
export async function GET() {
  try {
    const stats = await prisma.$queryRaw<Array<{
      updated_at: Date
    }>>(Prisma.sql`
      SELECT "updated_at" FROM "realtime_stats" WHERE id = 'singleton'
    `)

    if (!stats || stats.length === 0) {
      return NextResponse.json({
        status: 'critical',
        message: 'Stats table not populated',
        lastUpdate: null,
        minutesSinceUpdate: null,
        recommendation: 'Start the stats updater: pnpm stats:update'
      }, { status: 503 })
    }

    const lastUpdate = new Date(stats[0].updated_at)
    const now = new Date()
    const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60)

    let status: 'healthy' | 'warning' | 'critical'
    let message: string
    let httpStatus: number

    if (minutesSinceUpdate < 2) {
      status = 'healthy'
      message = 'Stats updater is running normally'
      httpStatus = 200
    } else if (minutesSinceUpdate < 5) {
      status = 'warning'
      message = 'Stats updater may be slow or lagging'
      httpStatus = 200
    } else {
      status = 'critical'
      message = 'Stats updater appears to be down'
      httpStatus = 503
    }

    return NextResponse.json({
      status,
      message,
      lastUpdate: lastUpdate.toISOString(),
      minutesSinceUpdate: Math.round(minutesSinceUpdate * 100) / 100,
      recommendation: status === 'critical' 
        ? 'Restart the stats updater: pnpm stats:update' 
        : status === 'warning'
        ? 'Check stats updater logs for issues'
        : null
    }, { status: httpStatus })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check stats health',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
