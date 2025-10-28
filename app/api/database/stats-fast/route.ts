import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Ultra-fast stats endpoint - only critical metrics
export async function GET() {
  try {
    // Only fetch what's needed for Real-time Activity widget
    const [posLastHour, posLast15, activeVessels] = await Promise.all([
      prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM "vessel_positions"
        WHERE "createdAt" IS NOT NULL 
          AND "createdAt" >= (now() - interval '1 hour')
      `),
      prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM "vessel_positions"
        WHERE "createdAt" IS NOT NULL
          AND "createdAt" >= (now() - interval '15 minutes')
      `),
      prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(DISTINCT "vesselId")::bigint AS c
        FROM "vessel_positions"
        WHERE "createdAt" IS NOT NULL
          AND "createdAt" >= (now() - interval '1 hour')
      `)
    ])

    return NextResponse.json({
      success: true,
      stats: {
        positionStats: {
          lastHour: Number(posLastHour[0]?.c || 0),
          last15Min: Number(posLast15[0]?.c || 0)
        },
        vesselStats: {
          recentlyActive: Number(activeVessels[0]?.c || 0)
        }
      }
    })
  } catch (error) {
    console.error('Fast stats error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 })
  }
}
