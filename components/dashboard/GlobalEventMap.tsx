'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, ScaleControl, CircleMarker } from 'react-leaflet'
import { MapPin, Layers } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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
}

export default function GlobalEventMap({ events, contacts = [], height = '500px' }: GlobalEventMapProps) {
  const [mapStyle, setMapStyle] = useState<'satellite' | 'streets' | 'topo'>('satellite')
  const [mounted, setMounted] = useState(false)
  const [legendVisible, setLegendVisible] = useState(true)
  const [hoveredEvent, setHoveredEvent] = useState<EventMarker | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; placement: 'above' | 'below' } | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

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

  // ESC key to dismiss tooltip
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHoveredEvent(null)
        setTooltipPosition(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude >= 7) return '#dc2626' // red-600 (M7.0+)
    if (magnitude >= 6) return '#ea580c' // orange-600 (M6.0-6.9)
    if (magnitude >= 5) return '#f59e0b' // amber-500 (M5.0-5.9)
    return '#84cc16' // lime-500 (M3.0-4.9 and below)
  }

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return '#dc2626'
    if (severity >= 3) return '#ea580c'
    if (severity >= 2) return '#f59e0b'
    return '#3b82f6'
  }

  const getEventColor = (event: EventMarker) => {
    if (event.type === 'earthquake' && event.magnitude) {
      return getMagnitudeColor(event.magnitude)
    }
    if (event.type === 'tsunami' && event.severity) {
      return getSeverityColor(event.severity)
    }
    return '#6b7280'
  }

  const getEventSize = (event: EventMarker) => {
    const magnitude = event.magnitude || event.severity || 4
    return Math.max(8, magnitude * 2.5)
  }

  const getEventOpacity = (timestamp: string) => {
    const eventTime = new Date(timestamp).getTime()
    const now = Date.now()
    const hoursSince = (now - eventTime) / (1000 * 60 * 60)
    
    if (hoursSince < 24) return 1.0 // Last 24 hours - full opacity
    if (hoursSince < 168) return 0.7 // 1-7 days - 70% opacity
    return 0.4 // 7-30 days - 40% opacity
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

  return (
    <div ref={wrapperRef} className="relative bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
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
            <div className="text-xl font-bold text-slate-900">{events.length}</div>
            <div className="text-xs text-slate-600">Events</div>
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
        style={{ width: '100%', height }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
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
              }
            }}
          >
            {/* Keep popup for mobile/touch devices */}
            <Popup>
              <div className="p-2 min-w-[280px]">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-2xl">{event.type === 'tsunami' ? '🌊' : '⚡'}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">{event.title}</h3>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                      event.type === 'earthquake' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {event.type === 'earthquake' ? 'Earthquake' : 'Tsunami'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600">
                  {event.magnitude && (
                    <p className="flex justify-between">
                      <span className="font-medium">Magnitude:</span>
                      <span className="font-semibold">{event.magnitude.toFixed(1)}</span>
                    </p>
                  )}
                  {event.severity && (
                    <p className="flex justify-between">
                      <span className="font-medium">Severity:</span>
                      <span className="font-semibold">Level {event.severity}</span>
                    </p>
                  )}
                  <p className="flex justify-between">
                    <span className="font-medium">Time:</span>
                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-medium">Location:</span>
                    <span>{event.lat.toFixed(2)}°, {event.lng.toFixed(2)}°</span>
                  </p>
                  {event.contactsAffected !== undefined && event.contactsAffected > 0 && (
                    <p className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="font-medium">Contacts Notified:</span>
                      <span className="font-semibold text-green-600">{event.contactsAffected}</span>
                    </p>
                  )}
                  <div className="pt-1 border-t border-slate-200">
                    <p className="font-medium mb-1">Data Sources:</p>
                    {event.sources && event.sources.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {event.sources.map((source, idx) => (
                          <span
                            key={idx}
                            className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              source === event.primarySource
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                            title={source === event.primarySource ? 'Primary Source' : ''}
                          >
                            {source}{source === event.primarySource ? ' ⭐' : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">
                        Source data not available (legacy event)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 pt-1">
                    {(() => {
                      const hoursSince = (Date.now() - new Date(event.timestamp).getTime()) / (1000 * 60 * 60)
                      if (hoursSince < 1) return '🔴 Just now'
                      if (hoursSince < 24) return `🔴 ${Math.floor(hoursSince)} hours ago`
                      if (hoursSince < 168) return `🟡 ${Math.floor(hoursSince / 24)} days ago`
                      return `⚪ ${Math.floor(hoursSince / 24)} days ago`
                    })()}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
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
            <Popup>
              <div className="text-xs">
                <strong>{contact.name}</strong>
              </div>
            </Popup>
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
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 p-3 min-w-[280px] max-w-[320px] relative">
            <div className="absolute top-2 right-2 text-[10px] text-slate-400 font-medium">
              ESC to close
            </div>
            <div className="flex items-start gap-2 mb-2">
              <span className="text-2xl">{hoveredEvent.type === 'tsunami' ? '🌊' : '⚡'}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 text-sm mb-1">{hoveredEvent.title}</h3>
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                  hoveredEvent.type === 'earthquake' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {hoveredEvent.type === 'earthquake' ? 'Earthquake' : 'Tsunami'}
                </span>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-slate-600">
              {hoveredEvent.magnitude && (
                <p className="flex justify-between">
                  <span className="font-medium">Magnitude:</span>
                  <span className="font-semibold text-slate-900">{hoveredEvent.magnitude.toFixed(1)}</span>
                </p>
              )}
              {hoveredEvent.severity && (
                <p className="flex justify-between">
                  <span className="font-medium">Severity:</span>
                  <span className="font-semibold text-slate-900">Level {hoveredEvent.severity}</span>
                </p>
              )}
              <p className="flex justify-between">
                <span className="font-medium">Time:</span>
                <span className="text-slate-900">{new Date(hoveredEvent.timestamp).toLocaleString()}</span>
              </p>
              {hoveredEvent.contactsAffected !== undefined && (
                <p className="flex justify-between">
                  <span className="font-medium">Contacts Notified:</span>
                  <span className="font-semibold text-blue-600">{hoveredEvent.contactsAffected}</span>
                </p>
              )}
              {hoveredEvent.sources && hoveredEvent.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="font-medium mb-1">Data Sources:</p>
                  <div className="flex flex-wrap gap-1">
                    {hoveredEvent.sources.map((source, idx) => (
                      <span 
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          source === hoveredEvent.primarySource
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {source === hoveredEvent.primarySource && '⭐ '}
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-500 pt-1">
                {(() => {
                  const hoursSince = (Date.now() - new Date(hoveredEvent.timestamp).getTime()) / (1000 * 60 * 60)
                  if (hoursSince < 1) return '🔴 Just now'
                  if (hoursSince < 24) return `🔴 ${Math.floor(hoursSince)} hours ago`
                  if (hoursSince < 168) return `🟡 ${Math.floor(hoursSince / 24)} days ago`
                  return `⚪ ${Math.floor(hoursSince / 24)} days ago`
                })()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
