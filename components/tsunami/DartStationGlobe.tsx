'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Globe as GlobeIcon, Activity, Wifi, WifiOff, RefreshCw, Clock } from 'lucide-react'

// Dynamically import Globe.gl to avoid SSR issues
const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
})

type DartStation = {
  id: string
  name: string
  lat: number
  lon: number
  status: 'online' | 'offline' | 'detecting'
  lastPing?: Date
}

type Props = {
  stations: DartStation[]
  onStationClick?: (station: DartStation) => void
  height?: number
  lastUpdated?: Date | null
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function DartStationGlobe({ 
  stations, 
  onStationClick, 
  height = 500,
  lastUpdated,
  onRefresh,
  isRefreshing = false
}: Props) {
  const globeEl = useRef<any>()
  const [selectedStation, setSelectedStation] = useState<DartStation | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [globeReady, setGlobeReady] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  useEffect(() => {
    if (globeEl.current) {
      // Small delay to ensure globe is mounted
      setTimeout(() => {
        if (globeEl.current) {
          // Auto-rotate - subtle rotation simulating Earth's movement
          globeEl.current.controls().autoRotate = true
          globeEl.current.controls().autoRotateSpeed = 0.3
          globeEl.current.controls().enableDamping = true
          globeEl.current.controls().dampingFactor = 0.05
          
          // Initial camera position
          globeEl.current.pointOfView({ altitude: 2.5 }, 0)
        }
      }, 100)
    }
  }, [isClient])
  
  // Prepare point data for globe with consistent color scheme
  const pointsData = stations.map(station => ({
    lat: station.lat,
    lng: station.lon,
    size: station.status === 'detecting' ? 1.5 : station.status === 'online' ? 1.2 : 0.9,
    color: station.status === 'detecting' ? '#FF9800' :  // Orange for detecting (alert!)
           station.status === 'online' ? '#10B981' :      // Green for online (active/healthy)
           '#9CA3AF',                                      // Gray for offline (inactive)
    station: station,
    altitude: 0.02
  }))
  
  // Log for debugging
  useEffect(() => {
    console.log(`DartStationGlobe: Rendering ${pointsData.length} stations`)
    console.log('Sample stations:', pointsData.slice(0, 3))
  }, [pointsData.length])
  
  const statusCounts = {
    online: stations.filter(s => s.status === 'online' || s.status === 'detecting').length,
    detecting: stations.filter(s => s.status === 'detecting').length,
    offline: stations.filter(s => s.status === 'offline').length
  }

  if (!isClient) {
    return (
      <div className="bg-slate-900 rounded-xl flex items-center justify-center" style={{ height }}>
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading 3D Globe...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-slate-900 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <GlobeIcon className="h-6 w-6 text-blue-400" />
            </motion.div>
            <div>
              <h3 className="text-white font-semibold">DART Network - Global View</h3>
              <p className="text-xs text-blue-300">{stations.length} Tsunami Detection Buoys</p>
              {lastUpdated && (
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Updated {new Date(lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white text-xs rounded-lg transition-colors"
              title="Refresh live data from NOAA"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Updating...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>
      
      {/* Globe */}
      <div style={{ height: `${height}px`, width: '100%', position: 'relative' }}>
        {!globeReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
              <p className="text-lg">Loading 3D Globe...</p>
              <p className="text-sm text-slate-400 mt-2">Fetching Earth textures</p>
            </div>
          </div>
        )}
        <Globe
          ref={globeEl}
          width={undefined}
          height={height}
          backgroundColor="#0f172a"
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
          
          onGlobeReady={() => setGlobeReady(true)}
          waitForGlobeReady={true}
          
          pointsData={pointsData}
          pointAltitude={0.02}
          pointRadius="size"
          pointColor="color"
          pointResolution={12}
          pointsMerge={false}
          pointsTransitionDuration={0}
          
          onPointClick={(point: any) => {
            console.log('🔍 Station clicked:', {
              id: point.station.id,
              name: point.station.name,
              lat: point.station.lat,
              lon: point.station.lon,
              lng: point.lng
            })
            setSelectedStation(point.station)
            if (onStationClick) {
              onStationClick(point.station)
            }
          }}
          
          pointLabel={(point: any) => {
            const statusColor = 
              point.station.status === 'detecting' ? '#f97316' :  // orange-500
              point.station.status === 'online' ? '#10b981' :      // green-500
              '#9ca3af'                                             // gray-500
            
            return `
              <div style="background: rgba(0,0,0,0.8); padding: 8px; border-radius: 4px; color: white; font-size: 12px;">
                <div style="font-weight: bold;">${point.station.name}</div>
                <div>Status: <span style="color: ${statusColor}; font-weight: 600;">${point.station.status.toUpperCase()}</span></div>
                <div>Lat: ${point.lat.toFixed(2)}°, Lon: ${point.lng.toFixed(2)}°</div>
              </div>
            `
          }}
          
          // Animated rings around detecting stations (orange alert!)
          ringsData={stations.filter(s => s.status === 'detecting').map(s => ({
            lat: s.lat,
            lng: s.lon
          }))}
          ringColor={() => 'rgba(255, 152, 0, 0.8)'}
          ringMaxRadius={3}
          ringPropagationSpeed={2}
          ringRepeatPeriod={1500}
          
          // Atmosphere
          atmosphereColor="#3B82F6"
          atmosphereAltitude={0.2}
          
          // Performance
          enablePointerInteraction={true}
        />
      </div>
      
      {/* Status Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-slate-900 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <motion.div
              className="flex items-center gap-2 text-green-400"
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
              <span className="text-sm font-medium">{statusCounts.online} Online</span>
            </motion.div>
            
            {statusCounts.detecting > 0 && (
              <motion.div
                className="flex items-center gap-2 text-green-300"
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">{statusCounts.detecting} Detecting</span>
              </motion.div>
            )}
            
            {statusCounts.offline > 0 && (
              <div className="flex items-center gap-2 text-slate-500">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">{statusCounts.offline} Offline</span>
              </div>
            )}
          </div>
          
          <div className="text-xs text-slate-400">
            Click station for details • Drag to rotate
          </div>
        </div>
      </div>
      
      {/* Selected Station Info */}
      {selectedStation && (
        <motion.div
          className="absolute top-20 right-4 bg-slate-800 border border-slate-600 rounded-lg p-4 z-20 max-w-xs"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wifi className={`h-5 w-5 ${
                selectedStation.status === 'detecting' ? 'text-orange-500' :
                selectedStation.status === 'online' ? 'text-green-500' :
                'text-gray-500'
              }`} />
              <div>
                <div className="text-white font-semibold">{selectedStation.name}</div>
                <div className="text-xs text-slate-400">ID: {selectedStation.id}</div>
              </div>
            </div>
            <button
              onClick={() => setSelectedStation(null)}
              className="text-slate-400 hover:text-white"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className={`font-medium ${
                selectedStation.status === 'detecting' ? 'text-orange-500' :
                selectedStation.status === 'online' ? 'text-green-500' :
                'text-gray-500'
              }`}>
                {selectedStation.status.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Position:</span>
              <span className="text-white font-mono text-xs">
                {selectedStation.lat.toFixed(3)}°, {selectedStation.lon.toFixed(3)}°
              </span>
            </div>
            {selectedStation.lastPing && (
              <div className="flex justify-between">
                <span className="text-slate-400">Last Ping:</span>
                <span className="text-white text-xs">
                  {new Date(selectedStation.lastPing).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
