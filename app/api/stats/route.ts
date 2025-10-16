import { NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { prisma } from '@/lib/prisma'
import { tsunamiMonitor } from '@/lib/tsunami-monitor'

export async function GET() {
  try {
    const stats = await db.getStats()
    const recentLogs = await db.getRecentAlertLogs(5)
    
    // Get tsunami statistics
    const tsunamiStats = await getTsunamiStats()
    const tsunamiMonitorStatus = tsunamiMonitor.getStatus()
    
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          ...stats,
          tsunami: tsunamiStats
        },
        recentAlerts: recentLogs,
        monitoring: {
          earthquake: true, // Assumed active
          tsunami: tsunamiMonitorStatus.isMonitoring
        }
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats'
      },
      { status: 500 }
    )
  }
}

async function getTsunamiStats() {
  try {
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Count tsunami alerts by time period
    const [
      totalAlerts,
      alertsLast24h,
      alertsLast7d,
      recentAlerts,
      alertsByLevel
    ] = await Promise.all([
      // Total tsunami alerts
      prisma.tsunamiAlert.count(),
      
      // Alerts in last 24 hours
      prisma.tsunamiAlert.count({
        where: {
          createdAt: { gte: last24Hours }
        }
      }),
      
      // Alerts in last 7 days
      prisma.tsunamiAlert.count({
        where: {
          createdAt: { gte: last7Days }
        }
      }),
      
      // Recent tsunami alerts
      prisma.tsunamiAlert.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          alertType: true,
          severityLevel: true,
          createdAt: true,
          rawData: true
        }
      }),
      
      // Alerts by severity level
      prisma.tsunamiAlert.groupBy({
        by: ['alertType'],
        _count: {
          alertType: true
        }
      })
    ])

    return {
      totalAlerts,
      alertsLast24h,
      alertsLast7d,
      recentAlerts: recentAlerts.map(alert => {
        const rawData = (alert.rawData as any) || {}
        const description = rawData.description || ''
        
        // Parse earthquake details from description
        const magMatch = description.match(/Magnitude:\s*([\d.]+)/)
        const latLonMatch = description.match(/Lat\/Lon:\s*([\d.-]+)\s*\/\s*([\d.-]+)/)
        const regionMatch = description.match(/Affected Region:\s*([^N]+?)(?:\s*Note:|$)/)
        
        const magnitude = magMatch ? parseFloat(magMatch[1]) : undefined
        const latitude = latLonMatch ? parseFloat(latLonMatch[1]) : undefined
        const longitude = latLonMatch ? parseFloat(latLonMatch[2]) : undefined
        const location = regionMatch ? regionMatch[1].trim() : (rawData.location || 'Unknown')
        
        // Extract ocean from location
        const oceans = ['Pacific', 'Atlantic', 'Indian', 'Arctic', 'Southern']
        let ocean = 'Unknown'
        for (const o of oceans) {
          if (location.includes(o)) {
            ocean = `${o} Ocean`
            break
          }
        }
        
        // Determine threat level
        const noTsunami = description.includes('NO tsunami') || 
                         description.includes('no tsunami danger') ||
                         description.includes('not expected to generate a tsunami')
        const threatLevel = noTsunami ? 'info' : (alert.severityLevel >= 3 ? 'warning' : alert.severityLevel >= 2 ? 'watch' : 'advisory')
        
        return {
          id: alert.id,
          type: alert.alertType,
          severity: alert.severityLevel,
          title: rawData.title || `M${magnitude || '?'} Earthquake ${noTsunami ? '(No Tsunami)' : ''}`,
          location,
          timestamp: alert.createdAt,
          latitude,
          longitude,
          magnitude,
          threatLevel,
          ocean
        }
      }),
      alertsByLevel: alertsByLevel.reduce((acc, item) => {
        acc[item.alertType] = item._count.alertType
        return acc
      }, {} as Record<string, number>)
    }

  } catch (error) {
    console.error('❌ Error fetching tsunami stats:', error)
    return {
      totalAlerts: 0,
      alertsLast24h: 0,
      alertsLast7d: 0,
      recentAlerts: [],
      alertsByLevel: {}
    }
  }
}
