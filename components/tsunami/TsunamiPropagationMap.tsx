'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Activity, Clock } from 'lucide-react'

type DartStation = {
  id: string
  name: string
  lat: number
  lon: number
  status: 'active' | 'detected' | 'inactive'
}

type Props = {
  epicenter: { lat: number; lon: number }
  magnitude?: number
  waveSpeed?: number // km/h
  timeElapsed?: number // minutes since earthquake
  dartStations?: DartStation[]
  affectedCities?: Array<{ name: string; lat: number; lon: number; eta?: number }>
}

export function TsunamiPropagationMap({
  epicenter,
  magnitude = 7.0,
  waveSpeed = 800, // typical tsunami speed in deep ocean
  timeElapsed = 0,
  dartStations = [],
  affectedCities = []
}: Props) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<any>(null)
  const [currentRadius, setCurrentRadius] = useState(0)
  
  // Calculate wave radius based on time elapsed
  useEffect(() => {
    const radiusKm = (waveSpeed / 60) * timeElapsed
    setCurrentRadius(radiusKm)
  }, [waveSpeed, timeElapsed])
  
  // For now, we'll create a visual representation without actual Leaflet
  // This can be upgraded to use react-leaflet later
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Map Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Live Wave Propagation</h3>
              <p className="text-xs text-blue-100">M{magnitude} • {waveSpeed} km/h</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>{timeElapsed} min elapsed</span>
          </div>
        </div>
      </div>
      
      {/* Map Canvas */}
      <div className="relative bg-slate-900" style={{ height: '400px' }}>
        {/* Simplified Map Visual */}
        <svg className="w-full h-full">
          {/* Ocean background */}
          <defs>
            <radialGradient id="oceanGradient">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#0c4a6e" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#oceanGradient)" />
          
          {/* Animated wave circles */}
          {[1, 2, 3].map((ring) => (
            <motion.circle
              key={ring}
              cx="50%"
              cy="50%"
              r={0}
              fill="none"
              stroke={ring === 1 ? '#DC2626' : ring === 2 ? '#F97316' : '#FBBF24'}
              strokeWidth={ring === 1 ? 3 : 2}
              opacity={0.6}
              initial={{ r: 0, opacity: 0.8 }}
              animate={{
                r: [0, 200],
                opacity: [0.8, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: ring * 1.3,
                ease: 'easeOut'
              }}
            />
          ))}
          
          {/* Epicenter */}
          <motion.g
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
          >
            <circle
              cx="50%"
              cy="50%"
              r="8"
              fill="#DC2626"
              stroke="#FEE2E2"
              strokeWidth="3"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="12"
              fill="none"
              stroke="#DC2626"
              strokeWidth="2"
              animate={{
                r: [12, 20, 12],
                opacity: [1, 0.3, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity
              }}
            />
          </motion.g>
          
          {/* DART Stations */}
          {dartStations.map((station, i) => {
            // Simple positioning (in real impl, convert lat/lon to SVG coords)
            const x = 200 + Math.cos(i * 60 * Math.PI / 180) * 150
            const y = 200 + Math.sin(i * 60 * Math.PI / 180) * 150
            
            return (
              <motion.g
                key={station.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                {station.status === 'detected' && (
                  <motion.circle
                    cx={x}
                    cy={y}
                    r="15"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2"
                    animate={{
                      r: [15, 25, 15],
                      opacity: [1, 0.3, 1]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity
                    }}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill={
                    station.status === 'detected' ? '#10B981' :
                    station.status === 'active' ? '#3B82F6' :
                    '#64748B'
                  }
                  stroke="white"
                  strokeWidth="2"
                />
              </motion.g>
            )
          })}
        </svg>
        
        {/* Info Overlay */}
        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span>Epicenter (M{magnitude})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>DART Detection</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>DART Active</span>
          </div>
        </div>
        
        {/* Wave radius indicator */}
        <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg">
          <div className="text-xs text-blue-200">Wave Radius</div>
          <div className="text-xl font-bold">
            {currentRadius.toFixed(0)} km
          </div>
        </div>
      </div>
      
      {/* Station Status Bar */}
      <div className="bg-slate-50 px-4 py-3 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-slate-600">DART Network:</span>
            <span className="font-semibold text-blue-600">
              {dartStations.filter(s => s.status === 'active' || s.status === 'detected').length} Active
            </span>
            <span className="font-semibold text-green-600">
              {dartStations.filter(s => s.status === 'detected').length} Detections
            </span>
          </div>
          <motion.div
            className="text-xs text-slate-500"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ● Live Update
          </motion.div>
        </div>
      </div>
    </div>
  )
}
