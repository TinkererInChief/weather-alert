export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Permission, withPermission } from '@/lib/rbac'

/**
 * GET /api/alerts/stats
 * Get alert statistics and analytics
 */
export const GET = withPermission(Permission.VIEW_ALERTS, async (req, session) => {
  try {
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Get total counts
    const totalAlerts = await prisma.alertLog.count({
      where: {
        timestamp: {
          gte: startDate
        }
      }
    })
    
    const successfulAlerts = await prisma.alertLog.count({
      where: {
        timestamp: {
          gte: startDate
        },
        success: true
      }
    })
    
    const failedAlerts = await prisma.alertLog.count({
      where: {
        timestamp: {
          gte: startDate
        },
        success: false
      }
    })
    
    // Get magnitude distribution
    const magnitudeDistribution = await prisma.alertLog.groupBy({
      by: ['magnitude'],
      where: {
        timestamp: {
          gte: startDate
        }
      },
      _count: {
        magnitude: true
      },
      orderBy: {
        magnitude: 'desc'
      }
    })
    
    // Get daily alert counts
    const dailyAlerts = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE("timestamp") as date, COUNT(*)::int as count
      FROM "alert_logs"
      WHERE "timestamp" >= ${startDate}
      GROUP BY DATE("timestamp")
      ORDER BY date ASC
    `
    
    // Get average contacts notified
    const avgContactsResult = await prisma.alertLog.aggregate({
      where: {
        timestamp: {
          gte: startDate
        }
      },
      _avg: {
        contactsNotified: true
      },
      _sum: {
        contactsNotified: true
      }
    })
    
    // Get magnitude statistics
    const magnitudeStats = await prisma.alertLog.aggregate({
      where: {
        timestamp: {
          gte: startDate
        }
      },
      _avg: {
        magnitude: true
      },
      _min: {
        magnitude: true
      },
      _max: {
        magnitude: true
      }
    })
    
    // Get top locations by alert count
    const topLocations = await prisma.alertLog.groupBy({
      by: ['location'],
      where: {
        timestamp: {
          gte: startDate
        }
      },
      _count: {
        location: true
      },
      orderBy: {
        _count: {
          location: 'desc'
        }
      },
      take: 10
    })
    
    // Get success rate by magnitude range
    const successByMagnitude = await prisma.$queryRaw<Array<{
      magnitude_range: string
      total: bigint
      successful: bigint
    }>>`
      SELECT 
        magnitude_range,
        COUNT(*)::int as total,
        COUNT(CASE WHEN success = true THEN 1 END)::int as successful
      FROM (
        SELECT 
          CASE 
            WHEN magnitude < 5.0 THEN '< 5.0'
            WHEN magnitude >= 5.0 AND magnitude < 6.0 THEN '5.0 - 5.9'
            WHEN magnitude >= 6.0 AND magnitude < 7.0 THEN '6.0 - 6.9'
            ELSE '>= 7.0'
          END as magnitude_range,
          success
        FROM "alert_logs"
        WHERE "timestamp" >= ${startDate}
      ) AS t
      GROUP BY magnitude_range
      ORDER BY 
        CASE magnitude_range
          WHEN '< 5.0' THEN 1
          WHEN '5.0 - 5.9' THEN 2
          WHEN '6.0 - 6.9' THEN 3
          ELSE 4
        END
    `
    
    // Calculate success rate
    const successRate = totalAlerts > 0 
      ? ((successfulAlerts / totalAlerts) * 100).toFixed(2)
      : '0.00'
    
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalAlerts,
          successfulAlerts,
          failedAlerts,
          successRate: parseFloat(successRate),
          avgContactsNotified: avgContactsResult._avg.contactsNotified || 0,
          totalContactsNotified: avgContactsResult._sum.contactsNotified || 0,
          period: {
            days,
            startDate,
            endDate: new Date()
          }
        },
        magnitudeStats: {
          average: magnitudeStats._avg.magnitude || 0,
          min: magnitudeStats._min.magnitude || 0,
          max: magnitudeStats._max.magnitude || 0
        },
        magnitudeDistribution,
        dailyAlerts: dailyAlerts.map(d => ({
          date: d.date,
          count: Number(d.count)
        })),
        topLocations,
        successByMagnitude: successByMagnitude.map(s => ({
          magnitudeRange: s.magnitude_range,
          total: Number(s.total),
          successful: Number(s.successful),
          successRate: Number(s.total) > 0 
            ? ((Number(s.successful) / Number(s.total)) * 100).toFixed(2)
            : '0.00'
        }))
      }
    })
  } catch (error) {
    console.error('Error fetching alert stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alert statistics' },
      { status: 500 }
    )
  }
})
