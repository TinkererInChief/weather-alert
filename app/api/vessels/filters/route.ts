import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/vessels/filters
 * Get unique filter values for vessel filtering
 */
export async function GET() {
  try {
    // Get unique vessel types
    const vesselTypes = await prisma.vessel.groupBy({
      by: ['vesselType'],
      where: {
        vesselType: {
          not: null as any
        }
      },
      _count: {
        vesselType: true
      },
      orderBy: {
        _count: {
          vesselType: 'desc'
        }
      }
    })

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

    // Get unique flags
    const flags = await prisma.vessel.groupBy({
      by: ['flag'],
      where: {
        flag: {
          not: null as any
        }
      },
      _count: {
        flag: true
      },
      orderBy: {
        _count: {
          flag: 'desc'
        }
      }
    })

    return NextResponse.json({
      success: true,
      filters: {
        vesselTypes: vesselTypes.map(v => ({
          value: v.vesselType,
          count: v._count.vesselType
        })),
        owners: owners.map(o => ({
          value: o.owner,
          count: o._count.owner
        })),
        operators: operators.map(o => ({
          value: o.operator,
          count: o._count.operator
        })),
        flags: flags.map(f => ({
          value: f.flag,
          count: f._count.flag
        }))
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
