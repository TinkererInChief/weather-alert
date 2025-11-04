'use client'

import { motion } from 'framer-motion'
import { User, Car, Home, Waves } from 'lucide-react'

type Props = {
  height: number // in meters
  showComparisons?: boolean
}

const comparisonObjects = [
  { name: 'Person', height: 1.7, icon: User, color: 'text-blue-500' },
  { name: 'Car', height: 1.5, icon: Car, color: 'text-slate-600' },
  { name: 'House', height: 3.0, icon: Home, color: 'text-amber-600' }
]

export function WaveHeightComparison({ height, showComparisons = true }: Props) {
  const maxHeight = Math.max(height, ...comparisonObjects.map(o => o.height))
  const scale = 100 / maxHeight // Scale to fit in 100px
  
  const getDangerLevel = (h: number) => {
    if (h >= 3) return { color: 'bg-red-500', text: 'Extreme Danger', glow: 'shadow-red-500/50' }
    if (h >= 2) return { color: 'bg-orange-500', text: 'High Danger', glow: 'shadow-orange-500/50' }
    if (h >= 1) return { color: 'bg-yellow-500', text: 'Moderate Danger', glow: 'shadow-yellow-500/50' }
    return { color: 'bg-blue-500', text: 'Low Impact', glow: 'shadow-blue-500/50' }
  }
  
  const danger = getDangerLevel(height)

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Waves className="h-5 w-5 text-blue-600" />
            Wave Height Analysis
          </h3>
          <p className="text-sm text-slate-600 mt-1">Visual scale comparison</p>
        </div>
        <motion.div
          className={`px-3 py-1.5 rounded-full text-sm font-medium text-white ${danger.color} shadow-lg ${danger.glow}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.3 }}
        >
          {danger.text}
        </motion.div>
      </div>
      
      {/* Visual Comparison */}
      <div className="flex items-end justify-around gap-4 mt-6" style={{ height: '180px' }}>
        {/* Wave Column */}
        <div className="flex flex-col items-center gap-2">
          <motion.div
            className="relative flex flex-col justify-end"
            style={{ height: '140px' }}
          >
            {/* Animated wave */}
            <motion.div
              className={`w-20 ${danger.color} rounded-t-lg relative overflow-hidden`}
              initial={{ height: 0 }}
              animate={{ height: `${height * scale * 1.4}px` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              style={{
                boxShadow: `0 -4px 20px ${danger.glow.includes('red') ? 'rgba(239, 68, 68, 0.4)' : 
                                         danger.glow.includes('orange') ? 'rgba(249, 115, 22, 0.4)' :
                                         danger.glow.includes('yellow') ? 'rgba(251, 191, 36, 0.4)' :
                                         'rgba(59, 130, 246, 0.4)'}`
              }}
            >
              {/* Wave pattern */}
              <motion.div
                className="absolute inset-0 opacity-30"
                animate={{
                  backgroundPosition: ['0px 0px', '40px 40px']
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear'
                }}
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.3) 10px, rgba(255,255,255,0.3) 20px)'
                }}
              />
              
              {/* Water fill animation */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-white/20"
                animate={{
                  height: ['0%', '100%', '0%']
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            </motion.div>
            
            {/* Height label */}
            <motion.div
              className="absolute -right-12 top-0 text-2xl font-bold"
              style={{ color: danger.color.replace('bg-', '') }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              {height.toFixed(1)}m
            </motion.div>
          </motion.div>
          
          <motion.div
            className="text-sm font-semibold text-slate-900 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            Tsunami<br />Wave
          </motion.div>
        </div>
        
        {showComparisons && comparisonObjects.map((obj, i) => {
          const Icon = obj.icon
          return (
            <div key={obj.name} className="flex flex-col items-center gap-2">
              <motion.div
                className="flex flex-col justify-end"
                style={{ height: '140px' }}
              >
                <motion.div
                  className={`w-16 bg-slate-200 rounded-t-lg flex items-center justify-center ${obj.color}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${obj.height * scale * 1.4}px` }}
                  transition={{ duration: 1, delay: 0.5 + i * 0.2, ease: 'easeOut' }}
                >
                  <Icon className="h-8 w-8" />
                </motion.div>
              </motion.div>
              
              <motion.div
                className="text-xs text-slate-600 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 + i * 0.2 }}
              >
                {obj.name}<br />
                <span className="font-semibold">{obj.height}m</span>
              </motion.div>
            </div>
          )
        })}
      </div>
      
      {/* Warning message */}
      {height >= 2 && (
        <motion.div
          className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          <p className="text-sm text-red-800 font-medium">
            ⚠️ Wave height exceeds{' '}
            {height >= 3 ? 'typical building height' : 'vehicle height'}.
            Immediate evacuation to higher ground required.
          </p>
        </motion.div>
      )}
    </div>
  )
}
