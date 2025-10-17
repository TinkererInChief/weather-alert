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
    const activeOnly = searchParams.get('active') === 'true'
    const withPosition = searchParams.get('withPosition') === 'true'
    
    const where = activeOnly ? { active: true } : {}
    
    const vessels = await prisma.vessel.findMany({
      where,
      include: {
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
        },
        ...(withPosition ? {
          positions: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        } : {}),
        _count: {
          select: {
            alerts: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
              }
            }
          }
        }
      },
      orderBy: { lastSeen: 'desc' }
    })
    
    const vesselsWithPosition = vessels.map(vessel => {
      const latestPosition = (withPosition && 'positions' in vessel) ? vessel.positions?.[0] : null
      return {
        ...vessel,
        latitude: latestPosition?.latitude ?? null,
        longitude: latestPosition?.longitude ?? null,
        speed: latestPosition?.speed ?? null,
        heading: latestPosition?.heading ?? null,
        course: latestPosition?.course ?? null,
        navStatus: latestPosition?.navStatus ?? null,
        destination: latestPosition?.destination ?? null,
        positionTimestamp: latestPosition?.timestamp ?? null,
        activeAlertCount: vessel._count.alerts,
        positions: undefined,
        _count: undefined
      }
    })
    
    return NextResponse.json({
      success: true,
      vessels: vesselsWithPosition,
      count: vesselsWithPosition.length
    })
  } catch (error) {
    console.error('Error fetching vessels:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vessels' },
      { status: 500 }
    )
  }
}
