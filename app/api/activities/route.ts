import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    // Get recent health events and format them as activities
    const healthEvents = await (prisma as any).healthEvent.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        eventType: true,
        severity: true,
        message: true,
        service: true,
        createdAt: true,
        metadata: true,
      },
    })

    const activities = healthEvents.map((event: any) => ({
      id: event.id,
      type: mapEventTypeToActivityType(event.eventType),
      title: event.message || `${event.service} ${event.eventType}`,
      description: event.service ? `Service: ${event.service}` : undefined,
      timestamp: event.createdAt,
      severity: mapSeverityToActivitySeverity(event.severity),
      metadata: event.metadata || {},
    }))

    return Response.json({ activities }, { status: 200 })
  } catch (error) {
    console.error('Activities fetch error:', error)
    return Response.json({ activities: [] }, { status: 200 })
  }
}

function mapEventTypeToActivityType(eventType: string) {
  switch (eventType) {
    case 'deploy':
      return 'system_event'
    case 'error':
      return 'service_health'
    case 'recovery':
      return 'system_event'
    case 'status_change':
      return 'service_health'
    default:
      return 'system_event'
  }
}

function mapSeverityToActivitySeverity(severity: string) {
  switch (severity) {
    case 'critical':
      return 'error'
    case 'warning':
      return 'warning'
    case 'healthy':
      return 'success'
    default:
      return 'info'
  }
    
