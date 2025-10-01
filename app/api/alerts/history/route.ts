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
    
    // Fetch alerts
    const [alerts, total] = await Promise.all([
      prisma.alertLog.findMany({
        where,
        orderBy: {
          timestamp: 'desc'
        },
        skip,
        take: limit,
      }),
      prisma.alertLog.count({ where })
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        alerts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
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
