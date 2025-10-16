export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Permission, withPermission } from '@/lib/rbac'

/**
 * GET /api/notifications/delivery-logs
 * Fetch delivery logs with filtering and pagination
 */
export const GET = withPermission(Permission.VIEW_NOTIFICATIONS, async (req, session) => {
  try {
    const { searchParams } = new URL(req.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit
    
    // Filters
    const channel = searchParams.get('channel')
    const status = searchParams.get('status')
    const contactId = searchParams.get('contactId')
    const alertJobId = searchParams.get('alertJobId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Build where clause
    const where: any = {}
    
    if (channel) {
      where.channel = channel
    }
    
    if (status) {
      where.status = status
    }
    
    if (contactId) {
      where.contactId = contactId
    }
    
    if (alertJobId) {
      where.alertJobId = alertJobId
    }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }
    
    // Fetch logs with relationships
    const [logs, total] = await Promise.all([
      prisma.deliveryLog.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          },
          alertJob: {
            select: {
              id: true,
              type: true,
              eventType: true,
              severity: true,
              createdAt: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
      }),
      prisma.deliveryLog.count({ where })
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Error fetching delivery logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch delivery logs' },
      { status: 500 }
    )
  }
})
