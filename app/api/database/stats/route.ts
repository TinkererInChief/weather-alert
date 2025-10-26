import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/database/stats
 * Get comprehensive database statistics
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow authenticated users to view database stats (or in development)
    const isDev = process.env.NODE_ENV === 'development'
    if (!session && !isDev) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000)
    const last15Min = new Date(now.getTime() - 15 * 60 * 1000)

    // Vessel statistics
    const [
      totalVessels,
      vesselsWithPositions,
      recentlyActiveVessels,
      newVesselsToday
    ] = await Promise.all([
      prisma.vessel.count().catch(e => { console.error('vessel.count error:', e); return 0 }),
      prisma.vessel.count({
        where: {
          positions: {
            some: {}
          }
        }
      }).catch(e => { console.error('vessel.count with positions error:', e); return 0 }),
      prisma.vessel.count({
        where: {
          lastSeen: {
            gte: lastHour
          }
        }
      }).catch(e => { console.error('vessel.count recently active error:', e); return 0 }),
      prisma.vessel.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      }).catch(e => { console.error('vessel.count new today error:', e); return 0 })
    ])

    // Position statistics
    const [
      totalPositions,
      positionsToday,
      positionsLastHour,
      positionsLast15Min
    ] = await Promise.all([
      prisma.vesselPosition.count().catch(e => { console.error('vesselPosition.count error:', e); return 0 }),
      prisma.vesselPosition.count({
        where: {
          timestamp: {
            gte: today
          }
        }
      }).catch(e => { console.error('vesselPosition.count today error:', e); return 0 }),
      prisma.vesselPosition.count({
        where: {
          timestamp: {
            gte: lastHour
          }
        }
      }).catch(e => { console.error('vesselPosition.count last hour error:', e); return 0 }),
      prisma.vesselPosition.count({
        where: {
          timestamp: {
            gte: last15Min
          }
        }
      }).catch(e => { console.error('vesselPosition.count last 15min error:', e); return 0 })
    ])

    // Alert statistics
    const [totalAlerts, activeAlerts, criticalAlerts] = await Promise.all([
      prisma.vesselAlert.count().catch(e => { console.error('vesselAlert.count error:', e); return 0 }),
      prisma.vesselAlert.count({
        where: {
          resolvedAt: null
        }
      }).catch(e => { console.error('vesselAlert.count active error:', e); return 0 }),
      prisma.vesselAlert.count({
        where: {
          resolvedAt: null,
          severity: 'critical'
        }
      }).catch(e => { console.error('vesselAlert.count critical error:', e); return 0 })
    ])

    // User statistics
    const [totalUsers, adminUsers] = await Promise.all([
      prisma.user.count().catch(e => { console.error('user.count error:', e); return 0 }),
      prisma.user.count({
        where: {
          role: 'admin'
        }
      }).catch(e => { console.error('user.count admin error:', e); return 0 })
    ])

    // Get counts for major tables (with error handling)
    const [
      contactsCount,
      groupsCount,
      notificationsCount,
      vesselContactsCount
    ] = await Promise.all([
      prisma.contact.count().catch(() => 0),
      prisma.group.count().catch(() => 0),
      prisma.notification.count().catch(() => 0),
      prisma.vesselContact.count().catch(() => 0)
    ])

    // Get last updated times for key tables
    const [lastVesselUpdate, lastPositionUpdate] = await Promise.all([
      prisma.vessel.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      }).catch(e => { console.error('vessel.findFirst error:', e); return null }),
      prisma.vesselPosition.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true }
      }).catch(e => { console.error('vesselPosition.findFirst error:', e); return null })
    ])

    // Manually construct table stats
    const tables = [
      {
        table: 'vessels',
        count: totalVessels,
        size: 'N/A',
        lastUpdated: lastVesselUpdate?.updatedAt.toLocaleString() || null
      },
      {
        table: 'vessel_positions',
        count: totalPositions,
        size: 'N/A',
        lastUpdated: lastPositionUpdate?.timestamp.toLocaleString() || null
      },
      {
        table: 'vessel_alerts',
        count: totalAlerts,
        size: 'N/A',
        lastUpdated: null
      },
      {
        table: 'vessel_contacts',
        count: vesselContactsCount,
        size: 'N/A',
        lastUpdated: null
      },
      {
        table: 'contacts',
        count: contactsCount,
        size: 'N/A',
        lastUpdated: null
      },
      {
        table: 'groups',
        count: groupsCount,
        size: 'N/A',
        lastUpdated: null
      },
      {
        table: 'users',
        count: totalUsers,
        size: 'N/A',
        lastUpdated: null
      },
      {
        table: 'notifications',
        count: notificationsCount,
        size: 'N/A',
        lastUpdated: null
      }
    ]

    return NextResponse.json({
      success: true,
      stats: {
        tables,
        totalSize: 'N/A',
        vesselStats: {
          total: totalVessels,
          withPositions: vesselsWithPositions,
          recentlyActive: recentlyActiveVessels,
          newToday: newVesselsToday
        },
        positionStats: {
          total: totalPositions,
          today: positionsToday,
          lastHour: positionsLastHour,
          last15Min: positionsLast15Min
        },
        alertStats: {
          total: totalAlerts,
          active: activeAlerts,
          critical: criticalAlerts
        },
        userStats: {
          total: totalUsers,
          admins: adminUsers
        }
      }
    })
  } catch (error) {
    console.error('Error fetching database stats:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch database statistics',
        details: errorMessage 
      },
      { status: 500 }
    )
  }
}
