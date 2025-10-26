import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

function parseRange(val: string | null) {
  if (!val) return 24 * 60 * 60 * 1000
  const m = val.match(/^(\d+)([mhds])$/i)
  if (!m) return 24 * 60 * 60 * 1000
  const n = parseInt(m[1], 10)
  const u = m[2].toLowerCase()
  if (u === 'm') return n * 60 * 1000
  if (u === 'h') return n * 60 * 60 * 1000
  if (u === 'd') return n * 24 * 60 * 60 * 1000
  if (u === 's') return n * 1000
  return 24 * 60 * 60 * 1000
}

function bucketExprFor(column: 'createdAt' | 'resolvedAt', bucket: '1m' | '5m' | '15m' | '1h') {
  if (bucket === '1m') return Prisma.sql`date_trunc('minute', "${Prisma.raw(column)}")`
  if (bucket === '5m') return Prisma.sql`date_trunc('minute', "${Prisma.raw(column)}") - (EXTRACT(minute FROM "${Prisma.raw(column)}")::int % 5) * interval '1 minute'`
  if (bucket === '15m') return Prisma.sql`date_trunc('minute', "${Prisma.raw(column)}") - (EXTRACT(minute FROM "${Prisma.raw(column)}")::int % 15) * interval '1 minute'`
  return Prisma.sql`date_trunc('hour', "${Prisma.raw(column)}")`
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'
    if (!session && !isDev) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const rangeMs = parseRange(searchParams.get('range'))
    const bucket = (searchParams.get('bucket') as '1m' | '5m' | '15m' | '1h') || '5m'
    const since = new Date(Date.now() - rangeMs)

    const openedExpr = bucketExprFor('createdAt', bucket)
    const resolvedExpr = bucketExprFor('resolvedAt', bucket)

    const opened = await prisma.$queryRaw<Array<{ t: Date; opened: bigint }>>(Prisma.sql`
      SELECT ${openedExpr} AS t, COUNT(*)::bigint AS opened
      FROM "vessel_alerts"
      WHERE "createdAt" >= ${since}
      GROUP BY t
      ORDER BY t
    `)

    const resolved = await prisma.$queryRaw<Array<{ t: Date; resolved: bigint }>>(Prisma.sql`
      SELECT ${resolvedExpr} AS t, COUNT(*)::bigint AS resolved
      FROM "vessel_alerts"
      WHERE "resolvedAt" IS NOT NULL AND "resolvedAt" >= ${since}
      GROUP BY t
      ORDER BY t
    `)

    const bySeverity = await prisma.$queryRaw<Array<{ t: Date; severity: string; opened: bigint }>>(Prisma.sql`
      SELECT ${openedExpr} AS t, "severity", COUNT(*)::bigint AS opened
      FROM "vessel_alerts"
      WHERE "createdAt" >= ${since}
      GROUP BY t, "severity"
      ORDER BY t
    `)

    const map = new Map<string, { opened: number; resolved: number; bySeverity: Record<string, number> }>()

    for (const r of opened) {
      const k = new Date(r.t).toISOString()
      const entry = map.get(k) || { opened: 0, resolved: 0, bySeverity: {} }
      entry.opened += Number(r.opened)
      map.set(k, entry)
    }
    for (const r of resolved) {
      const k = new Date(r.t).toISOString()
      const entry = map.get(k) || { opened: 0, resolved: 0, bySeverity: {} }
      entry.resolved += Number(r.resolved)
      map.set(k, entry)
    }
    for (const r of bySeverity) {
      const k = new Date(r.t).toISOString()
      const entry = map.get(k) || { opened: 0, resolved: 0, bySeverity: {} }
      const sev = r.severity || 'unknown'
      entry.bySeverity[sev] = (entry.bySeverity[sev] || 0) + Number(r.opened)
      map.set(k, entry)
    }

    const buckets = Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1)).map(([t, v]) => ({
      t,
      opened: v.opened,
      resolved: v.resolved,
      active: 0,
      bySeverity: v.bySeverity
    }))

    let active = 0
    for (const b of buckets) {
      active += b.opened - b.resolved
      b.active = active
    }

    return NextResponse.json({ success: true, range: String(searchParams.get('range') || '24h'), bucket, buckets })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: 'Failed to fetch alerts series', details: msg }, { status: 500 })
  }
}
