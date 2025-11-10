"use client"

import { AlertTriangle, CheckCircle, Clock, XCircle, Info } from 'lucide-react'
import { formatDualTime } from '@/lib/time-display'
import { memo, useMemo } from "react"

// Premium status timeline with enhanced visuals
// Expects bucketed timeline points from /api/health/uptime

type Status = 'healthy' | 'warning' | 'critical'

type TimelinePoint = {
  time: number
  worstStatus: Status
  count: number
}

type Props = {
  title: string
  points: TimelinePoint[]
}

const colorFor = (s: Status) => {
  return s === 'healthy' 
    ? { bg: '#10b981', shadow: 'rgba(16, 185, 129, 0.3)' }
    : s === 'warning' 
    ? { bg: '#f59e0b', shadow: 'rgba(245, 158, 11, 0.3)' }
    : { bg: '#ef4444', shadow: 'rgba(239, 68, 68, 0.3)' }
}

function StatusTimeline({ title, points }: Props) {
  const total = points.reduce((a, p) => a + (p.count || 1), 0) || 1
  
  const { segments, healthyPercent } = useMemo(() => {
    const segs = points.map(p => ({
      key: p.time,
      widthPct: Math.max(0.5, (100 * (p.count || 1)) / total),
      colors: colorFor(p.worstStatus),
      status: p.worstStatus,
      label: new Date(p.time).toLocaleString(),
    }))
    
    const healthyCount = points.filter(p => p.worstStatus === 'healthy').reduce((a, p) => a + (p.count || 1), 0)
    const healthyPct = ((healthyCount / total) * 100).toFixed(2)
    
    return { segments: segs, healthyPercent: healthyPct }
  }, [points, total])

  return (
    <div className="group bg-gradient-to-br from-white via-white to-slate-50/30 rounded-xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-0.5">{title}</h4>
          <p className="text-xs text-slate-500">
            Uptime: <span className="font-semibold text-green-600">{healthyPercent}%</span>
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-sm" />
            <span className="text-slate-600">Healthy</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm" />
            <span className="text-slate-600">Warning</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-sm" />
            <span className="text-slate-600">Critical</span>
          </span>
        </div>
      </div>
      
      <div className="relative">
        {/* Background container with glow */}
        <div className="w-full h-6 rounded-lg overflow-hidden bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 shadow-inner flex" role="list" aria-label="Status timeline">
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
              title={seg.label}
            >
              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent opacity-0 group-hover/segment:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>
        
        {/* Time labels */}
        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 font-medium">
          <span>60m ago</span>
          <span>30m</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  )
}

export type { TimelinePoint }
export default memo(StatusTimeline)
