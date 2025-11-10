"use client"

import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { formatDualTime } from '@/lib/time-display'
import { aggregateServicesTimeline } from "@/lib/status/aggregate"

// Aggregated status timeline that combines multiple services
// Shows overall system health without exposing individual component statuses

type Status = 'healthy' | 'warning' | 'critical'

type TimelinePoint = {
  time: number
  worstStatus: Status
  count: number
}

type AggregatedPoint = {
  time: number
  worstStatus: Status
  count: number
  healthyFraction: number
}

type Props = {
  servicesData: Record<string, TimelinePoint[]>
}

const colorFor = (s: Status) => {
  return s === 'healthy' 
    ? { bg: '#10b981', shadow: 'rgba(16, 185, 129, 0.3)' }
    : s === 'warning' 
    ? { bg: '#f59e0b', shadow: 'rgba(245, 158, 11, 0.3)' }
    : { bg: '#ef4444', shadow: 'rgba(239, 68, 68, 0.3)' }
}

const aggregateStatus = (statuses: Status[]): Status => {
  if (statuses.includes('critical')) return 'critical'
  if (statuses.includes('warning')) return 'warning'
  return 'healthy'
}

function AggregatedStatusTimeline({ servicesData }: Props) {
  const { aggregatedPoints, healthyPercent, totalServices } = useMemo(() => {
    const result = aggregateServicesTimeline(servicesData)
    // Debug logging
    console.log('AggregatedStatusTimeline:', {
      totalPoints: result.aggregatedPoints.length,
      healthyPct: result.healthyPercent,
      serviceCount: result.totalServices,
      sampleStatuses: result.aggregatedPoints.slice(0, 5).map(p => p.worstStatus)
    })
    return result
  }, [servicesData])

  const total = aggregatedPoints.length || 1
  
  const segments = useMemo(() => {
    return aggregatedPoints.map(p => ({
      key: p.time,
      widthPct: Math.max(0.5, (100 * (p.count || 1)) / total),
      colors: colorFor(p.worstStatus),
      status: p.worstStatus,
      label: new Date(p.time).toLocaleString(),
    }))
  }, [aggregatedPoints, total])

  // Show loading state if no data
  if (aggregatedPoints.length === 0) {
    return (
      <div className="group bg-gradient-to-br from-white via-white to-slate-50/30 rounded-xl p-6 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Overall System Health</h3>
            <p className="text-sm text-slate-600">
              {totalServices === 0 ? 'Collecting initial data...' : 'Loading status data...'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-400">--</div>
            <div className="text-xs text-slate-500 mt-0.5">Uptime</div>
          </div>
        </div>
        
        <div className="relative">
          <div className="w-full h-8 rounded-lg overflow-hidden bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 shadow-inner flex items-center justify-center">
            <span className="text-xs text-slate-400">
              {totalServices === 0 
                ? 'System is recording health metrics. Data will appear shortly.' 
                : 'Waiting for data...'}
            </span>
          </div>
          
          <div className="flex items-center justify-between mt-3 text-xs text-slate-400 font-medium">
            <span>60m ago</span>
            <span>30m</span>
            <span>Now</span>
          </div>
        </div>
        
        {totalServices === 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> The system needs to collect at least one health check cycle before displaying uptime data. 
              This typically takes 1-2 minutes. Please refresh the page shortly.
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="group bg-gradient-to-br from-white via-white to-slate-50/30 rounded-xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Overall System Health</h3>
          <p className="text-sm text-slate-600">
            Aggregated status across {totalServices} services
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-green-600">{healthyPercent}%</div>
          <div className="text-xs text-slate-500 mt-0.5">Uptime</div>
        </div>
      </div>
      
      <div className="relative">
        {/* Background container with glow */}
        <div className="w-full h-8 rounded-lg overflow-hidden bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 shadow-inner flex" role="list" aria-label="Aggregated status timeline">
          {segments.map(seg => (
            <div
              key={seg.key}
              role="listitem"
              className="h-full transition-all duration-300 hover:opacity-90 cursor-pointer relative group/segment"
              style={{ 
                width: `${seg.widthPct}%`, 
                background: `linear-gradient(135deg, ${seg.colors.bg} 0%, ${seg.colors.bg}dd 100%)`,
                boxShadow: `inset 0 1px 2px rgba(255,255,255,0.3)`
              }}
              title={`${seg.label} - ${seg.status}`}
            >
              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent opacity-0 group-hover/segment:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>
        
        {/* Time labels */}
        <div className="flex items-center justify-between mt-3 text-xs text-slate-400 font-medium">
          <span>60m ago</span>
          <span>30m</span>
          <span>Now</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-200">
        <span className="inline-flex items-center gap-2 text-xs font-medium">
          <span className="w-3 h-3 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-sm" />
          <span className="text-slate-600">All Systems Operational</span>
        </span>
        <span className="inline-flex items-center gap-2 text-xs font-medium">
          <span className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm" />
          <span className="text-slate-600">Degraded Performance</span>
        </span>
        <span className="inline-flex items-center gap-2 text-xs font-medium">
          <span className="w-3 h-3 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-sm" />
          <span className="text-slate-600">Service Disruption</span>
        </span>
      </div>
    </div>
  )
}

export default memo(AggregatedStatusTimeline)
