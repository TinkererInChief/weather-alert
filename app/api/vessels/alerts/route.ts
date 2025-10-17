import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const riskLevel = searchParams.get('riskLevel')
    const activeOnly = searchParams.get('active') !== 'false'
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const where: any = {}
    
    if (riskLevel) {
      where.riskLevel = riskLevel
    }
    
    if (activeOnly) {
      where.resolvedAt = null
    }
    
    const alerts = await prisma.vesselAlert.findMany({
      where,
      include: {
        vessel: {
          include: {
            positions: {
              orderBy: { timestamp: 'desc' },
              take: 1
            },
            contacts: {
              include: {
                contact: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
    
    const formattedAlerts = alerts.map(alert => ({
      ...alert,
      vesselPosition: alert.vessel.positions[0] || null,
      vessel: {
        ...alert.vessel,
        positions: undefined
      }
    }))
    
    const stats = {
      total: alerts.length,
      bySeverity: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        moderate: alerts.filter(a => a.severity === 'moderate').length,
        low: alerts.filter(a => a.severity === 'low').length
      },
      byRiskLevel: {
        critical: alerts.filter(a => a.riskLevel === 'critical').length,
        high: alerts.filter(a => a.riskLevel === 'high').length,
        moderate: alerts.filter(a => a.riskLevel === 'moderate').length,
        low: alerts.filter(a => a.riskLevel === 'low').length
      },
      unresolved: alerts.filter(a => !a.resolvedAt).length,
      unacknowledged: alerts.filter(a => !a.acknowledged).length
    }
    
    return NextResponse.json({
      success: true,
      alerts: formattedAlerts,
      stats
    })
  } catch (error) {
    console.error('Error fetching vessel alerts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vessel alerts' },
      { status: 500 }
    )
  }
}
