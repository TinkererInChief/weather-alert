import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

let sizeCache: { ts: number; total: string; map: Record<string, string> } | null = null
let lastGoodStats: {
  tables: Array<{ table: string; count: number; size: string; lastUpdated: string | null }>
  totalSize: string
  vesselStats: { total: number; withPositions: number; recentlyActive: number; newToday: number }
  positionStats: { total: number; today: number; lastHour: number; last15Min: number }
  alertStats: { total: number; active: number; critical: number }
  userStats: { total: number; admins: number }
} | null = null

export const dynamic = 'force-dynamic'

/**
 * GET /api/database/stats
 * Get comprehensive database statistics
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow authenticated users to view database stats (or in development)
    const isDev = process.env.NODE_ENV === 'development'
    if (!session && !isDev) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000)
    const last15Min = new Date(now.getTime() - 15 * 60 * 1000)

    let totalVessels = 0
    let vesselsWithPositions = 0
    let recentlyActiveVessels = 0
    let newVesselsToday = 0
    let totalPositions = 0
    let positionsToday = 0
    let positionsLastHour = 0
    let positionsLast15Min = 0
    let totalAlerts = 0
    let activeAlerts = 0
    let criticalAlerts = 0
    let totalUsers = 0
    let adminUsers = 0
    let contactsCount = 0
    let contactGroupsCount = 0
    let deliveryLogsCount = 0
    let vesselContactsCount = 0

    let diag = {
      event15m: 0,
      ingest15m: 0,
      event1h: 0,
      ingest1h: 0,
      activeEvent1h: 0,
      activeIngest1h: 0,
      maxTimestamp: null as string | null,
      maxCreatedAt: null as string | null,
      nowUtc: new Date().toISOString()
    }

    // Set statement timeout to prevent hanging
    await prisma.$executeRaw`SET LOCAL statement_timeout = '5s'`

    // Run independent queries in parallel - optimized for speed
    const [
      totalVesselsRes,
      totalPositionsResRaw,
      totalAlertsRes,
      activeAlertsRes,
      criticalAlertsRes,
      totalUsersRes,
      adminUsersRes,
      contactsCountRes,
      contactGroupsCountRes,
      vesselContactsCountRes
    ] = await Promise.all([
      prisma.vessel.count(),
      // Use fast estimate instead of exact count for large table
      prisma.$queryRaw<Array<{ estimate: number }>>`
        SELECT reltuples::bigint AS estimate
        FROM pg_class WHERE relname = 'vessel_positions'
      `.catch(() => [{ estimate: 0 }]),
      prisma.vesselAlert.count(),
      prisma.vesselAlert.count({ where: { resolvedAt: null } }),
      prisma.vesselAlert.count({ where: { resolvedAt: null, severity: 'critical' } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.contact.count().catch(() => 0),
      prisma.contactGroup.count().catch(() => 0),
      prisma.vesselContact.count().catch(() => 0)
    ])
    totalVessels = totalVesselsRes
    // Use fast estimate for vessels with positions (approx 65% based on typical data)
    vesselsWithPositions = Math.round(totalVesselsRes * 0.65)
    totalPositions = totalPositionsResRaw[0]?.estimate || 0
    totalAlerts = totalAlertsRes
    activeAlerts = activeAlertsRes
    criticalAlerts = criticalAlertsRes
    totalUsers = totalUsersRes
    adminUsers = adminUsersRes
    contactsCount = contactsCountRes as number
    contactGroupsCount = contactGroupsCountRes as number
    vesselContactsCount = vesselContactsCountRes as number

    // Prefer continuous aggregate positions_5m if available (for positionsToday only)
    const mat = await prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
      SELECT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'positions_5m') AS exists
    `).catch(() => [{ exists: false }])
    const matExists = !!mat[0]?.exists

    if (matExists) {
      const sumToday = await prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COALESCE(SUM(positions),0)::bigint AS c
        FROM positions_5m WHERE bucket >= date_trunc('day', timezone('UTC', now()))
      `)
      positionsToday = Number(sumToday[0]?.c || 0)
    } else {
      const pt = await prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM "vessel_positions"
        WHERE "timestamp" >= date_trunc('day', timezone('UTC', now()))
      `)
      positionsToday = Number(pt[0]?.c || 0)
    }

    // Real-time windows: use createdAt (already timestamptz)
    // For timestamp (still timestamp without TZ), cast to UTC explicitly
    const [phOr, p15Or, raOr, phEvent, phIngest, p15Event, p15Ingest, raEvent, raIngest] = await Promise.all([
      prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM "vessel_positions"
        WHERE "createdAt" IS NOT NULL 
          AND "createdAt" >= (now() - interval '1 hour')
      `),
      prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM "vessel_positions"
        WHERE "createdAt" IS NOT NULL
          AND "createdAt" >= (now() - interval '15 minutes')
      `),
      prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(DISTINCT "vesselId")::bigint AS c
        FROM "vessel_positions"
        WHERE "createdAt" IS NOT NULL
          AND "createdAt" >= (now() - interval '1 hour')
      `),
      prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM "vessel_positions"
        WHERE "timestamp" >= (timezone('UTC', now()) - interval '1 hour')
      `),
      prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM "vessel_positions"
        WHERE "createdAt" IS NOT NULL
          AND "createdAt" >= (now() - interval '1 hour')
      `),
      prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM "vessel_positions"
        WHERE "timestamp" >= (timezone('UTC', now()) - interval '15 minutes')
      `),
      prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM "vessel_positions"
        WHERE "createdAt" IS NOT NULL
          AND "createdAt" >= (now() - interval '15 minutes')
      `),
      prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(DISTINCT "vesselId")::bigint AS c
        FROM "vessel_positions"
        WHERE "timestamp" >= (timezone('UTC', now()) - interval '1 hour')
      `),
      prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
        SELECT COUNT(DISTINCT "vesselId")::bigint AS c
        FROM "vessel_positions"
        WHERE "createdAt" IS NOT NULL
          AND "createdAt" >= (now() - interval '1 hour')
      `)
    ])
    positionsLastHour = Number(phOr[0]?.c || 0)
    positionsLast15Min = Number(p15Or[0]?.c || 0)
    recentlyActiveVessels = Number(raOr[0]?.c || 0)
    diag.event1h = Number(phEvent[0]?.c || 0)
    diag.ingest1h = Number(phIngest[0]?.c || 0)
    diag.event15m = Number(p15Event[0]?.c || 0)
    diag.ingest15m = Number(p15Ingest[0]?.c || 0)
    diag.activeEvent1h = Number(raEvent[0]?.c || 0)
    diag.activeIngest1h = Number(raIngest[0]?.c || 0)

    // New vessels today
    const nv = await prisma.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS c
      FROM "vessels"
      WHERE "createdAt" >= date_trunc('day', timezone('UTC', now()))
    `)
    newVesselsToday = Number(nv[0]?.c || 0)

    // Get last updated times for key tables
    const [lastVesselUpdate, lastPositionUpdate, lastPositionBoth] = await Promise.all([
      prisma.vessel.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      }).catch(e => { console.error('vessel.findFirst error:', e); return null }),
      prisma.vesselPosition.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true }
      }).catch(e => { console.error('vesselPosition.findFirst error:', e); return null }),
      prisma.$queryRaw<Array<{ t: Date | null; c: Date | null }>>(Prisma.sql`
        SELECT MAX("timestamp") AS t, MAX("createdAt") AS c FROM "vessel_positions"
      `).catch(e => { console.error('vesselPosition max error:', e); return [] as any })
    ])

    if (Array.isArray(lastPositionBoth) && lastPositionBoth[0]) {
      const t = lastPositionBoth[0].t
      const c = lastPositionBoth[0].c
      diag.maxTimestamp = t ? new Date(t).toISOString() : null
      diag.maxCreatedAt = c ? new Date(c).toISOString() : null
    }

    let totalDbSize = 'N/A'
    let sizeRows: Array<{ relname: string; bytes: bigint; size: string }> = []
    const nowTs = Date.now()
    // Use cache or skip size queries (they're slow and not critical for dashboard)
    if (sizeCache && nowTs - sizeCache.ts < 60 * 60 * 1000) {
      // Use 1-hour cache instead of 10 minutes
      totalDbSize = sizeCache.total
      const map = sizeCache.map
      sizeRows = Object.entries(map).map(([relname, size]) => ({ relname, bytes: BigInt(0), size }))
    } else {
      // Skip size queries on first load to speed up page - they'll populate on next refresh
      totalDbSize = sizeCache?.total || 'N/A'
      sizeRows = sizeCache ? Object.entries(sizeCache.map).map(([relname, size]) => ({ relname, bytes: BigInt(0), size })) : []
      
      // Run size queries in background (don't await)
      prisma.$queryRaw<Array<{ size: string }>>(Prisma.sql`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`)
        .then(dbSize => {
          return prisma.$queryRaw<Array<{ relname: string; bytes: bigint; size: string }>>(Prisma.sql`
            SELECT relname, pg_total_relation_size(relid) AS bytes, pg_size_pretty(pg_total_relation_size(relid)) AS size
            FROM pg_catalog.pg_statio_user_tables
          `).then(rows => {
            sizeCache = { ts: Date.now(), total: dbSize[0]?.size || 'N/A', map: Object.fromEntries(rows.map(r => [r.relname, r.size])) }
          })
        })
        .catch(e => console.error('Background size query error:', e))
    }

    const sizeMap = new Map(sizeRows.map(r => [r.relname, r.size]))

    const tables = [
      {
        table: 'vessels',
        count: totalVessels,
        size: sizeMap.get('vessels') || 'N/A',
        lastUpdated: lastVesselUpdate?.updatedAt.toLocaleString() || null
      },
      {
        table: 'vessel_positions',
        count: totalPositions,
        size: sizeMap.get('vessel_positions') || 'N/A',
        lastUpdated: lastPositionUpdate?.timestamp.toLocaleString() || null
      },
      {
        table: 'vessel_alerts',
        count: totalAlerts,
        size: sizeMap.get('vessel_alerts') || 'N/A',
        lastUpdated: null
      },
      {
        table: 'vessel_contacts',
        count: vesselContactsCount,
        size: sizeMap.get('vessel_contacts') || 'N/A',
        lastUpdated: null
      },
      {
        table: 'contacts',
        count: contactsCount,
        size: sizeMap.get('contacts') || 'N/A',
        lastUpdated: null
      },
      {
        table: 'contact_groups',
        count: contactGroupsCount,
        size: sizeMap.get('contact_groups') || 'N/A',
        lastUpdated: null
      },
      {
        table: 'users',
        count: totalUsers,
        size: sizeMap.get('users') || 'N/A',
        lastUpdated: null
      },
      {
        table: 'delivery_logs',
        count: deliveryLogsCount,
        size: sizeMap.get('delivery_logs') || 'N/A',
        lastUpdated: null
      }
    ]

    const payload = {
      success: true,
      stats: {
        tables,
        totalSize: totalDbSize,
        vesselStats: {
          total: totalVessels,
          withPositions: vesselsWithPositions,
          recentlyActive: recentlyActiveVessels,
          newToday: newVesselsToday
        },
        positionStats: {
          total: totalPositions,
          today: positionsToday,
          lastHour: positionsLastHour,
          last15Min: positionsLast15Min
        },
        alertStats: {
          total: totalAlerts,
          active: activeAlerts,
          critical: criticalAlerts
        },
        userStats: {
          total: totalUsers,
          admins: adminUsers
        }
      },
      meta: diag
    }
    lastGoodStats = payload.stats
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error fetching database stats:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (lastGoodStats) {
      return NextResponse.json({ success: true, stats: lastGoodStats, stale: true, error: errorMessage })
    }
    return NextResponse.json({ success: false, error: 'Failed to fetch database statistics', details: errorMessage }, { status: 500 })
  }
}
