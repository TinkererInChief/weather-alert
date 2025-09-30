'use client'

import { useState, useCallback } from 'react'
import { Map, Marker, Popup, NavigationControl, ScaleControl } from 'react-map-gl/mapbox'
import { MapPin, Layers } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'

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
  const [selectedEvent, setSelectedEvent] = useState<EventMarker | null>(null)
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'dark'>('streets')
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 1.5
  })

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  // Debug: Log token status (remove in production)
  if (typeof window !== 'undefined') {
    console.log('Mapbox Token Status:', mapboxToken ? 'Present ✅' : 'Missing ❌')
  }

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

  const getMapboxStyle = useCallback((style: 'streets' | 'satellite' | 'dark') => {
    switch (style) {
      case 'satellite':
        return 'mapbox://styles/mapbox/satellite-streets-v12'
      case 'dark':
        return 'mapbox://styles/mapbox/dark-v11'
      default:
        return 'mapbox://styles/mapbox/streets-v12'
    }
  }, [])

  if (!mapboxToken) {
    return (
      <div className="relative bg-white rounded-xl border border-slate-200 p-8 text-center" style={{ height }}>
        <div className="flex flex-col items-center justify-center h-full">
          <MapPin className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Mapbox Token Missing</h3>
          <p className="text-sm text-slate-600 max-w-md">
            Please add your Mapbox access token to <code className="px-2 py-1 bg-slate-100 rounded text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> in your environment variables.
          </p>
          <a
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Get Mapbox Token →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => {
            const styles: Array<'streets' | 'satellite' | 'dark'> = ['streets', 'satellite', 'dark']
            const currentIndex = styles.indexOf(mapStyle)
            const nextIndex = (currentIndex + 1) % styles.length
            setMapStyle(styles[nextIndex])
          }}
          className="p-2 bg-white rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          title={`Current: ${mapStyle} (click to cycle)`}
        >
          <Layers className="h-4 w-4 text-slate-700" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg border border-slate-200 p-3">
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
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg border border-slate-200 p-3">
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

      {/* Mapbox Container */}
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={mapboxToken}
        mapStyle={getMapboxStyle(mapStyle)}
        style={{ width: '100%', height }}
        attributionControl={false}
      >
        {/* Navigation Controls */}
        <NavigationControl position="bottom-right" />
        <ScaleControl />

        {/* Event Markers */}
        {events.map((event) => {
          const size = getEventSize(event)
          const color = getEventColor(event)
          
          return (
            <Marker
              key={event.id}
              longitude={event.lng}
              latitude={event.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                setSelectedEvent(event)
              }}
            >
              <div className="relative cursor-pointer group">
                {/* Pulse effect */}
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{
                    backgroundColor: color,
                    opacity: 0.3,
                    width: size * 2,
                    height: size * 2,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                />
                {/* Main marker */}
                <div
                  className="relative rounded-full border-2 border-white shadow-lg group-hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: color,
                    width: size,
                    height: size
                  }}
                />
                {/* Magnitude label */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white px-2 py-0.5 rounded shadow-md text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  M{event.magnitude?.toFixed(1) || event.severity}
                </div>
              </div>
            </Marker>
          )
        })}

        {/* Contact Markers */}
        {contacts.map((contact, idx) => (
          <Marker
            key={`contact-${idx}`}
            longitude={contact.longitude}
            latitude={contact.latitude}
            anchor="center"
          >
            <div
              className="w-2 h-2 rounded-full bg-blue-500 opacity-60"
              title={contact.name}
            />
          </Marker>
        ))}

        {/* Popup for selected event */}
        {selectedEvent && (
          <Popup
            longitude={selectedEvent.lng}
            latitude={selectedEvent.lat}
            anchor="top"
            onClose={() => setSelectedEvent(null)}
            closeButton={true}
            closeOnClick={false}
            className="event-popup"
          >
            <div className="p-2 min-w-[250px]">
              <h3 className="font-semibold text-slate-900 mb-1">{selectedEvent.title}</h3>
              <div className="space-y-1 text-xs text-slate-600">
                <p>
                  <span className="font-medium">Magnitude:</span> {selectedEvent.magnitude?.toFixed(1) || 'N/A'}
                </p>
                <p>
                  <span className="font-medium">Time:</span>{' '}
                  {new Date(selectedEvent.timestamp).toLocaleString()}
                </p>
                {selectedEvent.contactsAffected !== undefined && (
                  <p>
                    <span className="font-medium">Contacts Notified:</span> {selectedEvent.contactsAffected}
                  </p>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
