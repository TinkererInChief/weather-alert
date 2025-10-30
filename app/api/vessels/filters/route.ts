import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/vessels/filters
 * Get unique filter values for vessel filtering
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'
    if (!session && !isDev) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Get vessel types (trimmed, non-empty, excluding placeholders)
    const vesselTypes = await prisma.$queryRaw<Array<{ v: string; c: bigint }>>(Prisma.sql`
      SELECT BTRIM("vesselType") AS v, COUNT(*)::bigint AS c
      FROM "vessels"
      WHERE "vesselType" IS NOT NULL
        AND length(BTRIM("vesselType")) > 0
        AND UPPER(BTRIM("vesselType")) NOT IN ('?', 'NA', 'N/A', 'NIL', '0', '-', '--')
      GROUP BY v
      ORDER BY c DESC
      LIMIT 20
    `)

    // Get unique owners
    const owners = await prisma.vessel.groupBy({
      by: ['owner'],
      where: {
        owner: {
          not: null as any
        }
      },
      _count: {
        owner: true
      },
      orderBy: {
        _count: {
          owner: 'desc'
        }
      },
      take: 50 // Limit to top 50 owners
    })

    // Get unique operators
    const operators = await prisma.vessel.groupBy({
      by: ['operator'],
      where: {
        operator: {
          not: null as any
        }
      },
      _count: {
        operator: true
      },
      orderBy: {
        _count: {
          operator: 'desc'
        }
      },
      take: 50 // Limit to top 50 operators
    })

    // Get flags (trimmed, non-empty, normalized to upper-case, excluding placeholders)
    const flags = await prisma.$queryRaw<Array<{ v: string; c: bigint }>>(Prisma.sql`
      SELECT UPPER(BTRIM("flag")) AS v, COUNT(*)::bigint AS c
      FROM "vessels"
      WHERE "flag" IS NOT NULL
        AND length(BTRIM("flag")) > 0
        AND UPPER(BTRIM("flag")) NOT IN ('?', 'NA', 'N/A', 'NIL', '0', '-', '--')
      GROUP BY v
      ORDER BY c DESC
      LIMIT 100
    `)

    return NextResponse.json({
      success: true,
      filters: {
        vesselTypes: vesselTypes.map(v => ({
          value: String(v.v),
          count: Number(v.c)
        })),
        owners: owners.map(o => ({
          value: String(o.owner),
          count: o._count.owner
        })),
        operators: operators.map(o => ({
          value: String(o.operator),
          count: o._count.operator
        })),
        flags: flags.map(f => ({
          value: String(f.v),
          count: Number(f.c)
        }))
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, s-maxage=300'
      }
    })
  } catch (error) {
    console.error('Error fetching vessel filters:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch filters' },
      { status: 500 }
    )
  }
}
