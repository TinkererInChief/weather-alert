import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

type RangeKey = '60m' | '24h' | '7d'
type Status = 'healthy' | 'warning' | 'critical'

type TimelinePoint = { time: number; worstStatus: Status; count: number }

type UptimeStats = { healthy: number; warning: number; critical: number; total: number; healthyPct: number; warningPct: number; criticalPct: number }

type Resp = {
  range: RangeKey
  from: number
  to: number
  bucketMs: number
  uptime: Record<string, UptimeStats>
  timeline: Record<string, TimelinePoint[]>
}

const parseRange = (value: string | null): { key: RangeKey; ms: number; bucketMs: number } => {
  switch (value) {
    case '24h': return { key: '24h', ms: 24 * 60 * 60 * 1000, bucketMs: 5 * 60 * 1000 }
    case '7d': return { key: '7d', ms: 7 * 24 * 60 * 60 * 1000, bucketMs: 60 * 60 * 1000 }
    case '60m':
    default: return { key: '60m', ms: 60 * 60 * 1000, bucketMs: 60 * 1000 }
  }
}

const serviceList = ['database','redis','sms','email','usgs','noaa','emsc','jma','ptwc','iris','whatsapp','voice'] as const
type ServiceKey = typeof serviceList[number]

const parseServices = (s: string | null): ServiceKey[] => {
  if (!s) return [...serviceList]
  const set = new Set(serviceList)
  return s.split(',').map(x => x.trim()).filter(Boolean).filter((x): x is ServiceKey => set.has(x as ServiceKey))
}

const worst = (arr: Status[]): Status => arr.includes('critical') ? 'critical' : arr.includes('warning') ? 'warning' : 'healthy'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const range = parseRange(url.searchParams.get('range'))
    const services = parseServices(url.searchParams.get('services'))

    const to = Date.now()
    const from = to - range.ms
    const startBucket = Math.floor(from / range.bucketMs) * range.bucketMs

    const rows = await (prisma as any).healthSnapshot.findMany({
      where: {
        createdAt: { gte: new Date(from), lte: new Date(to) },
        service: { in: services as any },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, service: true, status: true },
    })

    // Build accumulators
    const uptime: Record<string, { healthy: number; warning: number; critical: number; total: number }> = {}
    const buckets: Record<string, Record<number, { statuses: Status[]; count: number }>> = {}
    for (const s of services) {
      uptime[s] = { healthy: 0, warning: 0, critical: 0, total: 0 }
      buckets[s] = {}
    }

    for (const r of rows) {
      const s = r.service as ServiceKey
      const st = r.status as Status
      const t = Math.floor((r.createdAt.getTime() - startBucket) / range.bucketMs) * range.bucketMs + startBucket
      uptime[s][st] += 1
      uptime[s].total += 1
      const b = (buckets[s][t] ||= { statuses: [], count: 0 })
      b.statuses.push(st)
      b.count += 1
    }

    const outUptime: Record<string, UptimeStats> = {}
    const timeline: Record<string, TimelinePoint[]> = {}

    for (const s of services) {
      const u = uptime[s]
      const total = u.total || 1
      outUptime[s] = {
        healthy: u.healthy,
        warning: u.warning,
        critical: u.critical,
        total,
        healthyPct: Math.round((u.healthy / total) * 1000) / 10,
        warningPct: Math.round((u.warning / total) * 1000) / 10,
        criticalPct: Math.round((u.critical / total) * 1000) / 10,
      }

      const times = Object.keys(buckets[s]).map(n => Number(n)).sort((a, b) => a - b)
      timeline[s] = times.map(t => ({ time: t, worstStatus: worst(buckets[s][t].statuses), count: buckets[s][t].count }))
    }

    const resp: Resp = { range: range.key, from, to, bucketMs: range.bucketMs, uptime: outUptime, timeline }
    return Response.json(resp, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('uptime error', error)
    return Response.json({ error: 'uptime_failed' }, { status: 500 })
  }
}
