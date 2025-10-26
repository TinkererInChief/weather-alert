'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L, { DivIcon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Ship, AlertTriangle } from 'lucide-react'
import { useEffect } from 'react'

// Vessel type colors
const getVesselColor = (type: string, hasAlert: boolean) => {
  if (hasAlert) return '#ef4444' // Red for alerts
  
  const colors: Record<string, string> = {
    cargo: '#3b82f6',        // Blue
    tanker: '#8b5cf6',       // Purple
    passenger: '#10b981',    // Green
    fishing: '#f59e0b',      // Amber
    tug: '#ec4899',          // Pink
    pleasure: '#14b8a6',     // Teal
    sailing: '#06b6d4',      // Cyan
    highspeed: '#f97316',    // Orange
    other: '#64748b'         // Slate
  }
  return colors[type] || colors.other
}

// Create arrow icon with rotation
const createVesselIcon = (heading: number | null, vesselType: string, hasAlert: boolean, isHighlighted: boolean = false) => {
  const color = getVesselColor(vesselType, hasAlert)
  const rotation = heading !== null ? heading : 0
  const size = isHighlighted ? 40 : 28
  const viewBox = isHighlighted ? 40 : 28
  const pathScale = isHighlighted ? 1.4 : 1
  const strokeWidth = isHighlighted ? 2.5 : 1.8
  const whiteStroke = isHighlighted ? 1.2 : 0.8
  
  const animation = isHighlighted
    ? `<animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />`
    : ''
  
  // Use simple triangle arrow pointing up, rotated by heading
  const svgIcon = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${viewBox} ${viewBox}" xmlns="http://www.w3.org/2000/svg" 
         style="transform: rotate(${rotation}deg); transform-origin: center; filter: drop-shadow(0 ${isHighlighted ? 4 : 2}px ${isHighlighted ? 8 : 4}px rgba(0,0,0,${isHighlighted ? 0.6 : 0.4}));">
      <path d="M${14 * pathScale} ${4 * pathScale} L${22 * pathScale} ${22 * pathScale} L${14 * pathScale} ${18 * pathScale} L${6 * pathScale} ${22 * pathScale} Z" 
            fill="${isHighlighted ? '#fbbf24' : color}" 
            stroke="#000" 
            stroke-width="${strokeWidth}"
            stroke-opacity="0.7">
        ${animation}
      </path>
      <path d="M${14 * pathScale} ${4 * pathScale} L${22 * pathScale} ${22 * pathScale} L${14 * pathScale} ${18 * pathScale} L${6 * pathScale} ${22 * pathScale} Z" 
            fill="none" 
            stroke="white" 
            stroke-width="${whiteStroke}">
        ${animation}
      </path>
    </svg>
  `
  return new L.DivIcon({
    html: `<div style="width: ${size}px; height: ${size}px; z-index: ${isHighlighted ? 1000 : 'auto'};">${svgIcon}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    className: isHighlighted ? 'vessel-marker vessel-highlighted' : 'vessel-marker'
  })
}

// Auto-fit map bounds
function MapBounds({ vessels }: { vessels: Vessel[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (vessels.length > 0) {
      const validVessels = vessels.filter(v => v.latitude !== null && v.longitude !== null)
      if (validVessels.length > 0) {
        const bounds = L.latLngBounds(
          validVessels.map(v => [v.latitude as number, v.longitude as number] as [number, number])
        )
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 })
      }
    }
  }, [vessels.length])
  
  return null
}

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

type Bounds = { north: number; south: number; east: number; west: number }

type VesselMapProps = {
  vessels: Vessel[]
  alerts: VesselAlert[]
  onBoundsChange?: (bounds: Bounds) => void
  highlightedVesselId?: string | null
}

function BoundsListener({ onChange }: { onChange?: (bounds: Bounds) => void }) {
  const map = useMap()
  useEffect(() => {
    if (!onChange) return
    const handler = () => {
      const b = map.getBounds()
      onChange({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() })
    }
    handler()
    map.on('moveend', handler)
    map.on('zoomend', handler)
    return () => {
      map.off('moveend', handler)
      map.off('zoomend', handler)
    }
  }, [map, onChange])
  return null
}

function HighlightHandler({ vessels, highlightedId }: { vessels: Vessel[], highlightedId: string | null | undefined }) {
  const map = useMap()
  
  useEffect(() => {
    if (!highlightedId) return
    const vessel = vessels.find(v => v.id === highlightedId)
    if (vessel && vessel.latitude && vessel.longitude) {
      map.flyTo([vessel.latitude, vessel.longitude], 10, { duration: 1 })
    }
  }, [highlightedId, vessels, map])
  
  return null
}

export default function VesselMap({ vessels, alerts, onBoundsChange, highlightedVesselId }: VesselMapProps) {
  const vesselsWithPosition = vessels.filter(v => v.latitude !== null && v.longitude !== null)
  
  // Default center (Atlantic Ocean)
  const center: [number, number] = [25, -12]
  const zoom = 4
  
  const alertsByVessel = new Map(
    alerts.map(a => [a.vessel.mmsi, a])
  )
  
  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      preferCanvas={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        updateWhenZooming={false}
        updateWhenIdle={true}
      />
      <BoundsListener onChange={onBoundsChange} />
      <HighlightHandler vessels={vesselsWithPosition} highlightedId={highlightedVesselId} />
      
      <MapBounds vessels={vesselsWithPosition} />
      
      {/* Clustered Vessel Markers */}
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={60}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
        zoomToBoundsOnClick={true}
        iconCreateFunction={(cluster: any) => {
          const count = cluster.getChildCount()
          let size = 'small'
          let sizeClass = ''
          
          if (count > 100) {
            size = 'large'
            sizeClass = 'w-14 h-14 text-base'
          } else if (count > 10) {
            size = 'medium'
            sizeClass = 'w-12 h-12 text-sm'
          } else {
            sizeClass = 'w-10 h-10 text-xs'
          }
          
          return new DivIcon({
            html: `<div class="${sizeClass} rounded-full bg-blue-600 text-white font-bold flex items-center justify-center border-3 border-white shadow-xl" style="box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -1px rgba(0,0,0,0.2);">${count}</div>`,
            className: 'vessel-cluster',
            iconSize: [50, 50]
          })
        }}
      >
        {vesselsWithPosition.map((vessel) => {
          const hasAlert = vessel.activeAlertCount > 0
          const alert = alertsByVessel.get(vessel.mmsi)
          const isHighlighted = vessel.id === highlightedVesselId
          
          return (
            <Marker
              key={vessel.id}
              position={[vessel.latitude!, vessel.longitude!]}
              icon={createVesselIcon(vessel.heading, vessel.vesselType, hasAlert, isHighlighted)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getVesselColor(vessel.vesselType, hasAlert) }}
                    />
                    <strong className="text-sm">{vessel.name}</strong>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600">
                    <div>MMSI: <span className="font-mono">{vessel.mmsi}</span></div>
                    <div>Type: <span className="capitalize">{vessel.vesselType}</span></div>
                    {vessel.speed !== null && <div>Speed: {vessel.speed.toFixed(1)} kn</div>}
                    {vessel.heading !== null && <div>Heading: {vessel.heading.toFixed(0)}°</div>}
                    {vessel.destination && <div>Dest: {vessel.destination}</div>}
                    <div className="text-[10px] text-slate-500">
                      {vessel.latitude!.toFixed(4)}°, {vessel.longitude!.toFixed(4)}°
                    </div>
                    
                    {hasAlert && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <div className="flex items-center gap-1 text-red-600 font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          {vessel.activeAlertCount} Alert{vessel.activeAlertCount > 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MarkerClusterGroup>
    </MapContainer>
  )
}
