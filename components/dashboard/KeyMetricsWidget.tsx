'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type TrendDirection = 'up' | 'down' | 'neutral'

type MetricData = {
  label: string
  value: string | number
  unit?: string
  trend?: {
    direction: TrendDirection
    value: string
    isPositive: boolean
  }
  subtitle?: string
  icon?: React.ComponentType<{ className?: string }>
  color?: string
}

type KeyMetricsWidgetProps = {
  metrics: MetricData[]
}

export default function KeyMetricsWidget({ metrics }: KeyMetricsWidgetProps) {
  const getTrendIcon = (direction: TrendDirection) => {
    switch (direction) {
      case 'up':
        return TrendingUp
      case 'down':
        return TrendingDown
      default:
        return Minus
    }
  }

  const getTrendColor = (isPositive: boolean, direction: TrendDirection) => {
    if (direction === 'neutral') return 'text-slate-500'
    return isPositive ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, idx) => {
        const TrendIcon = metric.trend ? getTrendIcon(metric.trend.direction) : null
        const trendColor = metric.trend 
          ? getTrendColor(metric.trend.isPositive, metric.trend.direction)
          : ''

        return (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">{metric.label}</p>
              </div>
              {metric.icon && (
                <div 
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" 
                  style={{ backgroundColor: `${metric.color}15`, color: metric.color || '#64748b' }}
                >
                  <metric.icon className="h-5 w-5" />
                </div>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {metric.value}
              </span>
              {metric.unit && (
                <span className="text-lg font-medium text-slate-500">
                  {metric.unit}
                </span>
              )}
            </div>

            {metric.trend && TrendIcon && (
              <div className={`flex items-center gap-1.5 mt-2 ${trendColor}`}>
                <TrendIcon className="h-4 w-4" />
                <span className="text-sm font-medium">{metric.trend.value}</span>
                <span className="text-xs text-slate-500">vs last period</span>
              </div>
            )}

            {metric.subtitle && !metric.trend && (
              <p className="text-xs text-slate-500 mt-2">{metric.subtitle}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Preset metric configurations
export function SystemHealthMetrics() {
  return (
    <KeyMetricsWidget
      metrics={[
        {
          label: 'System Uptime',
          value: '99.94',
          unit: '%',
          trend: {
            direction: 'up',
            value: '+0.02%',
            isPositive: true
          },
          color: '#10b981'
        },
        {
          label: 'Avg Alert Time',
          value: '4.2',
          unit: 's',
          trend: {
            direction: 'down',
            value: '↓ 15%',
            isPositive: true
          },
          color: '#3b82f6'
        },
        {
          label: 'Contacts Reached',
          value: '98.3',
          unit: '%',
          trend: {
            direction: 'up',
            value: '+2%',
            isPositive: true
          },
          color: '#8b5cf6'
        },
        {
          label: 'MTTR',
          value: '12',
          unit: 'min',
          trend: {
            direction: 'down',
            value: '↓ 5m',
            isPositive: true
          },
          color: '#f59e0b'
        }
      ]}
    />
  )
}
