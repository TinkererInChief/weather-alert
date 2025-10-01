'use client'

import { useEffect, useState } from 'react'
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
}

type GlobalEventMapProps = {
  events: EventMarker[]
  contacts?: Array<{ latitude: number; longitude: number; name: string }>
  height?: string
}

export default function GlobalEventMap({ events, contacts = [], height = '500px' }: GlobalEventMapProps) {
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'terrain'>('streets')
  const [mounted, setMounted] = useState(false)

  // Fix for SSR - Leaflet needs window object
  useEffect(() => {
    setMounted(true)
  }, [])

  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude >= 7) return '#dc2626' // red-600
    if (magnitude >= 6) return '#ea580c' // orange-600
    if (magnitude >= 5) return '#f59e0b' // amber-500
    if (magnitude >= 4) return '#eab308' // yellow-500
    return '#84cc16' // lime-500
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

  const getTileLayer = () => {
    switch (mapStyle) {
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }
      case 'terrain':
        return {
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
        }
      default: // streets
        return {
          url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }
    }
  }

  const cycleMapStyle = () => {
    const styles: Array<'streets' | 'satellite' | 'terrain'> = ['streets', 'satellite', 'terrain']
    const currentIndex = styles.indexOf(mapStyle)
    const nextIndex = (currentIndex + 1) % styles.length
    setMapStyle(styles[nextIndex])
  }

  // Create custom divIcon for events
  const createEventIcon = (event: EventMarker) => {
    const size = getEventSize(event)
    const color = getEventColor(event)
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="relative cursor-pointer group">
          <div class="absolute inset-0 rounded-full animate-ping" style="
            background-color: ${color};
            opacity: 0.3;
            width: ${size * 2}px;
            height: ${size * 2}px;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          "></div>
          <div class="relative rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform" style="
            background-color: ${color};
            width: ${size}px;
            height: ${size}px;
          "></div>
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
    <div className="relative bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={cycleMapStyle}
          className="p-2 bg-white rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          title={`Current: ${mapStyle} (click to cycle)`}
        >
          <Layers className="h-4 w-4 text-slate-700" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg border border-slate-200 p-3">
        <h4 className="text-xs font-semibold text-slate-900 mb-2">Event Magnitude</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#84cc16' }} />
            <span className="text-slate-600">M 3.0-4.9</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
            <span className="text-slate-600">M 5.0-5.9</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ea580c' }} />
            <span className="text-slate-600">M 6.0-6.9</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dc2626' }} />
            <span className="text-slate-600">M 7.0+</span>
          </div>
        </div>
      </div>

      {/* Event Stats */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg border border-slate-200 p-3">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-slate-900">{events.length}</div>
            <div className="text-xs text-slate-500">Events</div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div className="text-lg font-bold text-slate-900">{contacts.length}</div>
            <div className="text-xs text-slate-500">Contacts</div>
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
          >
            <Popup>
              <div className="p-2 min-w-[250px]">
                <h3 className="font-semibold text-slate-900 mb-1">{event.title}</h3>
                <div className="space-y-1 text-xs text-slate-600">
                  <p>
                    <span className="font-medium">Magnitude:</span> {event.magnitude?.toFixed(1) || 'N/A'}
                  </p>
                  <p>
                    <span className="font-medium">Time:</span>{' '}
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                  {event.contactsAffected !== undefined && (
                    <p>
                      <span className="font-medium">Contacts Notified:</span> {event.contactsAffected}
                    </p>
                  )}
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
    </div>
  )
}
