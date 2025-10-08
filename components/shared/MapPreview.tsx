'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getMagnitudeColor, getDepthColor, getZoomLevel, calculateShakingRadius } from '@/lib/event-calculations'
import { EventType } from '@/types/event-hover'

// Set your Mapbox token
// For development, you can use a public token or get one free from mapbox.com
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'

mapboxgl.accessToken = MAPBOX_TOKEN

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
}: MapPreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return
    if (map.current) return // Initialize map only once

    // Calculate zoom based on magnitude
    const zoom = getZoomLevel(magnitude)

    // Initialize map with error handling
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: type === 'tsunami' ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/outdoors-v12',
        center: [longitude, latitude],
        zoom: zoom,
        pitch: 60, // 3D tilt
        bearing: -17.6, // Slight rotation
        projection: 'globe' as any,
        interactive: false, // Disable user interaction (static preview)
      })

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e)
        setError('Map failed to load. Please check your Mapbox token.')
        setIsLoading(false)
      })
    } catch (err) {
      console.error('Failed to initialize map:', err)
      setError('Unable to initialize map')
      setIsLoading(false)
      return
    }

    map.current.on('load', () => {
      if (!map.current) return

      // Add 3D terrain
      map.current.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.terrain-rgb',
        tileSize: 512,
        maxzoom: 14,
      })

      map.current.setTerrain({
        source: 'mapbox-dem',
        exaggeration: 1.5, // Make terrain more dramatic
      })

      // Add sky layer for atmosphere
      map.current.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      })

      // Add shaking radius circles for earthquakes
      if (type === 'earthquake' && showShakingRadius && shakingRadius) {
        addShakingRadiusCircles(shakingRadius)
      }

      // Add tsunami ripples
      if (type === 'tsunami' && showTsunamiRipples) {
        addTsunamiRipples()
      }

      // Add epicenter marker
      addEpicenterMarker()

      // Add depth shaft for earthquakes
      if (type === 'earthquake' && showDepthShaft && depth > 0) {
        addDepthShaft()
      }

      setIsLoading(false)
    })

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

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

  const addDepthShaft = () => {
    if (!map.current) return

    // Add 3D line from surface to hypocenter
    map.current.addSource('depth-shaft', {
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
      id: 'depth-shaft-layer',
      type: 'line',
      source: 'depth-shaft',
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
    <div className="relative w-full h-[300px] rounded-t-xl overflow-hidden bg-slate-100">
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
    </div>
  )
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
