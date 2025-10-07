'use client'

import { useState, useMemo } from 'react'
import { Activity, AlertTriangle, Waves, Clock } from 'lucide-react'
import WidgetCard from './WidgetCard'

type TimeRange = '24h' | '7d' | '30d'
type EventType = 'all' | 'earthquake' | 'tsunami'

type TimelineEvent = {
  id: string
  type: 'earthquake' | 'tsunami'
  timestamp: Date
  title: string
  subtitle: string
  status: string
  success: boolean
  details?: string
}

type UnifiedIncidentTimelineProps = {
  events: TimelineEvent[]
  height?: string
}

export default function UnifiedIncidentTimeline({ events, height = '500px' }: UnifiedIncidentTimelineProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [eventType, setEventType] = useState<EventType>('all')

  const filteredEvents = useMemo(() => {
    const now = Date.now()
    const timeWindows = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }
    const since = now - timeWindows[timeRange]

    let filtered = events.filter(event => event.timestamp.getTime() >= since)

    if (eventType !== 'all') {
      filtered = filtered.filter(event => event.type === eventType)
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [events, timeRange, eventType])

  const getTimelineIcon = (type: 'earthquake' | 'tsunami') => {
    if (type === 'earthquake') {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 flex-shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
      )
    } else {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 flex-shrink-0">
          <Waves className="h-5 w-5" />
        </div>
      )
    }
  }

  const timeRangeLabel = {
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days'
  }

  return (
    <WidgetCard
      title="Unified Incident Timeline"
      icon={Clock}
      iconColor="red"
      subtitle={`${filteredEvents.length} events • ${timeRangeLabel[timeRange]}`}
      className="flex flex-col min-h-0 overflow-hidden"
      noPadding
      style={{ height }}
    >
      <div className="px-6 pb-4 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2">
            {/* Time Range Filter */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {range === '24h' ? '24h' : range === '7d' ? '7d' : '30d'}
                </button>
              ))}
            </div>

            {/* Event Type Filter */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setEventType('all')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  eventType === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setEventType('earthquake')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                  eventType === 'earthquake'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="h-3 w-3" />
                <span className="hidden sm:inline">Earthquake</span>
              </button>
              <button
                onClick={() => setEventType('tsunami')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                  eventType === 'tsunami'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Waves className="h-3 w-3" />
                <span className="hidden sm:inline">Tsunami</span>
              </button>
            </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto px-6 pb-6">
          {filteredEvents.length ? (
            filteredEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/90 p-3 shadow-sm hover:shadow-md transition-shadow">
                {getTimelineIcon(event.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{event.title}</p>
                      <p className="text-xs text-slate-500 truncate">{event.subtitle}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                      event.success 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {event.timestamp.toLocaleString()}
                  </p>
                  {event.details && (
                    <p className="mt-1 text-xs text-rose-600 truncate">{event.details}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Activity className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm">No {eventType === 'all' ? '' : eventType} incidents in {String(timeRangeLabel[timeRange] ?? '').toLowerCase()}</p>
            </div>
          )}
      </div>
    </WidgetCard>
  )
}
