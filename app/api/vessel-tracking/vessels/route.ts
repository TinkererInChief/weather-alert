import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/vessel-tracking/vessels
 * Get recent vessel positions
 * 
 * Query params:
 * - limit: number of vessels to return (default: 100)
 * - lat: center latitude (optional, for proximity filter)
 * - lon: center longitude (optional, for proximity filter)
 * - radius: radius in km (optional, requires lat/lon)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const radiusKm = searchParams.get('radius')
    
    // Build query
    let where: any = {
      positions: {
        some: {
          timestamp: {
            gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
          }
        }
      }
    }
    
    // If lat/lon/radius provided, filter by proximity
    if (lat && lon && radiusKm) {
      const latitude = parseFloat(lat)
      const longitude = parseFloat(lon)
      const radius = parseFloat(radiusKm)
      
      // Calculate bounding box
      const latDegPerKm = 1 / 111
      const lonDegPerKm = 1 / (111 * Math.cos(latitude * Math.PI / 180))
      
      where.positions.some.latitude = {
        gte: latitude - (radius * latDegPerKm),
        lte: latitude + (radius * latDegPerKm)
      }
      where.positions.some.longitude = {
        gte: longitude - (radius * lonDegPerKm),
        lte: longitude + (radius * lonDegPerKm)
      }
    }
    
    // Fetch vessels with their most recent position
    const vessels = await prisma.vessel.findMany({
      where,
      take: limit,
      include: {
        positions: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        _count: {
          select: {
            alerts: {
              where: {
                status: 'active'
              }
            }
          }
        }
      },
      orderBy: {
        lastSeen: 'desc'
      }
    })
    
    // Format response
    const formattedVessels = vessels.map((vessel: any) => {
      const latestPosition = vessel.positions?.[0]
      
      return {
        id: vessel.id,
        mmsi: vessel.mmsi,
        name: vessel.name || `Vessel ${vessel.mmsi}`,
        vesselType: vessel.vesselType || 'unknown',
        latitude: latestPosition?.latitude || null,
        longitude: latestPosition?.longitude || null,
        speed: latestPosition?.speed || null,
        course: latestPosition?.course || null,
        heading: latestPosition?.heading || null,
        destination: vessel.destination || null,
        lastSeen: vessel.lastSeen,
        dataSource: latestPosition?.dataSource || null,
        activeAlertCount: vessel._count?.alerts || 0
      }
    })
    
    return NextResponse.json({
      success: true,
      count: formattedVessels.length,
      vessels: formattedVessels
    })
  } catch (error) {
    console.error('Error fetching vessels:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
