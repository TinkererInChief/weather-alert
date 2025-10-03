'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, ZoomControl, ScaleControl, CircleMarker, useMap } from 'react-leaflet'
import { MapPin, Layers, Maximize2, Minimize2 } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getMagnitudeColor, getTsunamiColor, getEventOpacity as getOpacity, getEventSize as getSize } from '@/lib/utils/event-colors'

type EventMarker = {
  id: string
  lat: number
  lng: number
  type: 'earthquake' | 'tsunami'
  magnitude?: number
  severity?: number
  title: string
  timestamp: string
  contactsAffected?: number
  sources?: string[]  // Data sources (USGS, EMSC, JMA, etc.)
  primarySource?: string  // Primary data source
}

type GlobalEventMapProps = {
  events: EventMarker[]
  contacts?: Array<{ latitude: number; longitude: number; name: string }>
  height?: string
  totalCount?: number
}

export default function GlobalEventMap({ events, contacts = [], height = '500px', totalCount }: GlobalEventMapProps) {
  const [mapStyle, setMapStyle] = useState<'satellite' | 'streets' | 'topo'>('satellite')
  const [mounted, setMounted] = useState(false)
  const [legendVisible, setLegendVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hoveredEvent, setHoveredEvent] = useState<EventMarker | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; placement: 'above' | 'below' } | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const prevViewRef = useRef<{ center: L.LatLngExpression; zoom: number; size: { w: number; h: number } } | null>(null)

  // Fix for SSR - Leaflet needs window object
  useEffect(() => {
    setMounted(true)
  }, [])

  // After tooltip renders, re-clamp using actual tooltip size to avoid clipping
  useEffect(() => {
    if (!hoveredEvent || !tooltipPosition || !wrapperRef.current || !tooltipRef.current) return
    const W = wrapperRef.current.clientWidth
    const H = wrapperRef.current.clientHeight
    const w = tooltipRef.current.offsetWidth
    const h = tooltipRef.current.offsetHeight

    let { x, y, placement } = tooltipPosition

    const minX = w / 2 + 8
    const maxX = W - w / 2 - 8
    if (x < minX) x = minX
    if (x > maxX) x = maxX

    if (placement === 'above' && y - h - 10 < 0) {
      placement = 'below'
    } else if (placement === 'below' && y + 10 + h > H) {
      placement = 'above'
    }

    if (x !== tooltipPosition.x || y !== tooltipPosition.y || placement !== tooltipPosition.placement) {
      setTooltipPosition({ x, y, placement })
    }
  }, [hoveredEvent, tooltipPosition])

  // ESC key to dismiss tooltip or exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          setHoveredEvent(null)
          setTooltipPosition(null)
        }
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isFullscreen])

  // Binder to capture map instance from within MapContainer
  const MapInstanceBinder = () => {
    const map = useMap()
    useEffect(() => {
      mapRef.current = map
      // Ensure sizing is correct after mount
      setTimeout(() => map.invalidateSize(), 0)
    }, [map])
    return null
  }

  // Sync isFullscreen with native fullscreen and fix map size
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onFsChange = () => {
      const fsEl = (document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement) as Element | null
      setIsFullscreen(fsEl === wrapperRef.current)
      if (mapRef.current) {
        mapRef.current.invalidateSize()
        setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 300)
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange as any)
    document.addEventListener('mozfullscreenchange', onFsChange as any)
    document.addEventListener('MSFullscreenChange', onFsChange as any)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange as any)
      document.removeEventListener('mozfullscreenchange', onFsChange as any)
      document.removeEventListener('MSFullscreenChange', onFsChange as any)
    }
  }, [])

  // When entering/exiting fullscreen, lock body scroll and invalidate Leaflet size
  useEffect(() => {
    if (typeof window === 'undefined') return
    const el = document.documentElement
    if (isFullscreen) {
      el.style.overflow = 'hidden'
    } else {
      el.style.overflow = ''
    }

    // Invalidate size immediately and after transition to recalc tiles
    if (mapRef.current) {
      const m = mapRef.current
      m.invalidateSize()
      try { window.dispatchEvent(new Event('resize')) } catch {}
      const t = window.setTimeout(() => m.invalidateSize(), 350)
      // Adjust zoom to maintain approximate visual scale when toggling
      const t2 = window.setTimeout(() => {
        try {
          const map = mapRef.current
          if (!map) return
          const size = map.getSize()
          const newH = size.y
          const newW = size.x
          const prev = prevViewRef.current
          if (prev) {
            // Maintain approximate visual scale: use the larger dimension ratio
            const ratioH = newH / Math.max(1, prev.size.h)
            const ratioW = newW / Math.max(1, prev.size.w)
            const ratio = Math.max(ratioH, ratioW)
            // Each zoom level doubles scale => delta = log2(ratio)
            const delta = Math.log2(Math.max(0.5, Math.min(4, ratio)))
            const target = prev.zoom + delta
            const clamped = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), target))
            map.setView(map.getCenter(), clamped, { animate: false })
            // Extra reflow after zoom change
            setTimeout(() => { try { map.invalidateSize() } catch {} }, 50)
          }
        } catch {}
      }, 400)
      const t3 = window.setTimeout(() => {
        try { mapRef.current && mapRef.current.invalidateSize() } catch {}
      }, 800)
      return () => {
        window.clearTimeout(t)
        window.clearTimeout(t2)
        window.clearTimeout(t3)
      }
    }
  }, [isFullscreen])

  const getEventColor = (event: EventMarker) => {
    if (event.type === 'earthquake' && event.magnitude) {
      return getMagnitudeColor(event.magnitude)
    }
    if (event.type === 'tsunami') {
      return getTsunamiColor()
    }
    return '#6b7280'
  }

  const getEventSize = (event: EventMarker) => {
    return getSize(event.magnitude, event.severity)
  }

  const getEventOpacity = (timestamp: string) => {
    return getOpacity(timestamp)
  }

  const getTileLayer = () => {
    switch (mapStyle) {
      case 'streets':
        return {
          url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }
      case 'topo':
        return {
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
        }
    }
  }

  const cycleMapStyle = () => {
    const styles: Array<'streets' | 'satellite' | 'topo'> = ['streets', 'satellite', 'topo']
    const currentIndex = styles.indexOf(mapStyle)
    const nextIndex = (currentIndex + 1) % styles.length
    setMapStyle(styles[nextIndex])
  }

  // Create custom divIcon for events with time-based opacity
  const createEventIcon = (event: EventMarker) => {
    const size = getEventSize(event)
    const color = getEventColor(event)
    const opacity = getEventOpacity(event.timestamp)
    const isRecent = opacity === 1.0
    
    // Add icon based on event type
    const icon = event.type === 'tsunami' ? '🌊' : '⚡'
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="relative cursor-pointer group">
          ${isRecent ? `
          <div class="absolute inset-0 rounded-full animate-ping" style="
            background-color: ${color};
            opacity: 0.3;
            width: ${size * 2}px;
            height: ${size * 2}px;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          "></div>
          ` : ''}
          <div class="relative rounded-full border-2 border-white shadow-lg hover:scale-125 transition-all duration-200" style="
            background-color: ${color};
            opacity: ${opacity};
            width: ${size}px;
            height: ${size}px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${size * 0.5}px;
          ">
            <span style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">${icon}</span>
          </div>
          
        </div>
      `,
      iconSize: [size * 2, size * 2],
      iconAnchor: [size, size],
    })
  }

  if (!mounted) {
    return (
      <div className="relative bg-white rounded-xl border border-slate-200 p-8 text-center" style={{ height }}>
        <div className="flex flex-col items-center justify-center h-full">
          <MapPin className="h-12 w-12 text-slate-300 mb-4 animate-pulse" />
          <p className="text-sm text-slate-600">Loading map...</p>
        </div>
      </div>
    )
  }

  const tileLayer = getTileLayer()

  const requestFullscreen = () => {
    const el = wrapperRef.current as any
    if (!el) return
    // Store previous view before entering FS to restore/scale
    if (mapRef.current) {
      const m = mapRef.current
      const s = m.getSize()
      prevViewRef.current = { center: m.getCenter(), zoom: m.getZoom(), size: { w: s.x, h: s.y } }
    }
    if (el.requestFullscreen) el.requestFullscreen()
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen()
    else if (el.msRequestFullscreen) el.msRequestFullscreen()
    else setIsFullscreen(true) // fallback CSS-only
  }

  const exitFullscreen = () => {
    const d: any = document
    // Restore previous view after exiting FS
    const restore = () => {
      try {
        const prev = prevViewRef.current
        const map = mapRef.current
        if (prev && map) {
          map.setView(prev.center as L.LatLngExpression, prev.zoom, { animate: false })
          // clear stored
          prevViewRef.current = null
        }
      } catch {}
    }
    if (document.exitFullscreen) { document.exitFullscreen(); restore() }
    else if (d.webkitExitFullscreen) { d.webkitExitFullscreen(); restore() }
    else if (d.mozCancelFullScreen) { d.mozCancelFullScreen(); restore() }
    else if (d.msExitFullscreen) { d.msExitFullscreen(); restore() }
    else { setIsFullscreen(false); restore() }
  }

  const toggleFullscreen = () => {
    const next = !isFullscreen
    setIsFullscreen(next)
    // Close tooltip when toggling fullscreen
    setHoveredEvent(null)
    setTooltipPosition(null)
    // Best-effort native fullscreen; ignore failures
    try {
      if (next) requestFullscreen()
      else exitFullscreen()
    } catch {}
  }

  return (
    <div 
      ref={wrapperRef} 
      className={`relative bg-white border border-slate-200 overflow-hidden transition-all ${
        isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : 'rounded-xl'
      }`}
      style={{ height: isFullscreen ? '100dvh' : height, width: isFullscreen ? '100vw' : undefined }}
    >
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg shadow-lg border border-white/30 hover:bg-white/70 transition-colors"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
          title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Expand to fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4 text-slate-700" />
          ) : (
            <Maximize2 className="h-4 w-4 text-slate-700" />
          )}
        </button>
        <button
          onClick={cycleMapStyle}
          className="p-2 rounded-lg shadow-lg border border-white/30 hover:bg-white/70 transition-colors"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
          title={`Current: ${mapStyle} (click to cycle)`}
        >
          <Layers className="h-4 w-4 text-slate-700" />
        </button>
      </div>

      {/* Legend - Collapsible */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <button
          onClick={() => setLegendVisible(!legendVisible)}
          className="mb-2 px-3 py-2 rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50 transition-all text-xs font-semibold text-slate-900 bg-white"
        >
          {legendVisible ? '📖 Hide Legend' : '📖 Show Legend'}
        </button>
        
        {legendVisible && (
          <div className="rounded-lg shadow-lg border border-slate-200 p-3 max-w-xs bg-white">
            <h4 className="text-xs font-bold text-slate-900 mb-2">Event Types & Severity</h4>
        <div className="space-y-2">
          {/* Earthquake Magnitudes */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ backgroundColor: '#84cc16', fontSize: '8px' }}>⚡</div>
              <span className="text-slate-700">M 3.0-4.9 (Minor)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f59e0b', fontSize: '8px' }}>⚡</div>
              <span className="text-slate-700">M 5.0-5.9 (Moderate)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ea580c', fontSize: '8px' }}>⚡</div>
              <span className="text-slate-700">M 6.0-6.9 (Strong)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dc2626', fontSize: '8px' }}>⚡</div>
              <span className="text-slate-700">M 7.0+ (Major)</span>
            </div>
          </div>
          
          {/* Tsunami */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ backgroundColor: '#8b5cf6', fontSize: '8px' }}>🌊</div>
              <span className="text-slate-700">Tsunami Alert</span>
            </div>
          </div>
          
          {/* Time-based opacity */}
          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-600 font-medium mb-1">Recency:</p>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-slate-600" style={{ opacity: 1.0 }} />
              <span className="text-slate-700">&lt; 24h</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-slate-600" style={{ opacity: 0.7 }} />
              <span className="text-slate-700">1-7 days</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-slate-600" style={{ opacity: 0.4 }} />
              <span className="text-slate-700">7-30 days</span>
            </div>
          </div>
        </div>
          </div>
        )}
      </div>

      {/* Event Stats */}
      <div className="absolute top-4 left-4 z-[1000] rounded-lg shadow-lg border border-slate-200 p-3 bg-white">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-xl font-bold text-slate-900">{typeof totalCount === 'number' ? `${events.length} / ${totalCount}` : events.length}</div>
            <div className="text-xs text-slate-600">{typeof totalCount === 'number' ? 'Events (shown/all)' : 'Events'}</div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div className="text-xl font-bold text-slate-900">{contacts.length}</div>
            <div className="text-xs text-slate-600">Contacts</div>
          </div>
        </div>
      </div>

      {/* Leaflet Map Container */}
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <MapInstanceBinder />
        <TileLayer
          url={tileLayer.url}
          attribution={tileLayer.attribution}
        />
        
        <ZoomControl position="bottomright" />

        {/* Event Markers */}
        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.lat, event.lng]}
            icon={createEventIcon(event)}
            eventHandlers={{
              mouseover: (e) => {
                const marker = e.target
                const latLng = marker.getLatLng()
                const point = marker._map.latLngToContainerPoint(latLng)
                const mapContainer = marker._map.getContainer()
                const mapWidth = mapContainer.offsetWidth
                const mapHeight = mapContainer.offsetHeight
                
                // Smart positioning: adjust based on marker location
                // Tooltip is ~300px wide and ~200px tall
                const tooltipWidth = 300
                const tooltipHeight = 200
                
                let x = point.x
                let y = point.y
                let placement: 'above' | 'below' = 'above'
                
                // Adjust horizontal position if too close to edges
                if (x < tooltipWidth / 2 + 20) {
                  x = tooltipWidth / 2 + 20 // Left edge
                } else if (x > mapWidth - tooltipWidth / 2 - 20) {
                  x = mapWidth - tooltipWidth / 2 - 20 // Right edge
                }
                
                // Adjust vertical position if too close to top
                if (y < tooltipHeight + 30) {
                  placement = 'below' // Show below marker if near top
                }
                // If too close to bottom and placed below, force above
                if (placement === 'below' && (mapHeight - y) < tooltipHeight + 30) {
                  placement = 'above'
                }
                
                setHoveredEvent(event)
                setTooltipPosition({ x, y, placement })
              },
              mouseout: () => {
                setHoveredEvent(null)
                setTooltipPosition(null)
              },
              // Mobile/touch support: tap to toggle tooltip
              click: (e) => {
                const marker = e.target
                const latLng = marker.getLatLng()
                const point = marker._map.latLngToContainerPoint(latLng)
                const mapContainer = marker._map.getContainer()
                const mapWidth = mapContainer.offsetWidth
                const mapHeight = mapContainer.offsetHeight
                
                const tooltipWidth = 300
                const tooltipHeight = 200
                
                let x = point.x
                let y = point.y
                let placement: 'above' | 'below' = 'above'
                
                if (x < tooltipWidth / 2 + 20) {
                  x = tooltipWidth / 2 + 20
                } else if (x > mapWidth - tooltipWidth / 2 - 20) {
                  x = mapWidth - tooltipWidth / 2 - 20
                }
                
                if (y < tooltipHeight + 30) {
                  placement = 'below'
                }
                if (placement === 'below' && (mapHeight - y) < tooltipHeight + 30) {
                  placement = 'above'
                }
                
                // Toggle tooltip on click/tap (for touch devices)
                if (hoveredEvent?.id === event.id) {
                  setHoveredEvent(null)
                  setTooltipPosition(null)
                } else {
                  setHoveredEvent(event)
                  setTooltipPosition({ x, y, placement })
                }
              }
            }}
          />
        ))}

        {/* Contact Markers */}
        {contacts.map((contact, idx) => (
          <CircleMarker
            key={`contact-${idx}`}
            center={[contact.latitude, contact.longitude]}
            radius={3}
            pathOptions={{
              fillColor: '#3b82f6',
              fillOpacity: 0.6,
              color: '#3b82f6',
              weight: 1
            }}
          >
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Hover Tooltip */}
      {hoveredEvent && tooltipPosition && (
        <div 
          className="absolute z-[2000] pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: tooltipPosition.placement === 'below' ? `${tooltipPosition.y + 10}px` : `${tooltipPosition.y - 10}px`,
            transform: tooltipPosition.placement === 'below' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
          }}
        >
          <div className="bg-black/60 backdrop-blur-sm rounded-lg shadow-2xl border border-white/20 p-3 min-w-[280px] max-w-[320px] relative">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-2xl">{hoveredEvent.type === 'tsunami' ? '🌊' : '⚡'}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-sm mb-1">{hoveredEvent.title}</h3>
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                  hoveredEvent.type === 'earthquake' 
                    ? 'bg-orange-500/80 text-white' 
                    : 'bg-purple-500/80 text-white'
                }`}>
                  {hoveredEvent.type === 'earthquake' ? 'Earthquake' : 'Tsunami'}
                </span>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-white/90">
              {hoveredEvent.magnitude && (
                <p className="flex justify-between">
                  <span className="font-medium">Magnitude:</span>
                  <span className="font-semibold text-white">{hoveredEvent.magnitude.toFixed(1)}</span>
                </p>
              )}
              {hoveredEvent.severity && (
                <p className="flex justify-between">
                  <span className="font-medium">Severity:</span>
                  <span className="font-semibold text-white">Level {hoveredEvent.severity}</span>
                </p>
              )}
              <p className="flex justify-between">
                <span className="font-medium">Time:</span>
                <span className="text-white">{new Date(hoveredEvent.timestamp).toLocaleString()}</span>
              </p>
              {hoveredEvent.contactsAffected !== undefined && (
                <p className="flex justify-between">
                  <span className="font-medium">Contacts Notified:</span>
                  <span className="font-semibold text-blue-300">{hoveredEvent.contactsAffected}</span>
                </p>
              )}
              {hoveredEvent.sources && hoveredEvent.sources.length > 0 && (
                <div className="pt-2 border-t border-white/20">
                  <p className="font-medium mb-1 text-white">Data Sources:</p>
                  <div className="flex flex-wrap gap-1">
                    {hoveredEvent.sources.map((source, idx) => (
                      <span 
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          source === hoveredEvent.primarySource
                            ? 'bg-blue-500/80 text-white'
                            : 'bg-white/20 text-white'
                        }`}
                      >
                        {source === hoveredEvent.primarySource && '⭐ '}
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-white/70 pt-1">
                {(() => {
                  const hoursSince = (Date.now() - new Date(hoveredEvent.timestamp).getTime()) / (1000 * 60 * 60)
                  if (hoursSince < 1) return '⏰ Just now'
                  if (hoursSince < 24) return `⏰ ${Math.floor(hoursSince)} hours ago`
                  if (hoursSince < 168) return `🕐 ${Math.floor(hoursSince / 24)} days ago`
                  return `🕒 ${Math.floor(hoursSince / 24)} days ago`
                })()}
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-white/20 text-center">
              <span className="text-[10px] text-white/60 font-medium">Press ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
