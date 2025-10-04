import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get time range from query params
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '24h'

    // Calculate date threshold
    const now = new Date()
    let startDate = new Date()
    
    switch (range) {
      case '24h':
        startDate.setHours(now.getHours() - 24)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      default:
        startDate.setHours(now.getHours() - 24)
    }

    // Fetch delivery logs within time range
    const deliveryLogs = await prisma.deliveryLog.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      select: {
        id: true,
        channel: true,
        status: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true
      }
    })

    // Calculate overall stats
    const stats = {
      total: deliveryLogs.length,
      sent: deliveryLogs.filter(log => log.sentAt !== null).length,
      delivered: deliveryLogs.filter(log => log.deliveredAt !== null).length,
      read: deliveryLogs.filter(log => log.readAt !== null).length,
      failed: deliveryLogs.filter(log => log.status === 'failed' || log.status === 'bounced').length,
      queued: deliveryLogs.filter(log => log.status === 'queued').length,
      byChannel: {
        sms: calculateChannelStats(deliveryLogs, 'sms'),
        email: calculateChannelStats(deliveryLogs, 'email'),
        whatsapp: calculateChannelStats(deliveryLogs, 'whatsapp'),
        voice: calculateChannelStats(deliveryLogs, 'voice')
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      timeRange: range,
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    })

  } catch (error) {
    console.error('Error fetching delivery stats:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch delivery statistics' },
      { status: 500 }
    )
  }
}

function calculateChannelStats(logs: any[], channel: string) {
  const channelLogs = logs.filter(log => log.channel === channel)
  
  return {
    sent: channelLogs.filter(log => log.sentAt !== null).length,
    delivered: channelLogs.filter(log => log.deliveredAt !== null).length,
    read: channelLogs.filter(log => log.readAt !== null).length,
    failed: channelLogs.filter(log => log.status === 'failed' || log.status === 'bounced').length
  }
}
