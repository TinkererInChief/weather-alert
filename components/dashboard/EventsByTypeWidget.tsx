'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Waves, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react'
import WidgetCard from './WidgetCard'

type TimeRange = '24h' | '7d' | '30d'

type EventBreakdown = {
  earthquakes: {
    total: number
    byMagnitude: {
      minor: number      // < 4.0
      light: number      // 4.0 - 4.9
      moderate: number   // 5.0 - 5.9
      strong: number     // 6.0 - 6.9
      major: number      // 7.0+
    }
  }
  tsunamis: {
    total: number
    bySeverity: {
      watch: number
      advisory: number
      warning: number
    }
  }
  trend: 'up' | 'down' | 'stable'
  trendValue: number
}

type ExternalEarthquake = {
  magnitude: number
  timestamp?: string
  time?: string
  createdAt?: string
}

type ExternalTsunami = {
  severity?: string | number
  type?: string
  category?: string
  urgency?: string
  threat?: { level?: string }
  processedAt?: string
  eventTime?: string
  time?: string
}

type EventsByTypeWidgetProps = {
  earthquakes?: ExternalEarthquake[]
  tsunamis?: ExternalTsunami[]
  timeRangeExternal?: TimeRange
  refreshKey?: number
}

export default function EventsByTypeWidget({
  earthquakes,
  tsunamis,
  timeRangeExternal,
  refreshKey,
}: EventsByTypeWidgetProps = {}) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [events, setEvents] = useState<EventBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep internal timeRange in sync with external control (dashboard filter)
  useEffect(() => {
    if (timeRangeExternal && timeRangeExternal !== timeRange) {
      setTimeRange(timeRangeExternal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRangeExternal])

  // Compute from external data (preferred for real-time updates)
  useEffect(() => {
    const hasExternal = (earthquakes && earthquakes.length >= 0) || (tsunamis && tsunamis.length >= 0)
    if (!hasExternal) return

    const computeFromProps = async () => {
      try {
        setLoading(true)

        const now = Date.now()
        const timeWindows = {
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
        }
        const since = now - timeWindows[timeRange]

        const quakes = (earthquakes || []).filter((a) => {
          const t = a.timestamp || a.time || a.createdAt
          return t ? new Date(t).getTime() >= since : true
        })

        const byMagnitude = {
          minor: quakes.filter((a) => a.magnitude < 4.0).length,
          light: quakes.filter((a) => a.magnitude >= 4.0 && a.magnitude < 5.0).length,
          moderate: quakes.filter((a) => a.magnitude >= 5.0 && a.magnitude < 6.0).length,
          strong: quakes.filter((a) => a.magnitude >= 6.0 && a.magnitude < 7.0).length,
          major: quakes.filter((a) => a.magnitude >= 7.0).length,
        }

        const lower = (val: unknown) => String(val ?? '').toLowerCase()
        const tsu = (tsunamis || []).filter((a) => {
          const t = a.time || a.eventTime || a.processedAt
          return t ? new Date(t).getTime() >= since : true
        })
        const has = (a: ExternalTsunami, term: string) => {
          const fields: Array<string | number | undefined> = [
            a.severity,
            a.type,
            a.category,
            a.urgency,
            a.threat?.level,
          ]
          return fields.some((v) => lower(v).includes(term))
        }

        const bySeverity = {
          watch: tsu.filter((a) => has(a, 'watch')).length,
          advisory: tsu.filter((a) => has(a, 'advisory')).length,
          warning: tsu.filter((a) => has(a, 'warning')).length,
        }

        setEvents({
          earthquakes: { total: quakes.length, byMagnitude },
          tsunamis: { total: tsu.length, bySeverity },
          trend: 'stable',
          trendValue: 0,
        })
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to compute event statistics')
      } finally {
        setLoading(false)
      }
    }

    computeFromProps()
    // Recompute when refreshKey changes or timeRange changes
  }, [earthquakes, tsunamis, timeRange, refreshKey])

  // Fallback: self-fetch when external data is not provided
  useEffect(() => {
    const hasExternal = (earthquakes && earthquakes.length >= 0) || (tsunamis && tsunamis.length >= 0)
    if (hasExternal) return
    const fetchEvents = async () => {
      try {
        setLoading(true)
        
        // Calculate time window
        const now = Date.now()
        const timeWindows = {
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
        }
        const since = now - timeWindows[timeRange]

        // Fetch earthquake data
        const earthquakeResponse = await fetch('/api/alerts/history?detailed=true', { cache: 'no-store' })
        const earthquakeData = await earthquakeResponse.json()
        
        // Fetch tsunami data
        const tsunamiResponse = await fetch('/api/tsunami', { cache: 'no-store' })
        const tsunamiData = await tsunamiResponse.json()

        // Filter and categorize earthquakes
        const recentEarthquakes = (earthquakeData.data?.alerts || [])
          .filter((alert: any) => new Date(alert.time || alert.createdAt).getTime() >= since)

        const byMagnitude = {
          minor: recentEarthquakes.filter((a: any) => a.magnitude < 4.0).length,
          light: recentEarthquakes.filter((a: any) => a.magnitude >= 4.0 && a.magnitude < 5.0).length,
          moderate: recentEarthquakes.filter((a: any) => a.magnitude >= 5.0 && a.magnitude < 6.0).length,
          strong: recentEarthquakes.filter((a: any) => a.magnitude >= 6.0 && a.magnitude < 7.0).length,
          major: recentEarthquakes.filter((a: any) => a.magnitude >= 7.0).length,
        }

        // Filter and categorize tsunamis
        const recentTsunamis = (tsunamiData.data?.alerts || [])
          .filter((alert: any) => new Date(alert.time || alert.eventTime).getTime() >= since)

        const lower = (val: unknown) => String(val ?? '').toLowerCase()
        const bySeverity = {
          watch: recentTsunamis.filter((a: any) =>
            lower(a.severity).includes('watch') || lower(a.type).includes('watch')
          ).length,
          advisory: recentTsunamis.filter((a: any) =>
            lower(a.severity).includes('advisory') || lower(a.type).includes('advisory')
          ).length,
          warning: recentTsunamis.filter((a: any) =>
            lower(a.severity).includes('warning') || lower(a.type).includes('warning')
          ).length,
        }

        // Update state
        setEvents({
          earthquakes: {
            total: recentEarthquakes.length,
            byMagnitude,
          },
          tsunamis: {
            total: recentTsunamis.length,
            bySeverity,
          },
          trend: 'stable', // TODO: Calculate from previous period
          trendValue: 0,
        })
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load event statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
    // Refresh every 5 minutes
    const interval = setInterval(fetchEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [timeRange, earthquakes, tsunamis])

  const TrendIcon = events?.trend === 'up' ? TrendingUp : events?.trend === 'down' ? TrendingDown : Minus

  const getMagnitudeColor = (level: string) => {
    switch (level) {
      case 'major': return 'bg-red-500'
      case 'strong': return 'bg-orange-500'
      case 'moderate': return 'bg-yellow-500'
      case 'light': return 'bg-blue-500'
      case 'minor': return 'bg-slate-400'
      default: return 'bg-slate-300'
    }
  }

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'warning': return 'bg-red-500'
      case 'advisory': return 'bg-yellow-500'
      case 'watch': return 'bg-blue-500'
      default: return 'bg-slate-300'
    }
  }

  if (loading) {
    return (
      <WidgetCard title="Events by Type & Severity" icon={BarChart3} iconColor="red" className="h-full">
        <div className="animate-pulse">
          <div className="h-10 bg-slate-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            <div className="h-20 bg-slate-200 rounded"></div>
            <div className="h-20 bg-slate-200 rounded"></div>
          </div>
        </div>
      </WidgetCard>
    )
  }

  if (error) {
    return (
      <WidgetCard title="Events by Type & Severity" icon={BarChart3} iconColor="red" className="h-full">
        <p className="text-sm text-red-600">{error}</p>
      </WidgetCard>
    )
  }

  if (!events) return null

  return (
    <WidgetCard
      title="Events by Type & Severity"
      icon={BarChart3}
      iconColor="red"
      className="flex flex-col h-full"
      headerAction={
        events.trendValue !== 0 ? (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            events.trend === 'up' ? 'text-orange-600' : events.trend === 'down' ? 'text-green-600' : 'text-slate-600'
          }`}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(events.trendValue)}%</span>
          </div>
        ) : undefined
      }
    >

      {/* Time Range Selector */}
      <div className="flex gap-2 mb-6">
        {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              timeRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
          </button>
        ))}
      </div>

      <div className="space-y-6 flex-1">
        {/* Earthquakes */}
        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="font-semibold text-slate-900">Earthquakes</span>
            </div>
            <span className="text-2xl font-bold text-orange-600">{events.earthquakes.total}</span>
          </div>
          
          <div className="space-y-2">
            {Object.entries(events.earthquakes.byMagnitude).map(([level, count]) => (
              <div key={level} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getMagnitudeColor(level)}`}></div>
                  <span className="text-slate-700 capitalize">{level}</span>
                  <span className="text-xs text-slate-500">
                    {level === 'minor' && '< 4.0'}
                    {level === 'light' && '4.0-4.9'}
                    {level === 'moderate' && '5.0-5.9'}
                    {level === 'strong' && '6.0-6.9'}
                    {level === 'major' && '7.0+'}
                  </span>
                </div>
                <span className="font-medium text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tsunamis */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Waves className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-slate-900">Tsunamis</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{events.tsunamis.total}</span>
          </div>
          
          <div className="space-y-2">
            {Object.entries(events.tsunamis.bySeverity).map(([level, count]) => (
              <div key={level} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getSeverityColor(level)}`}></div>
                  <span className="text-slate-700 capitalize">{level}</span>
                </div>
                <span className="font-medium text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex-shrink-0">
        <div className="text-xs text-slate-500 text-center">
          Total: {events.earthquakes.total + events.tsunamis.total} events in {timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : '30 days'}
        </div>
      </div>
    </WidgetCard>
  )
}
