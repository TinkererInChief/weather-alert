'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Circle, CircleMarker, Rectangle, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getMagnitudeColor, getDepthColor, getZoomLevel } from '@/lib/event-calculations'
import { EventType } from '@/types/event-hover'

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

// Props mirror MapPreview plus locationLabel
export type LeafletPreviewProps = {
  latitude: number
  longitude: number
  magnitude?: number
  depth?: number
  type: EventType
  shakingRadius?: {
    strong: number
    moderate: number
    light: number
    weak: number
  }
  showDepthShaft?: boolean
  showShakingRadius?: boolean
  showTsunamiRipples?: boolean
  locationLabel?: string
  contextPosition?: Corner
  autoPosition?: boolean
  minimapPosition?: Corner
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

function CameraAnimator({
  lat,
  lng,
  targetZoom,
  enabled = true,
}: { lat: number; lng: number; targetZoom: number; enabled?: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!enabled) return

    const introZoom = clamp(targetZoom - 2.2, 1.5, 8)
    map.setView([0, 20], introZoom, { animate: false })

    const id = requestAnimationFrame(() => {
      map.flyTo([lat, lng], introZoom + 1, { duration: 0.9, easeLinearity: 0.2, noMoveStart: true })
      setTimeout(() => {
        map.flyTo([lat, lng], targetZoom, { duration: 1.0, easeLinearity: 0.25 })
      }, 950)
    })

    return () => cancelAnimationFrame(id)
  }, [enabled, lat, lng, map, targetZoom])

  return null
}

function BoundsTracker({ onBounds }: { onBounds: (b: L.LatLngBounds) => void }) {
  useMapEvents({
    moveend: (e) => onBounds(e.target.getBounds()),
    zoomend: (e) => onBounds(e.target.getBounds()),
  })
  return null
}

function EpicenterOrderTracker({
  lat,
  lng,
  onOrderSuggested,
}: {
  lat: number
  lng: number
  onOrderSuggested: (order: Corner[]) => void
}) {
  const map = useMap()
  useEffect(() => {
    const compute = () => {
      const size = map.getSize()
      const p = map.latLngToContainerPoint(new L.LatLng(lat, lng))
      const pad = 12
      const anchors: Record<Corner, L.Point> = {
        'top-left': L.point(pad, pad),
        'top-right': L.point(size.x - pad, pad),
        'bottom-left': L.point(pad, size.y - pad),
        'bottom-right': L.point(size.x - pad, size.y - pad),
      }
      const dist = (pt: L.Point) => Math.hypot(p.x - pt.x, p.y - pt.y)
      const allCorners: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
      const order = allCorners.slice().sort((a, b) => dist(anchors[b]) - dist(anchors[a]))
      onOrderSuggested(order)
    }
    compute()
    map.on('moveend zoomend resize', compute)
    return () => {
      map.off('moveend zoomend resize', compute)
    }
  }, [lat, lng, map, onOrderSuggested])
  return null
}

function GridLines({ step = 10 }: { step?: number }) {
  const map = useMap()
  const layerRef = useRef<L.GridLayer | null>(null)

  useEffect(() => {
    if (layerRef.current) return

    const grid: L.GridLayer = L.gridLayer({
      pane: 'overlayPane',
      tileSize: 256,
      attribution: '',
    })

    // Extend createTile to draw simple graticules
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(grid as any).createTile = (coords: L.Coords) => {
      const tile = L.DomUtil.create('canvas', 'leaflet-tile') as HTMLCanvasElement
      tile.width = 256
      tile.height = 256
      const ctx = tile.getContext('2d')!
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.25)'
      ctx.lineWidth = 1

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tileBounds = (grid as any)._tileCoordsToBounds(coords)
      const nw = tileBounds.getNorthWest()
      const se = tileBounds.getSouthEast()

      const latStart = Math.floor(se.lat / step) * step
      const latEnd = Math.ceil(nw.lat / step) * step
      const lngStart = Math.floor(nw.lng / step) * step
      const lngEnd = Math.ceil(se.lng / step) * step

      const project = (lat: number, lng: number) => {
        const p = map.project(new L.LatLng(lat, lng), coords.z)
        const origin = L.point(coords.x * 256, coords.y * 256)
        return p.subtract(origin)
      }

      for (let lat = latStart; lat <= latEnd; lat += step) {
        const p1 = project(lat, nw.lng)
        const p2 = project(lat, se.lng)
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }

      for (let lng = lngStart; lng <= lngEnd; lng += step) {
        const p1 = project(nw.lat, lng)
        const p2 = project(se.lat, lng)
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }

      return tile
    }

    layerRef.current = grid
    grid.addTo(map)

    return () => {
      grid.remove()
      layerRef.current = null
    }
  }, [map, step])

  return null
}

// ---------- Offline Context Utilities (cached) ----------
type Place = { n: string; c: string; lat: number; lon: number; pop: number }
type CountryEntry = { name: string; flag: string }
type OceansEntry = { name: string; bbox: [number, number, number, number] }
type PlateEntry = { name: string; bbox?: [number, number, number, number]; bboxes?: [number, number, number, number][] }

let placesCache: Place[] | null = null
let countriesCache: Record<string, CountryEntry> | null = null
let oceansCache: OceansEntry[] | null = null
let platesCache: PlateEntry[] | null = null

const toRad = (d: number) => (d * Math.PI) / 180
const R = 6371 // km
const haversineKm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)
  const s1 = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s1))
}

const initialBearing = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const y = Math.sin(toRad(bLon - aLon)) * Math.cos(toRad(bLat))
  const x = Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) - Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(toRad(bLon - aLon))
  const brng = (Math.atan2(y, x) * 180) / Math.PI
  return (brng + 360) % 360
}

const bearingToCompass = (deg: number) => {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const idx = Math.round(deg / 22.5) % 16
  return dirs[idx]
}

const inBbox = (lat: number, lon: number, bbox: [number, number, number, number]) => {
  const [minLon, minLat, maxLon, maxLat] = bbox
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat
}

// Build candidate URLs that work with or without basePath/assetPrefix
const candidatesFor = (path: string) => {
  const base = path.startsWith('/') ? path : `/${path}`
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assetPrefix: string = typeof window !== 'undefined' ? ((window as any).__NEXT_DATA__?.assetPrefix || '') : ''
  const list = [
    base,
    origin ? `${origin}${base}` : undefined,
    assetPrefix ? `${assetPrefix}${base}` : undefined,
    origin && assetPrefix ? `${origin}${assetPrefix}${base}` : undefined,
  ].filter((s): s is string => Boolean(s))
  return Array.from(new Set(list))
}

// Generic loader with candidates + fallback
const fetchJsonCandidates = async <T,>(candidates: string[], fallback: T): Promise<T> => {
  for (const url of candidates) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        return (await res.json()) as T
      }
    } catch {
      // continue
    }
  }
  console.warn('⚠️ Context dataset not found on server, using inline fallback for', candidates[0])
  return fallback
}

// Inline fallbacks (kept small)
const fallbackPlaces: Place[] = [
  { n: 'Tokyo', c: 'JP', lat: 35.68, lon: 139.76, pop: 37400068 },
  { n: 'Osaka', c: 'JP', lat: 34.69, lon: 135.5, pop: 19222665 },
  { n: 'Manila', c: 'PH', lat: 14.6, lon: 120.98, pop: 13923452 },
  { n: 'Jakarta', c: 'ID', lat: -6.2, lon: 106.8, pop: 34540000 },
  { n: 'Sydney', c: 'AU', lat: -33.87, lon: 151.21, pop: 5312000 },
  { n: 'Melbourne', c: 'AU', lat: -37.81, lon: 144.96, pop: 5078000 },
  { n: 'Los Angeles', c: 'US', lat: 34.05, lon: -118.24, pop: 12750807 },
  { n: 'San Francisco', c: 'US', lat: 37.78, lon: -122.42, pop: 4720000 },
  { n: 'Honolulu', c: 'US', lat: 21.31, lon: -157.86, pop: 1000000 },
  { n: 'Anchorage', c: 'US', lat: 61.22, lon: -149.9, pop: 291000 },
  { n: 'Lima', c: 'PE', lat: -12.05, lon: -77.05, pop: 10750000 },
  { n: 'Santiago', c: 'CL', lat: -33.45, lon: -70.67, pop: 6520000 },
  { n: 'Mexico City', c: 'MX', lat: 19.43, lon: -99.13, pop: 21581000 },
  { n: 'Bogotá', c: 'CO', lat: 4.71, lon: -74.07, pop: 10777900 },
  { n: 'San Juan', c: 'PR', lat: 18.47, lon: -66.11, pop: 318000 },
  { n: 'Auckland', c: 'NZ', lat: -36.85, lon: 174.76, pop: 1657000 },
  { n: 'Shanghai', c: 'CN', lat: 31.23, lon: 121.47, pop: 26317104 },
  { n: 'Istanbul', c: 'TR', lat: 41.01, lon: 28.97, pop: 15460000 },
  { n: 'Delhi', c: 'IN', lat: 28.61, lon: 77.2, pop: 30291000 },
  { n: 'Tehran', c: 'IR', lat: 35.69, lon: 51.42, pop: 8846782 },
]

const fallbackCountries: Record<string, CountryEntry> = {
  JP: { name: 'Japan', flag: '🇯🇵' },
  US: { name: 'United States', flag: '🇺🇸' },
  PH: { name: 'Philippines', flag: '🇵🇭' },
  ID: { name: 'Indonesia', flag: '🇮🇩' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  PE: { name: 'Peru', flag: '🇵🇪' },
}

const fallbackOceans: OceansEntry[] = [
  { name: 'Pacific Ocean', bbox: [-180, -60, 180, 60] },
  { name: 'Atlantic Ocean', bbox: [-100, -60, 20, 70] },
  { name: 'Indian Ocean', bbox: [20, -60, 147, 30] },
  { name: 'Southern Ocean', bbox: [-180, -90, 180, -55] },
  { name: 'Arctic Ocean', bbox: [-180, 70, 180, 90] },
]

const fallbackPlates: PlateEntry[] = [
  { name: 'Pacific Plate', bboxes: [[-180, -60, -60, 60], [150, -60, 180, 60]] },
  { name: 'North American Plate', bbox: [-170, 5, -50, 85] },
  { name: 'Eurasian Plate', bbox: [-10, 20, 180, 80] },
  { name: 'Indo-Australian Plate', bbox: [90, -60, 160, 10] },
]

const loadContextData = async () => {
  if (!placesCache) {
    placesCache = await fetchJsonCandidates<Place[]>(candidatesFor('/context/places-medium.json'), fallbackPlaces)
  }
  if (!countriesCache) {
    countriesCache = await fetchJsonCandidates<Record<string, CountryEntry>>(candidatesFor('/context/countries-lite.json'), fallbackCountries)
  }
  if (!oceansCache) {
    oceansCache = await fetchJsonCandidates<OceansEntry[]>(candidatesFor('/context/oceans-lite.json'), fallbackOceans)
  }
  if (!platesCache) {
    platesCache = await fetchJsonCandidates<PlateEntry[]>(candidatesFor('/context/plates-lite.json'), fallbackPlates)
  }
}

const nearestCities = (lat: number, lon: number, k = 2) => {
  if (!placesCache) return [] as Array<{ place: Place; km: number; bearing: string }>
  // quick coarse filter by bbox ±7° to reduce ops
  const cand = placesCache.filter((p) => Math.abs(p.lat - lat) <= 7 && Math.abs(p.lon - lon) <= 7)
  const scored = (cand.length ? cand : placesCache)
    .map((p) => {
      const km = haversineKm(lat, lon, p.lat, p.lon)
      // Bearing should express epicenter relative to the city (USGS style: "X km W of City").
      // So compute bearing from city → epicenter, not epicenter → city.
      const brCityToEvent = initialBearing(p.lat, p.lon, lat, lon)
      return { place: p, km, bearing: bearingToCompass(brCityToEvent) }
    })
    .sort((a, b) => a.km - b.km)
  return scored.slice(0, k)
}

const nearestCityLabel = (lat: number, lon: number) => {
  const [best] = nearestCities(lat, lon, 1)
  if (!best) return null
  const km = Math.round(best.km)
  const base = `${km} km ${best.bearing} of ${best.place.n}`
  return km > 250 ? `Offshore, ${base}` : base
}

const oceanForPoint = (lat: number, lon: number) => {
  if (!oceansCache) return null
  for (const o of oceansCache) {
    if (inBbox(lat, lon, o.bbox)) return o.name
  }
  return null
}

const plateForPoint = (lat: number, lon: number) => {
  if (!platesCache) return null
  for (const p of platesCache) {
    if (p.bbox && inBbox(lat, lon, p.bbox)) return p.name
    if (p.bboxes && p.bboxes.some((b) => inBbox(lat, lon, b))) return p.name
  }
  return null
}

export default function LeafletPreview({
  latitude,
  longitude,
  magnitude = 5.0,
  depth = 10,
  type,
  shakingRadius,
  showDepthShaft = true,
  showShakingRadius = true,
  showTsunamiRipples = false,
  locationLabel,
  contextPosition = 'top-right',
  autoPosition = true,
  minimapPosition = 'bottom-left',
}: LeafletPreviewProps) {
  const targetZoom = useMemo(() => clamp(getZoomLevel(magnitude) + 0.5, 3, 9), [magnitude])
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null)
  const [pulse, setPulse] = useState(0)
  const [derivedLabel, setDerivedLabel] = useState<string | null>(null)
  const [countryChip, setCountryChip] = useState<string | null>(null)
  const [oceanChip, setOceanChip] = useState<string | null>(null)
  const [plateChip, setPlateChip] = useState<string | null>(null)
  const [nearby, setNearby] = useState<Array<{ name: string; lat: number; lon: number; km: number }>>([])
  const [autoCorner, setAutoCorner] = useState<Corner>(contextPosition)
  const [suggestedOrder, setSuggestedOrder] = useState<Corner[]>([])

  // simple pulse animation 0..1
  useEffect(() => {
    let t = 0
    let raf = 0
    const loop = () => {
      t += 0.02
      setPulse((Math.sin(t) + 1) / 2) // 0..1
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const epicenterColor = type === 'earthquake' ? getMagnitudeColor(magnitude) : '#3b82f6'
  const cornerToClass = (c: Corner) => {
    switch (c) {
      case 'top-right':
        return 'top-3 right-3'
      case 'bottom-left':
        return 'bottom-3 left-3'
      case 'bottom-right':
        return 'bottom-3 right-3'
      default:
        return 'top-3 left-3'
    }
  }
  const actualCorner: Corner = autoPosition ? autoCorner : contextPosition
  const posClass = useMemo(() => cornerToClass(actualCorner), [actualCorner])
  const miniPosClass = useMemo(() => cornerToClass(minimapPosition), [minimapPosition])

  // Auto-positioning: use farthest-from-epicenter order, avoid minimap corner, fallback to preference
  useEffect(() => {
    if (!autoPosition) {
      setAutoCorner(contextPosition)
      return
    }
    const base: Corner[] = ['top-right', 'top-left', 'bottom-right', 'bottom-left']
    const order = ([...suggestedOrder, contextPosition, ...base] as Corner[])
      .filter((c, idx, arr) => arr.indexOf(c) === idx)
      .filter((c) => c !== minimapPosition)
    setAutoCorner(order[0] ?? contextPosition)
  }, [autoPosition, contextPosition, minimapPosition, suggestedOrder])

  // Load offline context and derive labels
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await loadContextData()
      if (cancelled) return
      const label = nearestCityLabel(latitude, longitude)
      setDerivedLabel(label)
      const cities = nearestCities(latitude, longitude, 2)
      setNearby(
        cities.map((c) => ({ name: c.place.n, lat: c.place.lat, lon: c.place.lon, km: Math.round(c.km) }))
      )
      if (countriesCache && cities[0]) {
        const c = countriesCache[cities[0].place.c]
        if (c) setCountryChip(`${c.flag} ${c.name}`)
      }
      const oc = oceanForPoint(latitude, longitude)
      if (oc) setOceanChip(oc)
      const pl = plateForPoint(latitude, longitude)
      if (pl) setPlateChip(pl)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [latitude, longitude])

  return (
    <div className="relative w-full h-[250px] rounded-t-lg overflow-hidden bg-slate-100">
      <MapContainer
        center={[latitude, longitude]}
        zoom={targetZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
        preferCanvas
        inertia
        worldCopyJump
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO'
        />

        <GridLines step={10} />
        <CameraAnimator lat={latitude} lng={longitude} targetZoom={targetZoom} />
        <BoundsTracker onBounds={setBounds} />
        <EpicenterOrderTracker lat={latitude} lng={longitude} onOrderSuggested={setSuggestedOrder} />

        {/* Context distance rings (scale) */}
        <Circle center={[latitude, longitude]} radius={50000} pathOptions={{ color: '#64748b', opacity: 0.25, weight: 1, dashArray: '4 4' }} />
        <Circle center={[latitude, longitude]} radius={100000} pathOptions={{ color: '#64748b', opacity: 0.2, weight: 1, dashArray: '4 4' }} />

        {/* Epicenter core */}
        <CircleMarker
          center={[latitude, longitude]}
          radius={Math.max(6, magnitude * 2)}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: epicenterColor, fillOpacity: 0.95 }}
        />

        {/* Glow */}
        <CircleMarker
          center={[latitude, longitude]}
          radius={Math.max(10, magnitude * 3.2 + pulse * 4)}
          pathOptions={{ color: epicenterColor, weight: 1, opacity: 0.3, fillOpacity: 0.08 }}
        />

        {/* Shockwave rings (two) */}
        <CircleMarker
          center={[latitude, longitude]}
          radius={Math.max(12, magnitude * 3.2 + (pulse * 10))}
          pathOptions={{ color: epicenterColor, weight: 1, opacity: 0.25 }}
        />
        <CircleMarker
          center={[latitude, longitude]}
          radius={Math.max(16, magnitude * 3.2 + ((pulse + 0.5) % 1) * 14)}
          pathOptions={{ color: epicenterColor, weight: 1, opacity: 0.18 }}
        />

        {/* Nearby city markers (top 2) */}
        {nearby.map((c) => (
          <CircleMarker key={c.name} center={[c.lat, c.lon]} radius={4} pathOptions={{ color: '#0ea5e9', weight: 1, fillOpacity: 0.7 }}>
            <Tooltip direction="top" offset={[0, -6]} opacity={0.9} permanent>
              <div className="text-[10px]">
                {c.name} • {c.km} km
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Minimap */}
      <div className={`absolute ${miniPosClass} w-28 h-20 rounded-lg overflow-hidden shadow-md border border-slate-200 bg-white`}>
        <MapContainer
          center={[latitude, longitude]}
          zoom={2}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          boxZoom={false}
          keyboard={false}
          preferCanvas
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {bounds && (
            <Rectangle bounds={bounds} pathOptions={{ color: '#3b82f6', weight: 1, opacity: 0.6 }} />
          )}
        </MapContainer>
      </div>

      {/* Context Card */}
      <div className={`absolute ${posClass} z-[4000] pointer-events-none max-w-[200px] rounded-md bg-white/85 backdrop-blur-md text-slate-900 px-2 py-1.5 text-[10px] shadow-md border border-slate-300/50`}>
        <div className="font-semibold text-slate-900 leading-tight">{derivedLabel || locationLabel || 'Event location'}</div>
        <div className="text-slate-600 mt-0.5 leading-tight">
          {Math.abs(latitude).toFixed(2)}°{latitude >= 0 ? 'N' : 'S'}, {Math.abs(longitude).toFixed(2)}°{longitude >= 0 ? 'E' : 'W'}
        </div>
        {(countryChip || oceanChip || plateChip) && (
          <div className="flex flex-wrap gap-0.5 mt-1">
            {countryChip && <span className="px-1.5 py-0.5 rounded-full border border-slate-300/50 bg-white/90 text-slate-700 text-[9px] leading-none">{countryChip}</span>}
            {oceanChip && <span className="px-1.5 py-0.5 rounded-full border border-slate-300/50 bg-white/90 text-slate-700 text-[9px] leading-none">{oceanChip}</span>}
            {plateChip && <span className="px-1.5 py-0.5 rounded-full border border-slate-300/50 bg-white/90 text-slate-700 text-[9px] leading-none">{plateChip}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
