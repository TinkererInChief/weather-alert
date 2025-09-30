import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

type MetricsResponse = {
  uptimePercent: number
  mttrMinutes: number
  incidentsResolved: number
  avgResponseTimeMs: number
  period: string
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const period = url.searchParams.get('period') || '30d'
    
    const now = Date.now()
    const periodMs = period === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000
    const fromTs = now - periodMs
    
    // Calculate uptime percentage
    const snapshots = await (prisma as any).healthSnapshot.findMany({
      where: {
        createdAt: { gte: new Date(fromTs) },
        service: 'database', // Use database as overall indicator
      },
      orderBy: { createdAt: 'asc' },
      select: { status: true },
    })
    
    const healthyCount = snapshots.filter((s: any) => s.status === 'healthy').length
    const uptimePercent = snapshots.length > 0 ? (healthyCount / snapshots.length) * 100 : 100
    
    // Calculate MTTR (Mean Time To Recovery)
    // Exclude events that occurred during deploy windows
    const deployEvents = await (prisma as any).healthEvent.findMany({
      where: {
        createdAt: { gte: new Date(fromTs) },
        eventType: 'deploy',
      },
      select: { createdAt: true },
    })
    
    // Create deploy windows (±2 minutes around each deploy)
    const deployWindows = deployEvents.map((d: any) => ({
      start: new Date(d.createdAt.getTime() - 2 * 60000),
      end: new Date(d.createdAt.getTime() + 2 * 60000),
    }))
    
    const isDuringDeploy = (timestamp: Date) => {
      return deployWindows.some((w: { start: Date; end: Date }) => timestamp >= w.start && timestamp <= w.end)
    }
    
    const events = await (prisma as any).healthEvent.findMany({
      where: {
        createdAt: { gte: new Date(fromTs) },
        eventType: { in: ['error', 'status_change', 'recovery'] },
      },
      orderBy: { createdAt: 'asc' },
      select: { eventType: true, createdAt: true, service: true, severity: true },
    })
    
    // Group events into incidents and calculate recovery times
    const incidents: Array<{ startTime: Date; endTime?: Date; duration?: number; isDeploy: boolean }> = []
    let currentIncident: any = null
    
    for (const event of events) {
      // Start of incident (error or status change to critical/warning)
      if ((event.eventType === 'error' || (event.eventType === 'status_change' && event.severity !== 'healthy')) && !currentIncident) {
        currentIncident = { 
          startTime: event.createdAt, 
          service: event.service,
          isDeploy: isDuringDeploy(event.createdAt)
        }
      } 
      // End of incident (recovery or status change to healthy)
      else if ((event.eventType === 'recovery' || (event.eventType === 'status_change' && event.severity === 'healthy')) && currentIncident && event.service === currentIncident.service) {
        currentIncident.endTime = event.createdAt
        currentIncident.duration = (currentIncident.endTime.getTime() - currentIncident.startTime.getTime()) / 60000
        incidents.push(currentIncident)
        currentIncident = null
      }
    }
    
    // Only count non-deploy incidents for MTTR
    const resolvedIncidents = incidents.filter(i => i.endTime && !i.isDeploy)
    const mttrMinutes = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => sum + (i.duration || 0), 0) / resolvedIncidents.length
      : 0
    
    // Count incidents resolved (excluding deploy-related incidents)
    const incidentsResolved = resolvedIncidents.length
    
    // Calculate average response time
    const recentSnapshots = await (prisma as any).healthSnapshot.findMany({
      where: {
        createdAt: { gte: new Date(fromTs) },
        latencyMs: { not: null },
      },
      select: { latencyMs: true },
    })
    
    const avgResponseTimeMs = recentSnapshots.length > 0
      ? recentSnapshots.reduce((sum: number, s: any) => sum + (s.latencyMs || 0), 0) / recentSnapshots.length
      : 0
    
    const response: MetricsResponse = {
      uptimePercent: Math.round(uptimePercent * 100) / 100,
      mttrMinutes: Math.round(mttrMinutes * 10) / 10,
      incidentsResolved,
      avgResponseTimeMs: Math.round(avgResponseTimeMs),
      period,
    }
    
    return Response.json(response, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('health metrics error', error)
    return Response.json({ error: 'metrics_failed' }, { status: 500 })
  }
}
