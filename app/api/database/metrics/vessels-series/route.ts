import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

function parseRange(val: string | null) {
  if (!val) return 30 * 24 * 60 * 60 * 1000
  const m = val.match(/^(\d+)([mhdsw])$/i)
  if (!m) return 30 * 24 * 60 * 60 * 1000
  const n = parseInt(m[1], 10)
  const u = m[2].toLowerCase()
  if (u === 'm') return n * 60 * 1000
  if (u === 'h') return n * 60 * 60 * 1000
  if (u === 'd') return n * 24 * 60 * 60 * 1000
  if (u === 'w') return n * 7 * 24 * 60 * 60 * 1000
  if (u === 's') return n * 1000
  return 30 * 24 * 60 * 60 * 1000
}

function bucketExprFor(column: 'createdAt', bucket: '1d' | '1w' | '1h') {
  const col = Prisma.raw(`"${column}"`)
  if (bucket === '1h') return Prisma.sql`date_trunc('hour', ${col})`
  if (bucket === '1w') return Prisma.sql`date_trunc('week', ${col})`
  return Prisma.sql`date_trunc('day', ${col})`
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'
    if (!session && !isDev) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const rangeMs = parseRange(searchParams.get('range'))
    const bucket = (searchParams.get('bucket') as '1d' | '1w' | '1h') || '1d'
    const since = new Date(Date.now() - rangeMs)

    const expr = bucketExprFor('createdAt', bucket)

    const rows = await prisma.$queryRaw<Array<{ t: Date; c: bigint }>>(Prisma.sql`
      SELECT ${expr} AS t, COUNT(*)::bigint AS c
      FROM "vessels"
      WHERE "createdAt" >= ${since}
      GROUP BY t
      ORDER BY t
    `)

    const buckets = rows.map(r => ({ t: new Date(r.t).toISOString(), newCount: Number(r.c) }))

    return NextResponse.json({ success: true, range: String(searchParams.get('range') || '30d'), bucket, buckets })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: 'Failed to fetch vessels series', details: msg }, { status: 500 })
  }
}
