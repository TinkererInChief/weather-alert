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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'
    if (!session && !isDev) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = (searchParams.get('type') || 'speed') as 'speed' | 'navStatus' | 'buildYear' | 'destination' | 'owner' | 'operator'
    const rangeMs = parseRange(searchParams.get('range'))
    const since = new Date(Date.now() - rangeMs)

    if (type === 'speed') {
      const binSize = Math.max(0.5, Math.min(10, parseFloat(searchParams.get('bin') || '1')))
      const min = Math.max(0, parseFloat(searchParams.get('min') || '0'))
      const max = Math.max(min, parseFloat(searchParams.get('max') || '60'))

      const buckets = await prisma.$queryRaw<Array<{ b: number; c: bigint }>>(Prisma.sql`
        WITH latest AS (
          SELECT DISTINCT ON ("vesselId")
            "vesselId",
            "speed"
          FROM "vessel_positions"
          WHERE "timestamp" >= ${since}
          ORDER BY "vesselId", "timestamp" DESC
        )
        SELECT FLOOR("speed" / ${binSize}) * ${binSize} AS b, COUNT(*)::bigint AS c
        FROM latest
        WHERE "speed" IS NOT NULL AND "speed" >= ${min} AND "speed" <= ${max}
        GROUP BY b
        ORDER BY b
      `)

      const meta = await prisma.$queryRaw<Array<{ active: bigint; with_speed: bigint }>>(Prisma.sql`
        WITH latest AS (
          SELECT DISTINCT ON ("vesselId")
            "vesselId",
            "speed"
          FROM "vessel_positions"
          WHERE "timestamp" >= ${since}
          ORDER BY "vesselId", "timestamp" DESC
        )
        SELECT
          COUNT(*)::bigint AS active,
          COUNT(*) FILTER (WHERE "speed" IS NOT NULL)::bigint AS with_speed
        FROM latest
      `)

      return NextResponse.json({
        success: true,
        type,
        bin: binSize,
        buckets: buckets.map(r => ({ bin: Number(r.b), count: Number(r.c) })),
        distinctVessels: Number(meta[0]?.active || 0),
        withSpeed: Number(meta[0]?.with_speed || 0),
        min,
        max,
      })
    }

    if (type === 'navStatus') {
      const rows = await prisma.$queryRaw<Array<{ s: string; c: bigint }>>(Prisma.sql`
        WITH latest AS (
          SELECT DISTINCT ON ("vesselId")
            "vesselId",
            COALESCE("navStatus", 'Unknown') AS s
          FROM "vessel_positions"
          WHERE "timestamp" >= ${since}
          ORDER BY "vesselId", "timestamp" DESC
        )
        SELECT s, COUNT(*)::bigint AS c
        FROM latest
        GROUP BY s
        ORDER BY c DESC
      `)
      const meta = await prisma.$queryRaw<Array<{ total: bigint; known: bigint }>>(Prisma.sql`
        WITH latest AS (
          SELECT DISTINCT ON ("vesselId")
            COALESCE("navStatus", 'Unknown') AS s
          FROM "vessel_positions"
          WHERE "timestamp" >= ${since}
          ORDER BY "vesselId", "timestamp" DESC
        )
        SELECT COUNT(*)::bigint AS total,
               COUNT(*) FILTER (WHERE s <> 'Unknown')::bigint AS known
        FROM latest
      `)
      return NextResponse.json({
        success: true,
        type,
        categories: rows.map(r => ({ value: r.s, count: Number(r.c) })),
        distinctVessels: Number(meta[0]?.total || 0),
        withStatus: Number(meta[0]?.known || 0)
      })
    }

    // buildYear
    const group = (searchParams.get('group') || 'year') as 'year' | 'decade'
    const expr = group === 'decade'
      ? Prisma.sql`FLOOR("build_year" / 10.0) * 10`
      : Prisma.sql`"build_year"`

    if (type === 'destination') {
      const drows = await prisma.$queryRaw<Array<{ d: string; c: bigint }>>(Prisma.sql`
        SELECT UPPER(BTRIM("destination")) AS d, COUNT(*)::bigint AS c
        FROM "vessel_positions"
        WHERE
          "timestamp" >= ${since}
          AND "destination" IS NOT NULL
          AND length(BTRIM("destination")) > 0
          AND UPPER(BTRIM("destination")) NOT IN ('?', 'NA', 'N/A', 'NIL', '0', '-', '--')
        GROUP BY d
        ORDER BY c DESC
        LIMIT 100
      `)
      const meta = await prisma.$queryRaw<Array<{ total: bigint; with_dest: bigint }>>(Prisma.sql`
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (
            WHERE "destination" IS NOT NULL
              AND length(BTRIM("destination")) > 0
              AND UPPER(BTRIM("destination")) NOT IN ('?', 'NA', 'N/A', 'NIL', '0', '-', '--')
          )::bigint AS with_dest
        FROM "vessel_positions"
        WHERE "timestamp" >= ${since}
      `)
      return NextResponse.json({
        success: true,
        type,
        top: drows.map(r => ({ value: r.d, count: Number(r.c) })),
        totalPositions: Number(meta[0]?.total || 0),
        withDestination: Number(meta[0]?.with_dest || 0)
      })
    }

    if (type === 'owner' || type === 'operator') {
      const col = type === 'owner' ? Prisma.sql`"owner"` : Prisma.sql`"operator"`
      const limit = Math.max(5, Math.min(50, parseInt(searchParams.get('limit') || '10', 10)))
      const rows = await prisma.$queryRaw<Array<{ v: string; c: bigint }>>(Prisma.sql`
        SELECT ${col} AS v, COUNT(*)::bigint AS c
        FROM "vessels"
        WHERE ${col} IS NOT NULL AND length(${col}::text) > 0
        GROUP BY v
        ORDER BY c DESC
        LIMIT ${limit}
      `)
      return NextResponse.json({ success: true, type, top: rows.map(r => ({ value: r.v, count: Number(r.c) })) })
    }

    const rows = await prisma.$queryRaw<Array<{ g: number; c: bigint }>>(Prisma.sql`
      SELECT ${expr} AS g, COUNT(*)::bigint AS c
      FROM "vessels"
      WHERE "build_year" IS NOT NULL
      GROUP BY g
      ORDER BY g
    `)

    return NextResponse.json({ success: true, type, group, buckets: rows.map(r => ({ bin: Number(r.g), count: Number(r.c) })) })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: 'Failed to fetch distribution', details: msg }, { status: 500 })
  }
}
