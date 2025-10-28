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
    const rangeMs = parseRange(searchParams.get('range'))
    const level = (searchParams.get('level') || 'position') as 'position' | 'vessel'
    const since = new Date(Date.now() - rangeMs)

    if (level === 'vessel') {
      const rows = await prisma.$queryRaw<Array<{
        total: bigint
        with_speed: bigint
        with_course: bigint
        with_heading: bigint
        with_nav: bigint
        with_dest: bigint
      }>>(Prisma.sql`
        WITH latest AS (
          SELECT DISTINCT ON ("vesselId")
            "vesselId", speed, course, heading, "navStatus", destination
          FROM "vessel_positions"
          WHERE "timestamp" >= ${since}
          ORDER BY "vesselId", "timestamp" DESC
        )
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE speed IS NOT NULL)::bigint AS with_speed,
          COUNT(*) FILTER (WHERE course IS NOT NULL)::bigint AS with_course,
          COUNT(*) FILTER (WHERE heading IS NOT NULL)::bigint AS with_heading,
          COUNT(*) FILTER (WHERE "navStatus" IS NOT NULL)::bigint AS with_nav,
          COUNT(*) FILTER (
            WHERE destination IS NOT NULL
              AND length(BTRIM(destination)) > 0
              AND UPPER(BTRIM(destination)) NOT IN ('?', 'NA', 'N/A', 'NIL', '0', '-', '--')
          )::bigint AS with_dest
        FROM latest
      `)

      const r = rows[0]
      const total = Number(r?.total || 0)
      return NextResponse.json({
        success: true,
        level,
        since: since.toISOString(),
        totalVessels: total,
        fields: [
          { key: 'speed', present: Number(r?.with_speed || 0) },
          { key: 'course', present: Number(r?.with_course || 0) },
          { key: 'heading', present: Number(r?.with_heading || 0) },
          { key: 'navStatus', present: Number(r?.with_nav || 0) },
          { key: 'destination', present: Number(r?.with_dest || 0) }
        ]
      })
    }

    // position-level
    const rows = await prisma.$queryRaw<Array<{
      total: bigint
      with_speed: bigint
      with_course: bigint
      with_heading: bigint
      with_nav: bigint
      with_dest: bigint
    }>>(Prisma.sql`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE speed IS NOT NULL)::bigint AS with_speed,
        COUNT(*) FILTER (WHERE course IS NOT NULL)::bigint AS with_course,
        COUNT(*) FILTER (WHERE heading IS NOT NULL)::bigint AS with_heading,
        COUNT(*) FILTER (WHERE "navStatus" IS NOT NULL)::bigint AS with_nav,
        COUNT(*) FILTER (
          WHERE destination IS NOT NULL
            AND length(BTRIM(destination)) > 0
            AND UPPER(BTRIM(destination)) NOT IN ('?', 'NA', 'N/A', 'NIL', '0', '-', '--')
        )::bigint AS with_dest
      FROM "vessel_positions"
      WHERE "timestamp" >= ${since}
    `)

    const r = rows[0]
    const total = Number(r?.total || 0)
    return NextResponse.json({
      success: true,
      level,
      since: since.toISOString(),
      totalPositions: total,
      fields: [
        { key: 'speed', present: Number(r?.with_speed || 0) },
        { key: 'course', present: Number(r?.with_course || 0) },
        { key: 'heading', present: Number(r?.with_heading || 0) },
        { key: 'navStatus', present: Number(r?.with_nav || 0) },
        { key: 'destination', present: Number(r?.with_dest || 0) }
      ]
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: 'Failed to fetch data quality coverage', details: msg }, { status: 500 })
  }
}
