'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, AlertTriangle, Waves } from 'lucide-react'

type Wave = {
  number: number
  height: number
  eta: Date
  isStrongest?: boolean
}

type Props = {
  waves: Wave[]
  targetLocation?: string
}

export function LiveWaveTimeline({ waves, targetLocation = 'Coastal Area' }: Props) {
  const [currentTime, setCurrentTime] = useState(Date.now())
  
  // Update every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  const sortedWaves = [...waves].sort((a, b) => 
    new Date(a.eta).getTime() - new Date(b.eta).getTime()
  )
  
  const strongestWave = waves.find(w => w.isStrongest) || waves.reduce((max, w) => 
    w.height > max.height ? w : max, waves[0]
  )

  return (
    <motion.div
      className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-5 border-2 border-red-300"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        boxShadow: '0 0 30px rgba(220, 38, 38, 0.3)'
      }}
    >
      {/* Warning Header */}
      <motion.div
        className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-red-300"
        animate={{ 
          scale: [1, 1.02, 1]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        <div className="p-2 bg-red-500 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-red-900">
            ⚠️ MULTIPLE WAVES DETECTED
          </h3>
          <p className="text-sm text-red-700">
            {waves.length} waves approaching {targetLocation}
          </p>
        </div>
      </motion.div>
      
      {/* Wave Timeline */}
      <div className="space-y-4">
        {sortedWaves.map((wave, index) => {
          const etaTime = new Date(wave.eta).getTime()
          const timeRemaining = etaTime - currentTime
          const isArrived = timeRemaining <= 0
          const progress = Math.max(0, Math.min(100, 100 - (timeRemaining / (60 * 60 * 1000) * 100)))
          
          return (
            <motion.div
              key={wave.number}
              className={`relative ${wave.isStrongest ? 'bg-red-100 border-2 border-red-500' : 'bg-white border border-red-200'} rounded-lg p-4`}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
            >
              {wave.isStrongest && (
                <motion.div
                  className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full"
                  animate={{
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity
                  }}
                >
                  🔴 STRONGEST
                </motion.div>
              )}
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Waves className={`h-5 w-5 ${wave.isStrongest ? 'text-red-600' : 'text-orange-600'}`} />
                  <div>
                    <div className="font-semibold text-slate-900">
                      Wave {wave.number}
                    </div>
                    <div className={`text-sm ${wave.isStrongest ? 'text-red-700 font-bold' : 'text-slate-600'}`}>
                      Height: {wave.height.toFixed(1)}m
                      {wave.isStrongest && ' - EVACUATE NOW'}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  {isArrived ? (
                    <motion.div
                      className="text-red-700 font-bold text-sm"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      ARRIVED
                    </motion.div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-red-900 font-mono">
                        <Countdown milliseconds={timeRemaining} />
                      </div>
                      <div className="text-xs text-slate-600">
                        ETA: {new Date(wave.eta).toLocaleTimeString()}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Progress bar showing wave approaching */}
              <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  className={`absolute inset-y-0 left-0 ${wave.isStrongest ? 'bg-red-600' : 'bg-orange-500'} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: isArrived ? '100%' : `${progress}%` }}
                  transition={{ duration: 1 }}
                >
                  {/* Moving wave indicator */}
                  {!isArrived && (
                    <motion.div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"
                      animate={{
                        x: [0, 4, 0],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                    />
                  )}
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </div>
      
      {/* Critical Safety Information */}
      <motion.div
        className="mt-5 p-4 bg-red-900 text-white rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="space-y-1 text-sm">
            <p className="font-bold">CRITICAL SAFETY INFORMATION</p>
            <p>Wave {strongestWave.number} ({strongestWave.height.toFixed(1)}m) is the STRONGEST. Do not return to coast areas until ALL CLEAR given by authorities.</p>
            <p className="text-red-200 text-xs mt-2">
              ⚠️ Subsequent waves can arrive hours apart and may be larger than the first wave.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Countdown({ milliseconds }: { milliseconds: number }) {
  if (milliseconds <= 0) return <span>00:00</span>
  
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  if (hours > 0) {
    return <span>{hours}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
  }
  
  return <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
}
