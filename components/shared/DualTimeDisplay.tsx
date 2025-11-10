/**
 * Dual Time Display Component
 * 
 * Displays times in both UTC and local timezone with clear labels
 * Supports multiple formats: stacked, inline, tooltip
 */

'use client'

import { Clock } from 'lucide-react'
import { formatDualTime, TimeDisplayType, TimeDisplayFormat } from '@/lib/time-display'
import { useState } from 'react'

interface DualTimeDisplayProps {
  date: Date | string | number
  type?: TimeDisplayType
  format?: TimeDisplayFormat
  userTimezone?: string
  showIcon?: boolean
  className?: string
  includeSeconds?: boolean
}

export const DualTimeDisplay = ({ 
  date, 
  type = 'event',
  format = 'stacked',
  userTimezone,
  showIcon = false,
  className = '',
  includeSeconds = false
}: DualTimeDisplayProps) => {
  const dateObj = date instanceof Date ? date : new Date(date)
  
  if (isNaN(dateObj.getTime())) {
    return <span className="text-xs text-slate-400">Invalid date</span>
  }
  
  const times = formatDualTime(dateObj, type, userTimezone, { includeSeconds })
  
  if (format === 'stacked') {
    return (
      <div className={`space-y-0.5 ${className}`}>
        <div className="flex items-center gap-1.5">
          {showIcon && <Clock className="h-3.5 w-3.5 text-slate-400" />}
          <div className="text-sm font-semibold text-slate-900">
            {times.primary}
          </div>
        </div>
        <div className="text-xs text-slate-500 ml-5">
          {times.secondary}
        </div>
      </div>
    )
  }
  
  if (format === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        {showIcon && <Clock className="h-3.5 w-3.5 text-slate-400" />}
        <span className="text-sm">
          <span className="font-medium text-slate-900">{times.primary}</span>
          <span className="text-slate-400 mx-1.5">•</span>
          <span className="text-slate-500">{times.secondary}</span>
        </span>
      </span>
    )
  }
  
  if (format === 'tooltip') {
    const [showTooltip, setShowTooltip] = useState(false)
    
    return (
      <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
        <span 
          className="inline-flex items-center gap-1.5 cursor-help"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          title={times.full}
        >
          {showIcon && <Clock className="h-3.5 w-3.5 text-slate-400" />}
          <span className="text-sm text-slate-900 border-b border-dotted border-slate-300">
            {times.primary}
          </span>
        </span>
        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
            <div className="space-y-1">
              <div className="font-semibold">{times.primary}</div>
              <div className="text-slate-300">{times.secondary}</div>
            </div>
            <div className="absolute top-full left-4 w-2 h-2 bg-slate-900 transform -translate-y-1 rotate-45"></div>
          </div>
        )}
      </div>
    )
  }
  
  return null
}

/**
 * Event Time Display
 * Convenience component specifically for event times (earthquakes, tsunamis)
 * Always shows UTC as primary
 */
export const EventTimeDisplay = (props: Omit<DualTimeDisplayProps, 'type'>) => {
  return <DualTimeDisplay {...props} type="event" />
}

/**
 * System Time Display
 * Convenience component specifically for system times (alerts sent, logins)
 * Always shows local time as primary
 */
export const SystemTimeDisplay = (props: Omit<DualTimeDisplayProps, 'type'>) => {
  return <DualTimeDisplay {...props} type="system" />
}

/**
 * Relative Time Display
 * Shows "2 hours ago" with full times on hover
 */
export const RelativeTimeDisplay = (props: Omit<DualTimeDisplayProps, 'type' | 'format'>) => {
  return <DualTimeDisplay {...props} type="relative" format="tooltip" />
}

/**
 * Compact Time Display
 * Single line with both times inline
 */
export const CompactTimeDisplay = (props: Omit<DualTimeDisplayProps, 'format'>) => {
  return <DualTimeDisplay {...props} format="inline" />
}
