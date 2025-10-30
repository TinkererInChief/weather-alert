import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type TimeFilter = '24h' | '7d' | '30d'

function getTimeFilterDate(filter: TimeFilter): Date {
  const now = new Date()
  switch (filter) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeFilter = (searchParams.get('timeFilter') as TimeFilter) || '30d'
    const minMagnitude = parseFloat(searchParams.get('minMagnitude') || '0')
    const showAllEvents = searchParams.get('showAllEvents') === 'true'
    
    const startDate = getTimeFilterDate(timeFilter)
    
    // Determine limit based on time period
    let limit = 50
    if (timeFilter === '7d') limit = 100
    if (timeFilter === '30d' || showAllEvents) limit = 200

    // Execute all queries in parallel for maximum speed
    const [
      basicStats,
      recentAlerts,
      monitoringStatus,
      tsunamiAlerts,
      tsunamiMonitoring,
      alertCount
    ] = await Promise.all([
      // Basic stats
      prisma.alertLog.aggregate({
        _count: { id: true },
        _avg: { magnitude: true },
        where: {
          timestamp: { gte: startDate }
        }
      }),
      
      // Recent alerts (limited by magnitude if specified)
      prisma.alertLog.findMany({
        where: {
          timestamp: { gte: startDate },
          magnitude: showAllEvents ? undefined : { gte: minMagnitude }
        },
        select: {
          id: true,
          earthquakeId: true,
          magnitude: true,
          location: true,
          latitude: true,
          longitude: true,
          depth: true,
          timestamp: true,
          contactsNotified: true,
          success: true,
          errorMessage: true,
          severity: true,
          primarySource: true,
          dataSources: true
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      }),
      
      // Monitoring status
      prisma.monitoringStatus.findFirst({
        orderBy: { createdAt: 'desc' }
      }),
      
      // Tsunami alerts (last 7 days)
      prisma.tsunamiAlert.findMany({
        where: {
          issueTime: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        select: {
          id: true,
          eventId: true,
          region: true,
          magnitude: true,
          category: true,
          threat: true,
          issueTime: true,
          expiryTime: true,
          url: true,
          description: true,
          urgency: true,
          severity: true,
          certainty: true,
          active: true
        },
        orderBy: { issueTime: 'desc' },
        take: 50
      }),
      
      // Tsunami monitoring status
      prisma.tsunamiMonitoringStatus.findFirst({
        orderBy: { createdAt: 'desc' }
      }),
      
      // Total alert count (for denominator)
      prisma.alertLog.count({
        where: {
          timestamp: { gte: startDate },
          latitude: { not: null },
          longitude: { not: null }
        }
      })
    ])

    // Calculate additional stats
    const activeContacts = await prisma.contact.count({ where: { active: true } })
    const totalAlerts = basicStats._count.id || 0
    const avgMagnitude = basicStats._avg.magnitude || 0
    const successfulAlerts = recentAlerts.filter(a => a.success).length
    const successRate = totalAlerts > 0 ? ((successfulAlerts / totalAlerts) * 100).toFixed(1) : '0'

    // Prepare response
    const response = {
      success: true,
      data: {
        timeFilter,
        stats: {
          totalAlerts,
          avgMagnitude: Number(avgMagnitude.toFixed(2)),
          activeContacts,
          successRate,
          alertCount // For map denominator
        },
        alerts: recentAlerts,
        monitoring: {
          isMonitoring: monitoringStatus?.isActive || false,
          smsAvailable: monitoringStatus?.smsEnabled || false,
          lastCheck: monitoringStatus?.lastCheck || null
        },
        tsunami: {
          alerts: tsunamiAlerts,
          monitoring: {
            isActive: tsunamiMonitoring?.isActive || false,
            lastCheck: tsunamiMonitoring?.lastCheck || null
          }
        }
      },
      timestamp: new Date().toISOString()
    }

    // Add cache headers for performance
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'CDN-Cache-Control': 'public, s-maxage=30',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=30'
      }
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
