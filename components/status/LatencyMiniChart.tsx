"use client"

import { memo } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"

// Small, client-only area chart for latency time series
// Strict typing, simple props, no side effects

type LatencyPoint = {
  time: number
  latency?: number
}

type LatencyMiniChartProps = {
  title: string
  points: LatencyPoint[]
  color?: string
}

const formatTime = (ts: number) => {
  const d = new Date(ts)
  return d.toLocaleTimeString(undefined, { hour12: false, hour: "2-digit", minute: "2-digit" })
}

function LatencyMiniChart({ title, points, color = "#3b82f6" }: LatencyMiniChartProps) {
  const data = points.map(p => ({ time: p.time, latency: typeof p.latency === "number" ? Math.max(0, Math.round(p.latency)) : undefined }))

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 h-56">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-900">{title}</h4>
        <div className="text-xs text-slate-500">{points.length > 0 ? `${formatTime(points[0].time)} – ${formatTime(points[points.length - 1].time)}` : ""}</div>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`latencyGradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tickFormatter={formatTime} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis width={32} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals domain={[0, "dataMax + 50"]} />
            <Tooltip
              labelFormatter={(label: number | string) => formatTime(Number(label))}
              formatter={(value: unknown) => [`${value as number}ms`, "Latency"]}
              contentStyle={{ fontSize: 12 }}
            />
            <Area type="monotone" dataKey="latency" stroke={color} fillOpacity={1} fill={`url(#latencyGradient-${title})`} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default memo(LatencyMiniChart)
