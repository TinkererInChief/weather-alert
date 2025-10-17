'use client'

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Ship, AlertTriangle } from 'lucide-react'

const createVesselIcon = (hasAlert: boolean) => {
  const color = hasAlert ? '#ef4444' : '#3b82f6'
  const svgIcon = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" 
            fill="${color}" stroke="white" stroke-width="2"/>
      <path d="M12 8v8M8 12h8" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `
  return new L.DivIcon({
    html: `<div style="width: 24px; height: 24px;">${svgIcon}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
    className: 'vessel-marker'
  })
}

const eventIcon = new L.DivIcon({
  html: `<div style="width: 32px; height: 32px; background: #f97316; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: ''
})

type Vessel = {
  id: string
  mmsi: string
  name: string
  vesselType: string
  latitude: number | null
  longitude: number | null
  speed: number | null
  heading: number | null
  destination: string | null
  activeAlertCount: number
}

type VesselAlert = {
  id: string
  vessel: {
    mmsi: string
  }
  riskLevel: string
  distance: number | null
  vesselPosition: {
    latitude: number
    longitude: number
  } | null
}

type VesselMapProps = {
  vessels: Vessel[]
  alerts: VesselAlert[]
}

export default function VesselMap({ vessels, alerts }: VesselMapProps) {
  const vesselsWithPosition = vessels.filter(v => v.latitude && v.longitude)
  
  const center: [number, number] = vesselsWithPosition.length > 0
    ? [vesselsWithPosition[0].latitude!, vesselsWithPosition[0].longitude!]
    : [0, 0]
  
  const zoom = vesselsWithPosition.length > 0 ? 4 : 2
  
  const alertsByVessel = new Map(
    alerts.map(a => [a.vessel.mmsi, a])
  )
  
  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Vessel Markers */}
      {vesselsWithPosition.map((vessel) => {
        const alert = alertsByVessel.get(vessel.mmsi)
        const hasAlert = vessel.activeAlertCount > 0
        
        return (
          <Marker
            key={vessel.id}
            position={[vessel.latitude!, vessel.longitude!]}
            icon={createVesselIcon(hasAlert)}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <Ship className="h-4 w-4 text-blue-600" />
                  <strong className="text-sm">{vessel.name}</strong>
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <div>MMSI: {vessel.mmsi}</div>
                  <div>Type: {vessel.vesselType}</div>
                  {vessel.speed !== null && <div>Speed: {vessel.speed.toFixed(1)} knots</div>}
                  {vessel.heading !== null && <div>Heading: {vessel.heading.toFixed(0)}°</div>}
                  {vessel.destination && <div>Dest: {vessel.destination}</div>}
                  <div>Position: {vessel.latitude!.toFixed(4)}°, {vessel.longitude!.toFixed(4)}°</div>
                  
                  {hasAlert && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-1 text-orange-600 font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        {vessel.activeAlertCount} Active Alert{vessel.activeAlertCount > 1 ? 's' : ''}
                      </div>
                      {alert && (
                        <div className="mt-1 text-xs">
                          Risk: <span className="font-medium">{alert.riskLevel}</span>
                          {alert.distance && <div>Distance: {alert.distance.toFixed(0)} km</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
      
      {/* Alert Event Markers with Radius */}
      {alerts.filter(a => a.vesselPosition).map((alert) => (
        alert.vesselPosition && (
          <Circle
            key={`circle-${alert.id}`}
            center={[alert.vesselPosition.latitude, alert.vesselPosition.longitude]}
            radius={alert.distance ? alert.distance * 1000 : 50000}
            pathOptions={{
              color: alert.riskLevel === 'critical' ? '#ef4444' : 
                     alert.riskLevel === 'high' ? '#f97316' : 
                     '#eab308',
              fillColor: alert.riskLevel === 'critical' ? '#ef4444' : 
                        alert.riskLevel === 'high' ? '#f97316' : 
                        '#eab308',
              fillOpacity: 0.1,
              weight: 2,
              opacity: 0.3
            }}
          />
        )
      ))}
    </MapContainer>
  )
}
