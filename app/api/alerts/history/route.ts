export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Permission, withPermission } from '@/lib/rbac'

/**
 * GET /api/alerts/history
 * Fetch alert history with filtering and pagination
 */
export const GET = withPermission(Permission.VIEW_ALERTS, async (req, session) => {
  try {
    const { searchParams } = new URL(req.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit
    
    // Filters
    const minMagnitude = searchParams.get('minMagnitude')
    const maxMagnitude = searchParams.get('maxMagnitude')
    const success = searchParams.get('success')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const coordsOnly = ((): boolean => {
      const raw = searchParams.get('coordsOnly')
      return raw === 'true' || raw === '1'
    })()
    const distinctByEarthquake = ((): boolean => {
      const raw = searchParams.get('distinctByEarthquake')
      return raw === 'true' || raw === '1'
    })()
    
    // Build where clause
    const where: any = {}
    
    if (minMagnitude) {
      where.magnitude = { ...where.magnitude, gte: parseFloat(minMagnitude) }
    }
    
    if (maxMagnitude) {
      where.magnitude = { ...where.magnitude, lte: parseFloat(maxMagnitude) }
    }
    
    if (success !== null && success !== undefined && success !== '') {
      where.success = success === 'true'
    }
    
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) {
        where.timestamp.gte = new Date(startDate)
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate)
      }
    }

    if (coordsOnly) {
      where.latitude = { not: null }
      where.longitude = { not: null }
    }
    
    // Fetch alerts with magnitude-first ordering to prioritize critical events
    // Use select to reduce payload size (lean DTO pattern)
    const [alerts, total] = await Promise.all([
      prisma.alertLog.findMany({
        where,
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
          primarySource: true,
          dataSources: true,
          createdAt: true
          // Excluded: updatedAt, rawData, severity (not in schema), and other heavy fields
        },
        orderBy: [
          { magnitude: 'desc' },  // Critical events first
          { timestamp: 'desc' }   // Then by recency within magnitude
        ],
        skip,
        take: limit,
      }),
      prisma.alertLog.count({ where })
    ])
    
    // Meta counts (distinct earthquakeId and coords-only distinct)
    // Keep backward compatibility: existing pagination.total remains the row count above
    let totalDistinct = 0
    let totalDistinctWithCoords = 0
    try {
      const distinctGroups = await prisma.alertLog.groupBy({
        by: ['earthquakeId'],
        where: {
          // Use the same filter but without coords constraint
          ...(minMagnitude ? { magnitude: { gte: parseFloat(minMagnitude) } } : {}),
          ...(maxMagnitude ? { magnitude: { lte: parseFloat(maxMagnitude) } } : {}),
          ...(success !== null && success !== undefined && success !== '' ? { success: success === 'true' } : {}),
          ...(startDate || endDate
            ? {
                timestamp: {
                  ...(startDate ? { gte: new Date(startDate) } : {}),
                  ...(endDate ? { lte: new Date(endDate) } : {}),
                },
              }
            : {}),
        },
        _count: { earthquakeId: true },
      })
      totalDistinct = distinctGroups.length

      const distinctWithCoordsGroups = await prisma.alertLog.groupBy({
        by: ['earthquakeId'],
        where: {
          ...(minMagnitude ? { magnitude: { gte: parseFloat(minMagnitude) } } : {}),
          ...(maxMagnitude ? { magnitude: { lte: parseFloat(maxMagnitude) } } : {}),
          ...(success !== null && success !== undefined && success !== '' ? { success: success === 'true' } : {}),
          ...(startDate || endDate
            ? {
                timestamp: {
                  ...(startDate ? { gte: new Date(startDate) } : {}),
                  ...(endDate ? { lte: new Date(endDate) } : {}),
                },
              }
            : {}),
          latitude: { not: null },
          longitude: { not: null },
        },
        _count: { earthquakeId: true },
      })
      totalDistinctWithCoords = distinctWithCoordsGroups.length
    } catch (e) {
      // Fall back silently; meta will remain 0 if groupBy fails
      console.warn('alerts/history: distinct meta computation failed', e)
    }
    
    return NextResponse.json({
      success: true,
      data: {
        alerts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        meta: {
          total, // raw rows matching filter
          totalDistinct,
          totalDistinctWithCoords,
          // If client asks for distinctByEarthquake and coordsOnly, they can use totalDistinctWithCoords as the denominator
          // This keeps the response backward compatible while enabling robust counts
          requestedDistinctByEarthquake: distinctByEarthquake,
          requestedCoordsOnly: coordsOnly,
        }
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'CDN-Cache-Control': 'public, s-maxage=60'
      }
    })
  } catch (error) {
    console.error('Error fetching alert history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alert history' },
      { status: 500 }
    )
  }
})
