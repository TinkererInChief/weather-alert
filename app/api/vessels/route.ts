import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const allowPublic = (process.env.VESSELS_PUBLIC_READ ?? 'true') !== 'false'
    if (!session && !allowPublic) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    const withPosition = searchParams.get('withPosition') === 'true'
    const fleetOnly = searchParams.get('fleetOnly') === 'true'
    const limitParam = parseInt(searchParams.get('limit') || '1000')
    const limit = Math.min(isNaN(limitParam) ? 1000 : limitParam, 10000)
    const skipParam = parseInt(searchParams.get('skip') || '0')
    const skip = isNaN(skipParam) ? 0 : Math.max(0, skipParam)
    
    // Bounding box filtering for map viewport
    const north = searchParams.get('north')
    const south = searchParams.get('south')
    const east = searchParams.get('east')
    const west = searchParams.get('west')
    
    // Additional filters
    const vesselType = searchParams.get('vesselType')
    const owner = searchParams.get('owner')
    const operator = searchParams.get('operator')
    const flag = searchParams.get('flag')
    const search = searchParams.get('search')
    
    const where: any = activeOnly ? { active: true } : {}
    
    // Search filter (MMSI, name, or vessel type)
    if (search && search.trim().length > 0) {
      where.OR = [
        { mmsi: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { vesselType: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    // Fleet filtering - only show vessels with assigned contacts
    if (fleetOnly) {
      where.contacts = {
        some: {}
      }
    }
    
    // Vessel type filter
    if (vesselType && vesselType !== 'all') {
      where.vesselType = vesselType
    }
    
    // Owner filter
    if (owner && owner !== 'all') {
      where.owner = {
        contains: owner,
        mode: 'insensitive'
      }
    }
    
    // Operator filter
    if (operator && operator !== 'all') {
      where.operator = {
        contains: operator,
        mode: 'insensitive'
      }
    }
    
    // Flag filter
    if (flag && flag !== 'all') {
      where.flag = flag
    }
    
    // Only show vessels seen in last hour for better performance
    if (activeOnly) {
      where.lastSeen = {
        gte: new Date(Date.now() - 60 * 60 * 1000)
      }
    } else {
      // For non-active queries, still limit to recent vessels to prevent overload
      where.lastSeen = {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    }
    
    const vessels = await prisma.vessel.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        mmsi: true,
        name: true,
        vesselType: true,
        owner: true,
        operator: true,
        flag: true,
        lastSeen: true,
        positions: withPosition ? {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: {
            latitude: true,
            longitude: true,
            speed: true,
            heading: true,
            course: true,
            destination: true,
            navStatus: true,
            timestamp: true,
          }
        } : false,
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
    
    // Filter by bounding box if provided
    let filteredVessels = vessels
    if (north && south && east && west && withPosition) {
      const n = parseFloat(north)
      const s = parseFloat(south)
      const e = parseFloat(east)
      const w = parseFloat(west)
      
      if ([n, s, e, w].some(v => Number.isNaN(v) || !Number.isFinite(v))) {
        // Skip filtering if bounds invalid
      } else {
        const wrapsAntimeridian = w > e
        filteredVessels = vessels.filter(vessel => {
          const pos = 'positions' in vessel && vessel.positions?.[0]
          if (!pos) return false
          const latOk = pos.latitude >= s && pos.latitude <= n
          const lonOk = wrapsAntimeridian
            ? (pos.longitude >= w || pos.longitude <= e)
            : (pos.longitude >= w && pos.longitude <= e)
          return latOk && lonOk
        })
      }
    }
    
    const vesselsWithPosition = filteredVessels.map(vessel => {
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
