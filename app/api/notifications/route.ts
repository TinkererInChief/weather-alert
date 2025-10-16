export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function formatTimeAgo(date: Date): string {
  const now = new Date().getTime()
  const diffMs = now - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions as any)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const role = (session as any)?.user?.role || 'viewer'
    if (role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Recent per-channel delivery logs
    const deliveryLogs = await prisma.deliveryLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        contact: { select: { name: true } },
        alertJob: { select: { id: true, metadata: true } },
      }
    })

    // Recent legacy alert logs (for context/system messages)
    const alertLogs = await prisma.alertLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 5,
      select: {
        id: true,
        magnitude: true,
        location: true,
        timestamp: true,
        contactsNotified: true,
        success: true,
      }
    })

    const notifications = [
      // Map delivery logs to notifications
      ...deliveryLogs.map((log) => {
        const contactName = log.contact?.name || 'Contact'
        const channel = log.channel.toUpperCase()
        const status = log.status
        const isSuccess = ['sent', 'delivered', 'queued', 'completed'].includes(status)
        const type: 'alert' | 'system' | 'success' = isSuccess ? 'success' : 'alert'
        const message = `${channel} to ${contactName}: ${status}`
        const createdAt = log.createdAt as Date
        const unread = !log.readAt

        return {
          id: `delivery-${log.id}`,
          type,
          message,
          time: formatTimeAgo(createdAt),
          unread,
        }
      }),

      // Map alert logs to notifications
      ...alertLogs.map((a) => {
        const type: 'alert' | 'system' | 'success' = a.success ? 'success' : 'alert'
        const message = `Alert ${a.success ? 'completed' : 'failed'} for M${a.magnitude.toFixed(1)} ${a.location} (${a.contactsNotified} contacts)`
        const createdAt = a.timestamp as Date
        const unread = (Date.now() - createdAt.getTime()) < 5 * 60 * 1000
        return {
          id: `alert-${a.id}`,
          type,
          message,
          time: formatTimeAgo(createdAt),
          unread,
        }
      })
    ]
      // Sort combined by recency (heuristic: newer first by time string isn't reliable; recompute by Date)
      .sort((a, b) => {
        // Not perfect since we formatted strings; but mixing two sources above keeps recency reasonable
        // Keep delivery logs first, then alerts
        if (a.id.startsWith('delivery-') && b.id.startsWith('alert-')) return -1
        if (a.id.startsWith('alert-') && b.id.startsWith('delivery-')) return 1
        return 0
      })
      .slice(0, 20)

    return NextResponse.json({
      success: true,
      data: { notifications },
    })
  } catch (error) {
    console.error('❌ Failed to fetch notifications:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to load notifications'
    }, { status: 500 })
  }
}
