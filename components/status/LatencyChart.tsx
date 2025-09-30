'use client'

import { useMemo, useState } from 'react'

type DataPoint = {
  time: number
  latencyAvg?: number
  latencyP50?: number
  latencyP95?: number
  latencyP99?: number
}

type LatencyChartProps = {
  title: string
  points: DataPoint[]
  color: string
}

export default function LatencyChart({ title, points, color }: LatencyChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number } | null>(null)
  const { max, hasData, formattedPoints } = useMemo(() => {
    const validPoints = points.filter(p => 
      p.latencyAvg !== undefined || p.latencyP50 !== undefined || p.latencyP95 !== undefined || p.latencyP99 !== undefined
    )
    
    if (validPoints.length === 0) {
      return { max: 100, hasData: false, formattedPoints: [] }
    }

    const allValues = validPoints.flatMap(p => [
      p.latencyAvg,
      p.latencyP50,
      p.latencyP95,
      p.latencyP99
    ].filter((v): v is number => v !== undefined))

    const maxVal = Math.max(...allValues, 10)
    const max = Math.ceil(maxVal * 1.1 / 10) * 10

    return { max, hasData: true, formattedPoints: validPoints }
  }, [points])

  if (!hasData) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm font-medium text-slate-900 mb-3">{title}</p>
        <div className="h-32 flex items-center justify-center">
          <p className="text-xs text-slate-500">No data available</p>
        </div>
      </div>
    )
  }

  const width = 300
  const height = 120
  const padding = { top: 10, right: 10, bottom: 20, left: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const xScale = (index: number) => {
    return padding.left + (index / (formattedPoints.length - 1)) * chartWidth
  }

  const yScale = (value: number) => {
    return padding.top + chartHeight - (value / max) * chartHeight
  }

  const createPath = (getValue: (p: DataPoint) => number | undefined) => {
    const validPoints = formattedPoints
      .map((p, i) => ({ value: getValue(p), index: i }))
      .filter((p): p is { value: number; index: number } => p.value !== undefined)

    if (validPoints.length === 0) return ''

    return validPoints.reduce((path, p, i) => {
      const x = xScale(p.index)
      const y = yScale(p.value)
      return i === 0 ? `M ${x} ${y}` : `${path} L ${x} ${y}`
    }, '')
  }

  const p99Path = createPath(p => p.latencyP99)
  const p95Path = createPath(p => p.latencyP95)
  const p50Path = createPath(p => p.latencyP50)
  const avgPath = createPath(p => p.latencyAvg)

  const currentLatency = formattedPoints[formattedPoints.length - 1]
  const displayP95 = currentLatency.latencyP95 ?? currentLatency.latencyAvg ?? 0
  const displayP99 = currentLatency.latencyP99
  const displayAvg = currentLatency.latencyAvg

  return (
    <div className="group p-5 bg-gradient-to-br from-white to-slate-50/50 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-lg transition-all duration-300" role="article">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-1">{title}</h4>
          <div className="flex items-center gap-3 text-xs">
            <div>
              <span className="text-slate-500">avg</span>
              <span className="ml-1 font-semibold text-slate-700">{displayAvg ? Math.round(displayAvg) : '-'}ms</span>
            </div>
            <div className="w-px h-3 bg-slate-300" />
            <div>
              <span className="text-slate-500">p99</span>
              <span className="ml-1 font-semibold text-slate-700">{displayP99 ? Math.round(displayP99) : '-'}ms</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent" style={{ color }}>
            {Math.round(displayP95)}
          </p>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">p95 ms</p>
        </div>
      </div>

      <div className="relative">
        <svg 
          width={width} 
          height={height} 
          className="w-full" 
          role="img" 
          aria-label={`${title} latency chart`}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            
            // Find closest point
            const closestIndex = Math.round(((x - padding.left) / chartWidth) * (formattedPoints.length - 1))
            if (closestIndex >= 0 && closestIndex < formattedPoints.length) {
              setHoveredPoint({ index: closestIndex, x, y })
            }
          }}
          onMouseLeave={() => setHoveredPoint(null)}
        >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + chartHeight * (1 - ratio)
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <text
                x={padding.left - 5}
                y={y + 3}
                textAnchor="end"
                className="text-[10px] fill-slate-400"
              >
                {Math.round(max * ratio)}
              </text>
            </g>
          )
        })}

        {/* P99 line (tail latency) */}
        {p99Path && (
          <path
            d={p99Path}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeOpacity="0.45"
            strokeDasharray="5,3"
          />
        )}

        {/* P95 line */}
        {p95Path && (
          <path
            d={p95Path}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeOpacity="0.6"
          />
        )}

        {/* P50 line - REMOVED for clarity */}

        {/* Avg line (main) */}
        {avgPath && (
          <path
            d={avgPath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeOpacity="1"
          />
        )}

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#cbd5e1"
          strokeWidth="1"
        />

        {/* Hover indicator */}
        {hoveredPoint !== null && (
          <>
            <line
              x1={xScale(hoveredPoint.index)}
              y1={padding.top}
              x2={xScale(hoveredPoint.index)}
              y2={height - padding.bottom}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="4,2"
              opacity="0.5"
            />
            <circle
              cx={xScale(hoveredPoint.index)}
              cy={yScale(formattedPoints[hoveredPoint.index].latencyAvg || 0)}
              r="4"
              fill={color}
              stroke="white"
              strokeWidth="2"
            />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hoveredPoint !== null && (
        <div
          className="absolute z-10 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-xl pointer-events-none"
          style={{
            left: `${hoveredPoint.x}px`,
            top: `${hoveredPoint.y - 80}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-semibold mb-1">
            {new Date(formattedPoints[hoveredPoint.index].time).toLocaleTimeString()}
          </div>
          {formattedPoints[hoveredPoint.index].latencyAvg !== undefined && (
            <div className="text-slate-300">
              Avg: <span className="font-semibold">{Math.round(formattedPoints[hoveredPoint.index].latencyAvg!)}ms</span>
            </div>
          )}
          {formattedPoints[hoveredPoint.index].latencyP95 !== undefined && (
            <div className="text-slate-300">
              P95: <span className="font-semibold">{Math.round(formattedPoints[hoveredPoint.index].latencyP95!)}ms</span>
            </div>
          )}
          {formattedPoints[hoveredPoint.index].latencyP99 !== undefined && (
            <div className="text-slate-300">
              P99: <span className="font-semibold">{Math.round(formattedPoints[hoveredPoint.index].latencyP99!)}ms</span>
            </div>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: color, opacity: 1 }} />
          <span className="text-slate-600 font-medium">Avg</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: color, opacity: 0.6 }} />
          <span className="text-slate-600 font-medium">P95</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: color, opacity: 0.45 }} />
          <span className="text-slate-600 font-medium">P99</span>
        </div>
      </div>
    </div>
  )
}
