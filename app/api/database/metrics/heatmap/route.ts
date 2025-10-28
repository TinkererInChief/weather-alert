import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

function parseRange(val: string | null) {
  if (!val) return 6 * 60 * 60 * 1000
  const m = val.match(/^(\d+)([mhds])$/i)
  if (!m) return 6 * 60 * 60 * 1000
  const n = parseInt(m[1], 10)
  const u = m[2].toLowerCase()
  if (u === 'm') return n * 60 * 1000
  if (u === 'h') return n * 60 * 60 * 1000
  if (u === 'd') return n * 24 * 60 * 60 * 1000
  if (u === 's') return n * 1000
  return 6 * 60 * 60 * 1000
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'
    if (!session && !isDev) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const rangeMs = parseRange(searchParams.get('range'))
    const precision = Math.max(0.1, Math.min(10, parseFloat(searchParams.get('precisionDeg') || '1')))
    const limit = Math.max(100, Math.min(20000, parseInt(searchParams.get('limit') || '5000', 10)))

    const since = new Date(Date.now() - rangeMs)

    const north = searchParams.get('north')
    const south = searchParams.get('south')
    const east = searchParams.get('east')
    const west = searchParams.get('west')

    const hasBounds = Boolean(north && south && east && west)
    const rows = hasBounds
      ? await prisma.$queryRaw<Array<{ lat: number; lon: number; c: bigint }>>(Prisma.sql`
          SELECT
            ROUND("latitude" / ${precision}) * ${precision} AS lat,
            ROUND("longitude" / ${precision}) * ${precision} AS lon,
            COUNT(*)::bigint AS c
          FROM "vessel_positions"
          WHERE "timestamp" >= ${since}
            AND "latitude" BETWEEN ${Number(south)} AND ${Number(north)}
            AND "longitude" BETWEEN ${Number(west)} AND ${Number(east)}
          GROUP BY lat, lon
          ORDER BY c DESC
          LIMIT ${limit}
        `)
      : await prisma.$queryRaw<Array<{ lat: number; lon: number; c: bigint }>>(Prisma.sql`
          SELECT
            ROUND("latitude" / ${precision}) * ${precision} AS lat,
            ROUND("longitude" / ${precision}) * ${precision} AS lon,
            COUNT(*)::bigint AS c
          FROM "vessel_positions"
          WHERE "timestamp" >= ${since}
          GROUP BY lat, lon
          ORDER BY c DESC
          LIMIT ${limit}
        `)

    const cells = rows.map(r => ({ lat: Number(r.lat), lon: Number(r.lon), count: Number(r.c) }))

    return NextResponse.json({ success: true, range: String(searchParams.get('range') || '6h'), precisionDeg: precision, cells })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: 'Failed to fetch heatmap', details: msg }, { status: 500 })
  }
}
