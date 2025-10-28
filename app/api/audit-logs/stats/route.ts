import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { Permission, withPermission } from '@/lib/rbac'

/**
 * GET /api/audit-logs/stats
 * Get audit log statistics
 */
export const GET = withPermission(Permission.VIEW_AUDIT_LOGS, async (req, session) => {
  try {
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Get action counts
    const actionCounts = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        action: true
      },
      orderBy: {
        _count: {
          action: 'desc'
        }
      },
      take: 10
    })
    
    // Get resource counts
    const resourceCounts = await prisma.auditLog.groupBy({
      by: ['resource'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        resource: true
      },
      orderBy: {
        _count: {
          resource: 'desc'
        }
      },
      take: 10
    })
    
    // Get user activity
    const userActivity = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: startDate
        },
        userId: {
          not: null
        }
      },
      _count: {
        userId: true
      },
      orderBy: {
        _count: {
          userId: 'desc'
        }
      },
      take: 10
    })
    
    // Fetch user details for top users
    const userIds = userActivity.map(u => u.userId).filter(Boolean) as string[]
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })
    
    const userMap = new Map(users.map(u => [u.id, u]))
    
    const userActivityWithDetails = userActivity.map(activity => ({
      ...activity,
      user: activity.userId ? userMap.get(activity.userId) : null
    }))
    
    // Get total count
    const totalLogs = await prisma.auditLog.count({
      where: {
        createdAt: {
          gte: startDate
        }
      }
    })
    
    // Get daily activity for chart
    const dailyActivity = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE("createdAt") as date, COUNT(*)::int as count
      FROM "audit_logs"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `
    
    return NextResponse.json({
      success: true,
      data: {
        totalLogs,
        actionCounts,
        resourceCounts,
        userActivity: userActivityWithDetails,
        dailyActivity: dailyActivity.map(d => ({
          date: d.date,
          count: Number(d.count)
        })),
        period: {
          days,
          startDate,
          endDate: new Date()
        }
      }
    })
  } catch (error) {
    console.error('Error fetching audit log stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit log statistics' },
      { status: 500 }
    )
  }
})
