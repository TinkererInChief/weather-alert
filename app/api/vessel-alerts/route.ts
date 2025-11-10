import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/vessel-alerts
 * Fetch vessel alerts with filters, pagination, and delivery logs
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Filters
    const vesselId = searchParams.get('vesselId')
    const severity = searchParams.get('severity')
    const status = searchParams.get('status')
    const acknowledged = searchParams.get('acknowledged')
    const eventType = searchParams.get('eventType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const where: any = {}
    
    if (vesselId) where.vesselId = vesselId
    if (severity) where.severity = severity
    if (status) where.status = status
    if (acknowledged !== null && acknowledged !== undefined) {
      where.acknowledged = acknowledged === 'true'
    }
    if (eventType) where.eventType = eventType
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    // Fetch alerts with relations
    const [alerts, total] = await Promise.all([
      prisma.vesselAlert.findMany({
        where,
        include: {
          vessel: {
            select: {
              id: true,
              name: true,
              mmsi: true,
              imo: true
            }
          },
          deliveryLogs: {
            include: {
              contact: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.vesselAlert.count({ where })
    ])

    // Calculate summary stats
    const stats = await prisma.vesselAlert.groupBy({
      by: ['status'],
      where,
      _count: true
    })

    const acknowledged_count = await prisma.vesselAlert.count({
      where: { ...where, acknowledged: true }
    })

    const severityStats = await prisma.vesselAlert.groupBy({
      by: ['severity'],
      where,
      _count: true
    })

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        },
        stats: {
          byStatus: stats.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
          bySeverity: severityStats.reduce((acc, s) => ({ ...acc, [s.severity]: s._count }), {}),
          acknowledged: acknowledged_count,
          unacknowledged: total - acknowledged_count
        }
      }
    })

  } catch (error) {
    console.error('[Vessel Alerts API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vessel alerts' },
      { status: 500 }
    )
  }
}
