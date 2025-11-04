'use client'

import { motion } from 'framer-motion'
import { Waves, Activity } from 'lucide-react'

type WaveConfirmation = {
  stationId: string
  stationName: string
  height: number
  timestamp: Date
  region: string
}

type Props = {
  confirmation: WaveConfirmation
  variant?: 'compact' | 'full'
}

export function WaveConfirmationBadgeV2({ confirmation, variant = 'compact' }: Props) {
  const timeAgo = getTimeAgo(confirmation.timestamp)
  
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-sm font-medium shadow-lg"
        style={{
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Waves className="h-4 w-4" />
        </motion.div>
        <span>DART Confirmed</span>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-xl"
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-green-400 via-emerald-400 to-green-500"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear'
        }}
        style={{
          backgroundSize: '200% 200%'
        }}
      />
      
      {/* Pulsing ring effect */}
      <motion.div
        className="absolute inset-0 rounded-xl border-2 border-green-400"
        animate={{
          opacity: [0.6, 1, 0.6],
          scale: [1, 1.02, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
      
      {/* Content with glassmorphism */}
      <div className="relative backdrop-blur-sm bg-white/90 p-4 rounded-xl border border-green-200/50">
        <div className="flex items-start gap-3">
          {/* Animated wave icon */}
          <motion.div
            className="p-2 bg-green-100 rounded-lg"
            animate={{
              y: [0, -3, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            <Waves className="h-6 w-6 text-green-600" />
          </motion.div>
          
          <div className="flex-1">
            <motion.div
              className="font-bold text-green-900 text-lg mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              ✓ WAVE CONFIRMED BY SENSORS
            </motion.div>
            
            <motion.div
              className="space-y-1 text-sm text-green-700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">Station:</span>
                <span>{confirmation.stationName}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span className="font-semibold">{confirmation.height.toFixed(1)}m</span>
                  <span className="text-green-600">wave height</span>
                </div>
                <div className="text-green-600">
                  Detected {timeAgo}
                </div>
              </div>
              <div className="text-xs text-green-600 bg-green-50 inline-block px-2 py-0.5 rounded">
                {confirmation.region}
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Mini waveform visualization */}
        <motion.div
          className="mt-3 flex items-end gap-0.5 h-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="flex-1 bg-green-400 rounded-t"
              initial={{ height: 0 }}
              animate={{
                height: `${Math.random() * 100}%`
              }}
              transition={{
                duration: 0.3,
                delay: 0.5 + i * 0.05,
                repeat: Infinity,
                repeatDelay: 2,
                repeatType: 'reverse'
              }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  )
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  
  if (seconds < 60) return `${seconds} seconds ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}
