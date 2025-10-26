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

function bucketExprFor(column: 'timestamp' | 'createdAt' | 'resolvedAt', bucket: '1m' | '5m' | '15m' | '1h') {
  const col = Prisma.raw(`"${column}"`)
  if (bucket === '1m') {
    return Prisma.sql`date_trunc('minute', ${col})`
  }
  if (bucket === '5m') {
    return Prisma.sql`date_trunc('minute', ${col}) - (EXTRACT(minute FROM ${col})::int % 5) * interval '1 minute'`
  }
  if (bucket === '15m') {
    return Prisma.sql`date_trunc('minute', ${col}) - (EXTRACT(minute FROM ${col})::int % 15) * interval '1 minute'`
  }
  return Prisma.sql`date_trunc('hour', ${col})`
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'
    if (!session && !isDev) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const rangeMs = parseRange(searchParams.get('range'))
    const bucket = (searchParams.get('bucket') as '1m' | '5m' | '15m' | '1h') || '5m'
    const since = new Date(Date.now() - rangeMs)

    const expr = bucketExprFor('timestamp', bucket)

    const query = Prisma.sql`
      SELECT
        ${expr} AS t,
        COUNT(*)::bigint AS positions,
        COUNT(DISTINCT "vesselId")::bigint AS unique_vessels
      FROM "vessel_positions"
      WHERE "timestamp" >= ${since}
      GROUP BY t
      ORDER BY t
    `

    const rows = await prisma.$queryRaw<Array<{ t: Date; positions: bigint; unique_vessels: bigint }>>(query)

    const buckets = rows.map(r => ({
      t: new Date(r.t).toISOString(),
      positions: Number(r.positions),
      uniqueVessels: Number(r.unique_vessels)
    }))

    return NextResponse.json({ success: true, range: String(searchParams.get('range') || '24h'), bucket, buckets })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: 'Failed to fetch positions series', details: msg }, { status: 500 })
  }
}
