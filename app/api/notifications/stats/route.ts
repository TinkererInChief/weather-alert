import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Permission, withPermission } from '@/lib/rbac'

/**
 * GET /api/notifications/stats
 * Get notification delivery statistics
 */
export const GET = withPermission(Permission.VIEW_NOTIFICATIONS, async (req, session) => {
  try {
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Get total counts by status
    const statusCounts = await prisma.deliveryLog.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        status: true
      }
    })
    
    // Get counts by channel
    const channelCounts = await prisma.deliveryLog.groupBy({
      by: ['channel'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        channel: true
      }
    })
    
    // Get counts by provider
    const providerCounts = await prisma.deliveryLog.groupBy({
      by: ['provider'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        provider: true
      }
    })
    
    // Get daily delivery counts
    const dailyDeliveries = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE("createdAt") as date, COUNT(*)::int as count
      FROM "delivery_logs"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `
    
    // Get success rate by channel
    const channelSuccessRates = await prisma.$queryRaw<Array<{
      channel: string
      total: bigint
      successful: bigint
    }>>`
      SELECT 
        channel,
        COUNT(*)::int as total,
        COUNT(CASE WHEN status IN ('delivered', 'sent') THEN 1 END)::int as successful
      FROM "delivery_logs"
      WHERE "createdAt" >= ${startDate}
      GROUP BY channel
    `
    
    // Get top contacts by delivery count
    const topContacts = await prisma.deliveryLog.groupBy({
      by: ['contactId'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        contactId: true
      },
      orderBy: {
        _count: {
          contactId: 'desc'
        }
      },
      take: 10
    })
    
    // Fetch contact details
    const contactIds = topContacts.map(c => c.contactId)
    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: contactIds }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    })
    
    const contactMap = new Map(contacts.map(c => [c.id, c]))
    const topContactsWithDetails = topContacts.map(tc => ({
      ...tc,
      contact: contactMap.get(tc.contactId)
    }))
    
    // Calculate overall metrics
    const totalDeliveries = statusCounts.reduce((sum, s) => sum + s._count.status, 0)
    const successfulDeliveries = statusCounts
      .filter(s => s.status === 'delivered' || s.status === 'sent')
      .reduce((sum, s) => sum + s._count.status, 0)
    const failedDeliveries = statusCounts
      .filter(s => s.status === 'failed' || s.status === 'bounced')
      .reduce((sum, s) => sum + s._count.status, 0)
    
    const successRate = totalDeliveries > 0 
      ? ((successfulDeliveries / totalDeliveries) * 100).toFixed(2)
      : '0.00'
    
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalDeliveries,
          successfulDeliveries,
          failedDeliveries,
          successRate: parseFloat(successRate),
          period: {
            days,
            startDate,
            endDate: new Date()
          }
        },
        statusCounts,
        channelCounts,
        providerCounts,
        dailyDeliveries: dailyDeliveries.map(d => ({
          date: d.date,
          count: Number(d.count)
        })),
        channelSuccessRates: channelSuccessRates.map(c => ({
          channel: c.channel,
          total: Number(c.total),
          successful: Number(c.successful),
          successRate: Number(c.total) > 0 
            ? ((Number(c.successful) / Number(c.total)) * 100).toFixed(2)
            : '0.00'
        })),
        topContacts: topContactsWithDetails
      }
    })
  } catch (error) {
    console.error('Error fetching notification stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notification statistics' },
      { status: 500 }
    )
  }
})
