'use client'

import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import { CheckCircle, Shield } from 'lucide-react'

type Props = {
  score: number
  sources: string[]
  size?: 'sm' | 'md' | 'lg'
}

export function RadialConfidenceDisplay({ score, sources, size = 'md' }: Props) {
  const dimensions = {
    sm: { radius: 40, strokeWidth: 6, fontSize: 'text-xl' },
    md: { radius: 60, strokeWidth: 8, fontSize: 'text-3xl' },
    lg: { radius: 80, strokeWidth: 10, fontSize: 'text-4xl' }
  }
  
  const { radius, strokeWidth, fontSize } = dimensions[size]
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  
  const color = getColor(score)
  const level = getLevel(score)

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Radial Progress Ring */}
      <div className="relative">
        <svg
          width={radius * 2 + 40}
          height={radius * 2 + 40}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={radius + 20}
            cy={radius + 20}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
          />
          
          {/* Animated progress circle */}
          <motion.circle
            cx={radius + 20}
            cy={radius + 20}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 2, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 8px ${color}40)`
            }}
          />
          
          {/* Glow effect */}
          <motion.circle
            cx={radius + 20}
            cy={radius + 20}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth + 2}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            opacity={0.3}
            animate={{
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
          >
            {score >= 75 ? (
              <CheckCircle className="h-8 w-8 mb-2" style={{ color }} />
            ) : (
              <Shield className="h-8 w-8 mb-2" style={{ color }} />
            )}
          </motion.div>
          <motion.div
            className={`${fontSize} font-bold`}
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <CountUp end={score} duration={2} />%
          </motion.div>
          <div className="text-xs text-slate-600 font-medium mt-1">
            Confidence
          </div>
        </div>
      </div>
      
      {/* Confidence Level Badge */}
      <motion.div
        className={`px-4 py-2 rounded-full text-sm font-medium text-white`}
        style={{ backgroundColor: color }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        {level}
      </motion.div>
      
      {/* Sources */}
      <div className="flex flex-wrap gap-2 justify-center max-w-xs">
        {sources.map((source, i) => (
          <motion.div
            key={source}
            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2 + i * 0.1, type: 'spring' }}
          >
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: getSourceColor(source) }}
            />
            {source}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function getColor(score: number): string {
  if (score >= 90) return '#10B981' // green
  if (score >= 75) return '#3B82F6' // blue
  if (score >= 60) return '#FBBF24' // yellow
  if (score >= 40) return '#F97316' // orange
  return '#DC2626' // red
}

function getLevel(score: number): string {
  if (score >= 90) return 'Very High'
  if (score >= 75) return 'High'
  if (score >= 60) return 'Moderate'
  if (score >= 40) return 'Low'
  return 'Very Low'
}

function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    'PTWC': '#3B82F6',
    'JMA': '#8B5CF6',
    'DART': '#10B981',
    'GeoNet': '#06B6D4',
    'EMSC': '#F97316'
  }
  return colors[source] || '#64748B'
}
