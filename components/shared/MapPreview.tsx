'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getMagnitudeColor, getDepthColor, getZoomLevel, calculateShakingRadius } from '@/lib/event-calculations'
import { EventType } from '@/types/event-hover'

// Use CSP-safe worker to comply with our strict security headers (no unsafe-eval)
// Mapbox provides a dedicated worker build that doesn't rely on eval/Function
// This prevents generic "Mapbox error" under production CSP
if (typeof window !== 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - CommonJS export without types
    const workerModule = require('mapbox-gl/dist/mapbox-gl-csp-worker')
    const WorkerConstructor = workerModule?.default ?? workerModule

    if (typeof WorkerConstructor === 'function') {
      ;(mapboxgl as unknown as { workerClass: unknown }).workerClass = WorkerConstructor
      console.log('✅ Mapbox CSP worker loaded successfully')
    } else {
      console.warn('⚠️ Mapbox CSP worker module did not export a constructor, falling back to default worker', workerModule)
    }
  } catch (err) {
    console.warn('⚠️ Could not load Mapbox CSP worker, using default (may have CSP issues):', err)
  }
}

let cachedToken: string | null = null
let tokenPromise: Promise<string> | null = null

type MapPreviewProps = {
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
}

export default function MapPreview({
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
}: MapPreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapboxToken, setMapboxToken] = useState<string | null>(null)
  const styleLoadedRef = useRef(false)
  const hasAnimatedRef = useRef(false)
  const attemptedStyleFallback = useRef(false)
  const isInitializedRef = useRef(false)
  const [contextSummary, setContextSummary] = useState<string>('')
  const [mapReady, setMapReady] = useState(false)

  // Step 1: Fetch the token from our API when the component mounts
  useEffect(() => {
    async function ensureToken() {
      try {
        if (cachedToken) {
          mapboxgl.accessToken = cachedToken
          setMapboxToken(cachedToken)
          return
        }

        if (!tokenPromise) {
          tokenPromise = (async () => {
            const response = await fetch('/api/mapbox-token')
            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'Failed to fetch Mapbox token')
            }
            const data = await response.json()
            const token = data.token

            if (!token || !token.startsWith('pk.')) {
              throw new Error('Invalid or missing Mapbox token from API.')
            }

            cachedToken = token
            mapboxgl.accessToken = token
            return token
          })()
        }

        const token = await tokenPromise
        setMapboxToken(token)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.'
        console.error('❌ Failed to fetch or set Mapbox token:', errorMessage)
        setError(`Could not retrieve Mapbox token: ${errorMessage}`)
        setIsLoading(false)
      } finally {
        tokenPromise = null
      }
    }

    ensureToken()
  }, [])

  // Step 2: Initialize the map only after the token has been fetched
  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) {
      console.log('⏸️ Map init skipped:', { hasToken: !!mapboxToken, hasContainer: !!mapContainer.current })
      return
    }
    if (map.current) {
      console.log('⏸️ Map already initialized, skipping')
      return // Initialize map only once
    }

    console.log('🗺️ Initializing map with fetched token...', { lat: latitude, lng: longitude, mag: magnitude })

    // Calculate zoom based on magnitude
    const targetZoom = Math.min(9, getZoomLevel(magnitude) + 0.4)
    const introZoom = Math.max(1.5, targetZoom - 2.2)

    // Initialize map with error handling
    try {
      // Set the access token before creating the map
      if (!mapboxgl.accessToken) {
        console.log('🔑 Setting Mapbox access token')
        mapboxgl.accessToken = mapboxToken
      }

      // Try with full 3D configuration first
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          // Use outdoors by default to avoid satellite raster permissions
          style: 'mapbox://styles/mapbox/outdoors-v12',
          center: [longitude, latitude],
          zoom: introZoom,
          pitch: 0,
          bearing: 0,
          projection: 'globe' as any,
          interactive: false, // Disable user interaction (static preview)
        })
        console.log('✅ Map instance created successfully with globe projection')
      } catch (projErr) {
        console.warn('⚠️ Globe projection failed, falling back to standard projection:', projErr)
        // Fallback to standard projection if globe is not supported
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/outdoors-v12',
          center: [longitude, latitude],
          zoom: introZoom,
          pitch: 0,
          bearing: 0,
          interactive: false,
        })
        console.log('✅ Map instance created successfully with standard projection')
      }

      map.current.on('error', (e) => {
        // Only treat authentication/CSP failures as fatal; tiles/style network hiccups are non-fatal
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err: any = (e as unknown as { error?: unknown }).error
        const status = err?.status ?? err?.statusCode
        const message: string = (err?.message as string) || ''
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyEvent = e as any
        const sourceId: string | undefined = anyEvent?.sourceId || anyEvent?.source?.id

        const fatalBase = status === 401 || status === 403 || /unauthorized|forbidden|csp/i.test(message)
        const fatal = fatalBase && sourceId !== 'mapbox-dem'
        if (fatal) {
          console.error('❌ Mapbox FATAL error:', { status, message, sourceId, error: e })

          // If satellite tiles are blocked (common with restricted tokens), fallback to vector style
          const isStyleIssue = /satellite|outdoors|style/i.test(message) || sourceId === 'satellite'
          if (!attemptedStyleFallback.current && isStyleIssue && map.current) {
            attemptedStyleFallback.current = true
            console.warn('🌐 Falling back to streets style due to style/tiles error')
            map.current.setStyle('mapbox://styles/mapbox/streets-v12')
            return
          }

          // As a last resort, surface error with specific details
          let errorMsg = 'Map failed to load. '
          if (status === 401) {
            errorMsg += 'Invalid or expired Mapbox token.'
          } else if (status === 403) {
            errorMsg += 'Access denied. Check token permissions.'
          } else if (/csp/i.test(message)) {
            errorMsg += 'Content Security Policy blocked the map.'
          } else {
            errorMsg += 'Please verify token and try again.'
          }
          setError(errorMsg)
          setIsLoading(false)
        } else {
          console.warn('⚠️ Mapbox non-fatal warning:', { status, message, sourceId })
          // do not block rendering
        }
      })

      map.current.on('style.load', () => {
        styleLoadedRef.current = true
        console.log('✅ Map style loaded successfully')

        try {
          map.current?.setFog({
            color: 'rgba(186, 230, 253, 0.6)',
            'high-color': 'rgba(14, 116, 144, 0.4)',
            'space-color': 'rgba(11, 15, 25, 1)',
            'star-intensity': 0.15,
          })
          map.current?.setLight({
            color: '#fff4e6',
            intensity: 0.7,
            position: [1.15, 210, 45],
          })
        } catch (fogErr) {
          console.warn('⚠️ Unable to configure atmospheric fog/lighting', fogErr)
        }
      })

      // Fallback: If map doesn't load within 5 seconds, hide loading state anyway
      const loadingTimeout = setTimeout(() => {
        console.warn('⚠️ Map load timeout reached, hiding loading state')
        setIsLoading(false)
      }, 5000)

      // Clear timeout when map actually loads
      map.current.once('load', () => {
        clearTimeout(loadingTimeout)
      })

      // Also try 'idle' event as fallback (fires when tiles finish loading)
      map.current.once('idle', () => {
        console.log('✅ Map idle event fired')
        setIsLoading(false)
      })
    } catch (err) {
      console.error('❌ Failed to initialize map:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('❌ Error details:', { 
        error: errorMessage, 
        hasToken: !!mapboxToken,
        hasContainer: !!mapContainer.current,
        latitude,
        longitude
      })
      setError(`Unable to initialize map: ${errorMessage}`)
      setIsLoading(false)
      return
    }

    map.current.on('load', () => {
      console.log('🎉 Map load event fired!')
      if (!map.current) return
      
      // Hide loading immediately when map loads, don't wait for all layers
      setIsLoading(false)
      setMapReady(true)

      const m = map.current
      const finalBearing = (m.getBearing() + 25 + Math.random() * 20) % 360
      const finalPitch = Math.min(75, 45 + Math.random() * 20)

      try {
        m.flyTo({
          center: [longitude, latitude],
          zoom: targetZoom,
          bearing: finalBearing,
          pitch: finalPitch,
          padding: { top: 40, bottom: 40, left: 40, right: 40 },
          speed: 0.65,
          curve: 1.5,
          easing: (t) => 1 - Math.pow(1 - t, 2.2),
          essential: true,
        })
      } catch (flyErr) {
        console.warn('⚠️ FlyTo animation unavailable, using easeTo fallback', flyErr)
        m.easeTo({
          center: [longitude, latitude],
          zoom: targetZoom,
          bearing: finalBearing,
          pitch: finalPitch,
          padding: { top: 40, bottom: 40, left: 40, right: 40 },
          duration: 1700,
          easing: (t) => t * (2 - t),
        })
      }

      // Add 3D terrain (use current DEM tileset). If it fails, continue without terrain.
      try {
        map.current.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        })

        map.current.setTerrain({
          source: 'mapbox-dem',
          exaggeration: 1.5, // Make terrain more dramatic
        })
      } catch (demErr) {
        console.warn('⚠️ DEM/terrain unavailable, continuing without 3D terrain', demErr)
      }

      // Add sky layer for atmosphere
      try {
        map.current.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 0.0],
            'sky-atmosphere-sun-intensity': 15,
          },
        })
      } catch (skyErr) {
        console.warn('⚠️ Sky layer failed to add', skyErr)
      }

      // Add shaking radius circles for earthquakes
      if (type === 'earthquake' && showShakingRadius && shakingRadius) {
        try {
          addShakingRadiusCircles(shakingRadius)
        } catch (err) {
          console.warn('⚠️ Failed to add shaking radius circles:', err)
        }
      }

      // Add tsunami ripples
      if (type === 'tsunami' && showTsunamiRipples) {
        try {
          addTsunamiRipples()
        } catch (err) {
          console.warn('⚠️ Failed to add tsunami ripples:', err)
        }
      }

      // Add epicenter marker
      try {
        addEpicenterMarker()
        addContextAnnotation()
      } catch (err) {
        console.warn('⚠️ Failed to add epicenter marker or context label:', err)
      }

      // Add depth shaft for earthquakes
      if (type === 'earthquake' && showDepthShaft && depth > 0) {
        try {
          addDepthShaft()
        } catch (err) {
          console.warn('⚠️ Failed to add depth shaft:', err)
        }
      }

      // Subtle one-time camera motion (wow effect)
      if (!hasAnimatedRef.current && map.current) {
        hasAnimatedRef.current = true
        try {
          const m = map.current as mapboxgl.Map
          const baseZoom = m.getZoom()
          m.easeTo({
            zoom: baseZoom + 0.5,
            pitch: Math.min(75, m.getPitch() + 5),
            bearing: m.getBearing() + 7,
            duration: 1200,
            essential: true,
          })
        } catch (e) {
          console.warn('⚠️ Camera animation skipped', e)
        }
      }

      console.log('✅ All map layers and features added successfully')
    })

    // Cleanup function - properly scoped
    const cleanup = () => {
      if (map.current) {
        console.log('🧹 Cleaning up map instance')
        map.current.remove()
        map.current = null
        isInitializedRef.current = false
      }
    }

    return cleanup
    // Only re-initialize if core location/token changes, not on every prop change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken, latitude, longitude])

  const addEpicenterMarker = () => {
    if (!map.current) return

    const color = type === 'earthquake' ? getMagnitudeColor(magnitude) : '#3b82f6' // blue for tsunami

    // Create pulsing marker
    const el = document.createElement('div')
    el.className = 'epicenter-marker'
    el.style.cssText = `
      width: ${Math.max(20, magnitude * 4)}px;
      height: ${Math.max(20, magnitude * 4)}px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 20px ${color}, 0 0 40px ${color}80;
      animation: pulse 2s ease-in-out infinite;
    `

    // Add pulsing animation
    if (!document.getElementById('marker-pulse-style')) {
      const style = document.createElement('style')
      style.id = 'marker-pulse-style'
      style.textContent = `
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      `
      document.head.appendChild(style)
    }

    new mapboxgl.Marker(el)
      .setLngLat([longitude, latitude])
      .addTo(map.current)
  }

  const addContextAnnotation = () => {
    if (!map.current) return

    const contextText = buildContextSummary()
    setContextSummary(contextText)

    const labelEl = document.createElement('div')
    labelEl.className = 'map-context-label'
    labelEl.style.cssText = `
      background: rgba(15, 23, 42, 0.72);
      color: white;
      border-radius: 14px;
      padding: 10px 16px;
      font-size: 12px;
      line-height: 1.4;
      max-width: 220px;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.35);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(148, 163, 184, 0.35);
    `
    labelEl.innerHTML = contextText.replace(/\n/g, '<br />')

    const label = new mapboxgl.Marker({ element: labelEl, anchor: 'top-left' })
      .setLngLat([longitude + 1.2, latitude + 0.5])
      .addTo(map.current)

    map.current.once('idle', () => {
      const bounds = new mapboxgl.LngLatBounds()
      bounds.extend([longitude, latitude])
      bounds.extend([longitude + 2.5, latitude + 1.4])
      map.current?.fitBounds(bounds, {
        padding: { top: 36, bottom: 48, left: 36, right: 36 },
        duration: 1200,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      })
    })
  }

  const addDepthShaft = () => {
    if (!map.current) return

    const sourceId = 'depth-shaft'
    const layerId = 'depth-shaft-layer'

    // Check if source already exists
    if (map.current.getSource(sourceId)) {
      console.log('⚠️ Depth shaft already exists, skipping')
      return
    }

    // Add 3D line from surface to hypocenter
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {
          depth: depth,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [longitude, latitude, depth * 1000], // Hypocenter (underground)
            [longitude, latitude, 0], // Surface
          ],
        },
      },
    })

    map.current.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': getDepthColor(depth),
        'line-width': 4,
        'line-opacity': 0.8,
      },
    })
  }

  const addShakingRadiusCircles = (radius: { strong: number; moderate: number; light: number; weak: number }) => {
    if (!map.current) return

    const circles = [
      { radius: radius.strong, color: '#dc2626', opacity: 0.15 },
      { radius: radius.moderate, color: '#ea580c', opacity: 0.1 },
      { radius: radius.light, color: '#f59e0b', opacity: 0.08 },
    ]

    circles.forEach((circle, index) => {
      const sourceId = `circle-${index}`
      
      // Skip if source already exists
      if (map.current!.getSource(sourceId)) {
        console.log(`⚠️ Circle source ${sourceId} already exists, skipping`)
        return
      }

      map.current!.addSource(sourceId, {
        type: 'geojson',
        data: createGeoJSONCircle([longitude, latitude], circle.radius),
      })

      map.current!.addLayer({
        id: `circle-fill-${index}`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': circle.color,
          'fill-opacity': circle.opacity,
        },
      })

      map.current!.addLayer({
        id: `circle-outline-${index}`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': circle.color,
          'line-width': 2,
          'line-opacity': 0.4,
        },
      })
    })
  }

  const addTsunamiRipples = () => {
    if (!map.current) return

    // Add animated ripple effect
    const ripples = [50, 100, 150, 200] // km radius

    ripples.forEach((radius, index) => {
      const sourceId = `ripple-${index}`
      
      setTimeout(() => {
        if (!map.current) return
        
        // Skip if source already exists
        if (map.current.getSource(sourceId)) {
          console.log(`⚠️ Ripple source ${sourceId} already exists, skipping`)
          return
        }
        
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: createGeoJSONCircle([longitude, latitude], radius),
        })

        map.current.addLayer({
          id: `ripple-${index}`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#3b82f6',
            'line-width': 3,
            'line-opacity': 1 - index * 0.2,
          },
        })

        // Animate opacity
        animateRipple(`ripple-${index}`)
      }, index * 300)
    })
  }

  const animateRipple = (layerId: string) => {
    let opacity = 1
    const interval = setInterval(() => {
      if (!map.current || !map.current.getLayer(layerId)) {
        clearInterval(interval)
        return
      }
      opacity -= 0.02
      if (opacity <= 0) {
        clearInterval(interval)
        return
      }
      map.current.setPaintProperty(layerId, 'line-opacity', opacity)
    }, 50)
  }

  return (
    <div className="relative w-full h-[250px] rounded-t-lg overflow-hidden bg-slate-100">
      <div ref={mapContainer} className="w-full h-full" />
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white p-4">
          <div className="text-6xl mb-3">🗺️</div>
          <div className="text-sm font-medium mb-1">Map Unavailable</div>
          <div className="text-xs text-slate-300 text-center max-w-xs">{error}</div>
          <div className="mt-3 text-xs text-slate-400">
            Location: {latitude.toFixed(2)}°, {longitude.toFixed(2)}°
          </div>
        </div>
      )}
      
      {isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2" />
          <div className="text-xs text-slate-600">Loading map...</div>
        </div>
      )}

      {mapReady && contextSummary && (
        <div className="absolute bottom-3 left-3 max-w-[250px] rounded-xl bg-white/85 text-slate-900 p-3 text-xs shadow-lg border border-slate-200">
          <div className="font-semibold text-slate-800 mb-1">Regional context</div>
          <div className="leading-relaxed whitespace-pre-line">{contextSummary}</div>
        </div>
      )}
    </div>
  )
}

const buildContextSummary = (options?: {
  latitude?: number
  longitude?: number
  locationLabel?: string
}): string => {
  const lat = options?.latitude ?? 0
  const lng = options?.longitude ?? 0
  const label = options?.locationLabel ?? 'Event location'

  const latText = formatCoordinate(lat, 'N', 'S')
  const lngText = formatCoordinate(lng, 'E', 'W')
  const hemisphere = `${lat >= 0 ? 'Northern' : 'Southern'} • ${lng >= 0 ? 'Eastern' : 'Western'} Hemisphere`

  return `${label}\n${latText}, ${lngText}\n${hemisphere}`
}

const formatCoordinate = (value: number, positiveSuffix: string, negativeSuffix: string) => {
  const abs = Math.abs(value)
  const degrees = Math.floor(abs)
  const minutesFloat = (abs - degrees) * 60
  const minutes = Math.floor(minutesFloat)
  const seconds = Math.round((minutesFloat - minutes) * 60)
  const suffix = value >= 0 ? positiveSuffix : negativeSuffix

  return `${degrees.toString().padStart(2, '0')}°${minutes.toString().padStart(2, '0')}'${seconds
    .toString()
    .padStart(2, '0')}" ${suffix}`
}

// Helper function to create GeoJSON circle
const createGeoJSONCircle = (center: [number, number], radiusInKm: number, points: number = 64) => {
  const coords = {
    latitude: center[1],
    longitude: center[0],
  }

  const km = radiusInKm
  const ret: [number, number][] = []
  const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180))
  const distanceY = km / 110.574

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI)
    const x = distanceX * Math.cos(theta)
    const y = distanceY * Math.sin(theta)

    ret.push([coords.longitude + x, coords.latitude + y])
  }
  ret.push(ret[0])

  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Polygon' as const,
      coordinates: [ret],
    },
  }
}
