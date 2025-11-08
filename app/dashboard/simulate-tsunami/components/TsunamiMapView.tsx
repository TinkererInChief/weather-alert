'use client'

import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { LatLngExpression, Icon, divIcon } from 'leaflet'
import { useEffect } from 'react'
import { Scenario, VesselMarker } from '../types'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in React Leaflet
import L from 'leaflet'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png'
})

type TsunamiMapViewProps = {
  selectedScenario: Scenario | null
  vessels: VesselMarker[]
  showWaves: boolean
  waveRadius: number
}

// Component to update map view when scenario changes
function MapUpdater({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap()
  
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1 })
  }, [center, zoom, map])
  
  return null
}

// Severity color mapping
const getSeverityColor = (severity?: string) => {
  switch (severity) {
    case 'critical': return '#ef4444'  // red
    case 'high': return '#f59e0b'      // amber
    case 'moderate': return '#eab308'  // yellow
    case 'low': return '#10b981'       // green
    default: return '#64748b'          // slate
  }
}

// Create custom vessel marker
const createVesselIcon = (severity?: string) => {
  const color = getSeverityColor(severity)
  return divIcon({
    html: `
      <div style="
        background: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        cursor: pointer;
        position: relative;
        z-index: 1000;
        ${severity === 'critical' ? 'animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;' : ''}
      ">
        🚢
      </div>
    `,
    className: 'custom-vessel-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  })
}

// Create epicenter marker
const createEpicenterIcon = () => {
  return divIcon({
    html: `
      <div style="
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6));
      ">
        ⭐
      </div>
    `,
    className: 'custom-epicenter-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  })
}

export function TsunamiMapView({ selectedScenario, vessels, showWaves, waveRadius }: TsunamiMapViewProps) {
  const defaultCenter: LatLngExpression = [20, 0]
  const defaultZoom = 4

  const mapCenter: LatLngExpression = selectedScenario 
    ? [selectedScenario.epicenter.lat, selectedScenario.epicenter.lon]
    : defaultCenter

  const mapZoom = selectedScenario ? 6 : defaultZoom

  // Debug logging
  useEffect(() => {
    console.log('🗺️ TsunamiMapView rendering with vessels:', vessels.length)
    vessels.forEach(v => {
      console.log(`  - ${v.name}: ${v.position.lat}, ${v.position.lon}`)
    })
  }, [vessels])

  return (
    <div className="absolute inset-0 z-10">
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
        .custom-vessel-marker,
        .custom-epicenter-marker {
          background: transparent !important;
          border: none !important;
        }
        .custom-vessel-marker {
          z-index: 1000 !important;
        }
        .leaflet-container {
          background: #0f172a;
        }
        .leaflet-marker-icon {
          z-index: 1000 !important;
        }
        .leaflet-marker-pane {
          z-index: 600 !important;
        }
      `}</style>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <MapUpdater center={mapCenter} zoom={mapZoom} />

        {/* Epicenter Marker */}
        {selectedScenario && (
          <>
            <Marker
              position={[selectedScenario.epicenter.lat, selectedScenario.epicenter.lon]}
              icon={createEpicenterIcon()}
            >
              <Popup>
                <div className="p-2">
                  <div className="font-bold text-lg">Tsunami Epicenter</div>
                  <div className="text-sm text-slate-600 mt-1">
                    {selectedScenario.epicenter.lat.toFixed(2)}°N, {Math.abs(selectedScenario.epicenter.lon).toFixed(2)}°
                    {selectedScenario.epicenter.lon >= 0 ? 'E' : 'W'}
                  </div>
                  <div className="text-sm text-slate-600">
                    Magnitude: {selectedScenario.magnitude.toFixed(1)}
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* Tsunami Wave Circles */}
            {showWaves && (
              <>
                <Circle
                  center={[selectedScenario.epicenter.lat, selectedScenario.epicenter.lon]}
                  radius={waveRadius * 1000}
                  pathOptions={{
                    color: '#06b6d4',
                    fillColor: '#06b6d4',
                    fillOpacity: 0.1,
                    weight: 2,
                    opacity: 0.6
                  }}
                />
                <Circle
                  center={[selectedScenario.epicenter.lat, selectedScenario.epicenter.lon]}
                  radius={waveRadius * 500}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.15,
                    weight: 2,
                    opacity: 0.7
                  }}
                />
              </>
            )}
          </>
        )}

        {/* Vessel Markers */}
        {vessels.map((vessel) => (
          <Marker
            key={vessel.id}
            position={[vessel.position.lat, vessel.position.lon]}
            icon={createVesselIcon(vessel.severity)}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="font-bold text-base">{vessel.name}</div>
                <div className="text-xs text-slate-600 mb-2">MMSI: {vessel.mmsi}</div>
                
                {vessel.distance !== undefined && (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Distance:</span>
                      <span className="font-semibold">{vessel.distance} km</span>
                    </div>
                    {vessel.waveHeight !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Wave Height:</span>
                        <span className="font-semibold">{vessel.waveHeight.toFixed(2)} m</span>
                      </div>
                    )}
                    {vessel.eta !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">ETA:</span>
                        <span className="font-semibold">{vessel.eta} min</span>
                      </div>
                    )}
                    {vessel.severity && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Severity:</span>
                        <span
                          className="font-semibold uppercase text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: getSeverityColor(vessel.severity) + '20',
                            color: getSeverityColor(vessel.severity)
                          }}
                        >
                          {vessel.severity}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
