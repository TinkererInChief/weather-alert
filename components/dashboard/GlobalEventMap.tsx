'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Layers, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

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
  const mapRef = useRef<HTMLDivElement>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventMarker | null>(null)
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets')
  const [showHeatmap, setShowHeatmap] = useState(false)

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
    return Math.max(20, magnitude * 5)
  }

  return (
    <div className="relative bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setMapStyle(mapStyle === 'streets' ? 'satellite' : 'streets')}
          className="p-2 bg-white rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          title="Toggle map style"
        >
          <Layers className="h-4 w-4 text-slate-700" />
        </button>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`p-2 rounded-lg shadow-lg border border-slate-200 transition-colors ${
            showHeatmap ? 'bg-blue-500 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
          }`}
          title="Toggle heatmap"
        >
          <MapPin className="h-4 w-4" />
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

      {/* Map Container */}
      <div 
        ref={mapRef}
        className="relative w-full bg-slate-100"
        style={{ height }}
      >
        {/* Simplified map visualization using CSS */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-green-50">
          <svg className="w-full h-full">
            {/* Grid lines for map effect */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Event markers */}
            {events.map((event, idx) => {
              // Distribute events across the map (simplified positioning)
              const x = ((event.lng + 180) / 360) * 100
              const y = ((90 - event.lat) / 180) * 100
              const size = getEventSize(event)
              const color = getEventColor(event)

              return (
                <g key={event.id}>
                  {/* Pulse effect */}
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r={size}
                    fill={color}
                    opacity="0.2"
                    className="animate-ping"
                  />
                  {/* Main marker */}
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r={size / 2}
                    fill={color}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedEvent(event)}
                  />
                  {/* Label */}
                  <text
                    x={`${x}%`}
                    y={`${y}%`}
                    dy="-20"
                    textAnchor="middle"
                    className="text-xs font-semibold fill-slate-900 pointer-events-none"
                  >
                    M{event.magnitude?.toFixed(1) || event.severity}
                  </text>
                </g>
              )
            })}

            {/* Contact markers (smaller blue dots) */}
            {contacts.map((contact, idx) => {
              const x = ((contact.longitude + 180) / 360) * 100
              const y = ((90 - contact.latitude) / 180) * 100

              return (
                <circle
                  key={`contact-${idx}`}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="3"
                  fill="#3b82f6"
                  opacity="0.6"
                />
              )
            })}
          </svg>
        </div>

        {/* Pro tip for real implementation */}
        <div className="absolute bottom-2 right-2 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded">
          Pro: Use Mapbox GL for production
        </div>
      </div>

      {/* Event Details Popup */}
      {selectedEvent && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 min-w-[300px]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-slate-900">{selectedEvent.title}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(selectedEvent.timestamp).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {selectedEvent.magnitude && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Magnitude</span>
                <span className="font-semibold text-slate-900">{selectedEvent.magnitude.toFixed(1)}</span>
              </div>
            )}
            {selectedEvent.severity && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Severity</span>
                <span className="font-semibold text-slate-900">Level {selectedEvent.severity}</span>
              </div>
            )}
            {selectedEvent.contactsAffected !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Contacts Affected</span>
                <span className="font-semibold text-blue-600">{selectedEvent.contactsAffected}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Location</span>
              <span className="font-mono text-xs text-slate-700">
                {selectedEvent.lat.toFixed(2)}, {selectedEvent.lng.toFixed(2)}
              </span>
            </div>
          </div>

          <button className="mt-4 w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
            View Full Details
          </button>
        </div>
      )}
    </div>
  )
}
