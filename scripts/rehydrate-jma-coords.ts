import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

type JmaListItem = {
  eid?: string | number
  ctt?: string | number
  at?: string
  rdt?: string
  en_anm?: string
  anm?: string
  cod?: string
  mag?: string | number
  magnitude?: string | number
}

type Coords = { lat: number; lon: number; depthKm: number }

function getArg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.findIndex(a => a === name || a.startsWith(`${name}=`))
  if (idx === -1) return fallback
  const val = process.argv[idx]
  if (val.includes('=')) return val.split('=')[1]
  const next = process.argv[idx + 1]
  return next && !next.startsWith('-') ? next : fallback
}

function parseCod(cod: string): Coords | null {
  const m = cod && typeof cod === 'string' ? cod.match(/([+-]\d+\.?\d*)([+-]\d+\.?\d*)([+-]\d+)(?:\/)?/) : null
  if (!m) return null
  const lat = parseFloat(m[1])
  const lon = parseFloat(m[2])
  const depthMeters = Math.abs(parseFloat(m[3]))
  const depthKm = Number.isFinite(depthMeters) ? depthMeters / 1000 : 10
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat === 0 && lon === 0) return null
  return { lat, lon, depthKm }
}

function toJmaEventId(item: JmaListItem, coords: Coords | null): string | null {
  const timeIso = item.at || item.rdt || null
  const timeMs = timeIso ? Date.parse(timeIso) : Date.now()
  const rawId = String(item.eid ?? item.ctt ?? (coords ? `${timeMs}_${coords.lat}_${coords.lon}` : timeMs))
  if (!rawId) return null
  return `jma_${rawId}`
}

async function fetchJmaList(): Promise<JmaListItem[]> {
  const url = 'https://www.jma.go.jp/bosai/quake/data/list.json'
  const response = await fetch(url, {
    signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(10000) : undefined,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'EmergencyAlertSystem/rehydrate/1.0',
      'Cache-Control': 'no-cache'
    }
  })
  if (!response.ok) throw new Error(`JMA fetch failed: ${response.status}`)
  const json = await response.json()
  return Array.isArray(json) ? json as JmaListItem[] : []
}

async function main() {
  const apply = process.argv.includes('--apply')
  const limitStr = getArg('--limit', '50')
  const limit = Math.max(1, parseInt(limitStr || '50', 10))

  const items = await fetchJmaList()
  const idToCoords = new Map<string, Coords>()

  for (const it of items) {
    const coords = it.cod ? parseCod(it.cod) : null
    if (!coords) continue
    const id = toJmaEventId(it, coords)
    if (!id) continue
    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) continue
    if (coords.lat === 0 && coords.lon === 0) continue
    idToCoords.set(id, coords)
  }

  const whereMissing: Prisma.AlertLogWhereInput = {
    AND: [
      { earthquakeId: { startsWith: 'jma_' } },
      { OR: [ { latitude: null }, { longitude: null } ] }
    ]
  }

  const candidates = await prisma.alertLog.findMany({
    where: whereMissing,
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: {
      id: true,
      earthquakeId: true,
      location: true,
      latitude: true,
      longitude: true,
      depth: true,
      timestamp: true,
    },
  })

  if (candidates.length === 0) {
    console.log('No JMA rows with missing coordinates found.')
    return
  }

  let resolvable = 0
  for (const row of candidates) {
    const c = idToCoords.get(row.earthquakeId)
    if (c) resolvable += 1
  }

  console.log(`Found ${candidates.length} JMA alert_logs with missing coords. Resolvable from JMA: ${resolvable}.`)

  for (const row of candidates) {
    const c = idToCoords.get(row.earthquakeId)
    if (!c) {
      console.log(`- ${row.id} | ${row.earthquakeId} | unresolved`)
      continue
    }
    console.log(`- ${row.id} | ${row.earthquakeId} | (${row.latitude}, ${row.longitude}) -> (${c.lat}, ${c.lon}), depthKm=${c.depthKm}`)
  }

  if (!apply) {
    console.log('\nDry-run mode. Pass --apply to perform updates.')
    return
  }

  let updated = 0
  for (const row of candidates) {
    const c = idToCoords.get(row.earthquakeId)
    if (!c) continue
    const depthVal = Number.isFinite(row.depth || NaN) ? row.depth : c.depthKm
    await prisma.alertLog.update({
      where: { id: row.id },
      data: {
        latitude: c.lat,
        longitude: c.lon,
        depth: depthVal,
      },
    })
    updated += 1
  }

  console.log(`\nUpdated ${updated} rows with JMA coordinates.`)
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
}).finally(async () => {
  await prisma.$disconnect()
})
