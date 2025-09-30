'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type TrendIndicatorProps = {
  trend: 'up' | 'down' | 'stable'
  value?: string
}

export default function TrendIndicator({ trend, value }: TrendIndicatorProps) {
  const getIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" aria-label="Trending up" />
      case 'down':
        return <TrendingDown className="h-3 w-3" aria-label="Trending down" />
      case 'stable':
        return <Minus className="h-3 w-3" aria-label="Stable" />
    }
  }

  const getColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50'
      case 'down':
        return 'text-red-600 bg-red-50'
      case 'stable':
        return 'text-slate-600 bg-slate-50'
    }
  }

  return (
    <span 
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getColor()}`}
      role="status"
      aria-label={`Trend: ${trend}${value ? `, ${value}` : ''}`}
    >
      {getIcon()}
      {value && <span>{value}</span>}
    </span>
  )
}
