'use client'

import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import { CheckCircle2, AlertCircle } from 'lucide-react'

type Props = {
  score: number
  sources: string[]
  showDetails?: boolean
}

const sourceWeights: Record<string, number> = {
  'PTWC': 30,
  'JMA': 25,
  'DART': 30,
  'GeoNet': 25,
  'EMSC': 20
}

const sourceColors: Record<string, string> = {
  'PTWC': 'bg-blue-500',
  'JMA': 'bg-purple-500',
  'DART': 'bg-green-500',
  'GeoNet': 'bg-cyan-500',
  'EMSC': 'bg-orange-500'
}

export function ConfidenceScoreBarV2({ score, sources, showDetails = true }: Props) {
  const level = getConfidenceLevel(score)
  const color = getConfidenceColor(score)
  
  // Calculate segment widths based on sources
  const segments = sources.map(source => ({
    name: source,
    weight: sourceWeights[source] || 20,
    color: sourceColors[source] || 'bg-slate-500'
  }))
  
  const totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0)
  const normalizedSegments = segments.map(seg => ({
    ...seg,
    percentage: (seg.weight / totalWeight) * score
  }))

  return (
    <div className="space-y-3">
      {/* Header with animated count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Alert Confidence</span>
          {score >= 75 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </motion.div>
          )}
          {score < 60 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </motion.div>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <motion.span
            className="text-3xl font-bold"
            style={{ color }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 10 }}
          >
            <CountUp end={score} duration={2} />
          </motion.span>
          <span className="text-lg font-medium text-slate-600">%</span>
        </div>
      </div>
      
      {/* Multi-segment animated bar */}
      <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          {normalizedSegments.map((segment, i) => (
            <motion.div
              key={segment.name}
              className={`${segment.color} h-full`}
              initial={{ width: 0 }}
              animate={{ width: `${segment.percentage}%` }}
              transition={{
                delay: i * 0.2,
                duration: 0.8,
                ease: 'easeOut'
              }}
            />
          ))}
        </div>
        
        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{
            delay: 1.5,
            duration: 1.5,
            ease: 'easeInOut'
          }}
        />
      </div>
      
      {/* Confidence level indicator */}
      <motion.div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${color === '#DC2626' ? 'bg-red-100 text-red-800' :
          color === '#F97316' ? 'bg-orange-100 text-orange-800' :
          color === '#FBBF24' ? 'bg-yellow-100 text-yellow-800' :
          color === '#3B82F6' ? 'bg-blue-100 text-blue-800' :
          'bg-green-100 text-green-800'
        }`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <div className={`w-2 h-2 rounded-full ${color === '#DC2626' ? 'bg-red-500' :
          color === '#F97316' ? 'bg-orange-500' :
          color === '#FBBF24' ? 'bg-yellow-500' :
          color === '#3B82F6' ? 'bg-blue-500' :
          'bg-green-500'
        } animate-pulse`} />
        {level}
      </motion.div>
      
      {/* Source badges with stagger animation */}
      {showDetails && (
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-xs text-slate-600 mr-1">Sources:</span>
          {sources.map((source, i) => (
            <motion.div
              key={source}
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium"
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.8 + i * 0.1,
                type: 'spring',
                stiffness: 200,
                damping: 15
              }}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${sourceColors[source] || 'bg-slate-500'}`} />
              {source}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function getConfidenceLevel(score: number): string {
  if (score >= 90) return 'Very High Confidence'
  if (score >= 75) return 'High Confidence'
  if (score >= 60) return 'Moderate Confidence'
  if (score >= 40) return 'Low Confidence'
  return 'Very Low Confidence'
}

function getConfidenceColor(score: number): string {
  if (score >= 90) return '#10B981' // green
  if (score >= 75) return '#3B82F6' // blue
  if (score >= 60) return '#FBBF24' // yellow
  if (score >= 40) return '#F97316' // orange
  return '#DC2626' // red
}
