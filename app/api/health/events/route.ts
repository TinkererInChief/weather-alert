import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

type EventResponse = {
  id: string
  service?: string
  eventType: string
  severity: string
  message: string
  oldStatus?: string
  newStatus?: string
  metadata: any
  createdAt: string
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 100) : 50
    
    const events = await (prisma as any).healthEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        service: true,
        eventType: true,
        severity: true,
        message: true,
        oldStatus: true,
        newStatus: true,
        metadata: true,
        createdAt: true,
      },
    })
    
    const mapped: EventResponse[] = events.map((e: any) => ({
      id: e.id,
      service: e.service ?? undefined,
      eventType: e.eventType,
      severity: e.severity,
      message: e.message,
      oldStatus: e.oldStatus ?? undefined,
      newStatus: e.newStatus ?? undefined,
      metadata: e.metadata,
      createdAt: e.createdAt.toISOString(),
    }))
    
    return Response.json({ events: mapped }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('health events error', error)
    return Response.json({ error: 'events_failed' }, { status: 500 })
  }
}
