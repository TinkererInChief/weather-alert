import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
// Use local unions to avoid build-time enum issues
type HealthStatus = 'healthy' | 'warning' | 'critical'
type HealthService = 'database' | 'redis' | 'sms' | 'email' | 'usgs' | 'noaa' | 'emsc' | 'jma' | 'ptwc' | 'iris' | 'whatsapp' | 'voice'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

type RangeKey = '60m' | '24h' | '7d'

type SeriesPoint = {
  time: number
  latencyAvg?: number
  latencyP50?: number
  latencyP95?: number
  latencyP99?: number
  count: number
  worstStatus: HealthStatus
}

type Series = Record<string, SeriesPoint[]>

type HistoryResponse = {
  range: RangeKey
  from: number
  to: number
  bucketMs: number
  series: Series
}

const parseRange = (value: string | null): { key: RangeKey; ms: number; bucketMs: number } => {
  switch (value) {
    case '24h':
      return { key: '24h', ms: 24 * 60 * 60 * 1000, bucketMs: 5 * 60 * 1000 }
    case '7d':
      return { key: '7d', ms: 7 * 24 * 60 * 60 * 1000, bucketMs: 60 * 60 * 1000 }
    case '60m':
    default:
      return { key: '60m', ms: 60 * 60 * 1000, bucketMs: 60 * 1000 }
  }
}

const toEnumServices = (servicesParam: string | null): HealthService[] => {
  const all = new Set<HealthService>([
    'database',
    'redis',
    'sms',
    'email',
    'usgs',
    'noaa',
    'emsc',
    'jma',
    'ptwc',
    'iris',
    'whatsapp',
    'voice',
  ] as HealthService[])

  if (!servicesParam) return Array.from(all)
  return servicesParam
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s as HealthService)
    .filter(s => all.has(s))
}

const worst = (statuses: HealthStatus[]): HealthStatus => {
  if (statuses.includes('critical')) return 'critical'
  if (statuses.includes('warning')) return 'warning'
  return 'healthy'
}

const percentile = (values: number[], p: number): number | undefined => {
  if (!values.length) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.floor(p * (sorted.length - 1))
  return sorted[idx]
}

const p50 = (values: number[]) => percentile(values, 0.50)
const p95 = (values: number[]) => percentile(values, 0.95)
const p99 = (values: number[]) => percentile(values, 0.99)

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const rangeOpt = parseRange(url.searchParams.get('range'))
    const services = toEnumServices(url.searchParams.get('services'))

    const now = Date.now()
    const fromTs = now - rangeOpt.ms
    const toTs = now

    const rows = await (prisma as any).healthSnapshot.findMany({
      where: {
        createdAt: { gte: new Date(fromTs), lte: new Date(toTs) },
        service: { in: services as any },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, service: true, status: true, latencyMs: true },
    })

    const bucketMs = rangeOpt.bucketMs
    const start = Math.floor(fromTs / bucketMs) * bucketMs

    // Initialize buckets per service
    const series: Series = {}
    for (const s of services) series[s] = []

    // Build temporary bucket maps
    const tmp: Record<string, Record<number, { lats: number[]; statuses: HealthStatus[]; count: number }>> = {}
    for (const s of services) tmp[s] = {}

    for (const row of rows) {
      const s = row.service as HealthService
      const t = Math.floor((row.createdAt.getTime() - start) / bucketMs) * bucketMs + start
      const bucket = (tmp[s][t] ||= { lats: [], statuses: [], count: 0 })
      if (typeof row.latencyMs === 'number') bucket.lats.push(Math.max(0, Math.round(row.latencyMs)))
      bucket.statuses.push(row.status)
      bucket.count += 1
    }

    for (const s of services) {
      const buckets = tmp[s]
      const times = Object.keys(buckets).map(n => Number(n)).sort((a, b) => a - b)
      series[s] = times.map((t) => {
        const b = buckets[t]
        const avg = b.lats.length ? Math.round(b.lats.reduce((a, c) => a + c, 0) / b.lats.length) : undefined
        return {
          time: t,
          latencyAvg: avg,
          latencyP50: p50(b.lats),
          latencyP95: p95(b.lats),
          latencyP99: p99(b.lats),
          count: b.count,
          worstStatus: worst(b.statuses),
        }
      })
    }

    const res: HistoryResponse = {
      range: rangeOpt.key,
      from: fromTs,
      to: toTs,
      bucketMs,
      series,
    }

    return Response.json(res, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('health history error', error)
    return Response.json({ error: 'history_failed' }, { status: 500 })
  }
}
