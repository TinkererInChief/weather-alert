'use client'

import { useEffect, useState } from 'react'
import { Activity, CheckCircle, AlertTriangle, XCircle, Clock, Wifi, Radio } from 'lucide-react'
import WidgetCard from './WidgetCard'
import HelpTooltip from '../guidance/HelpTooltip'

type FeedStatus = {
  id: string
  name: string
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  lastCheck: string
  responseTime?: number
  error?: string
}

type OverallHealth = {
  status: 'healthy' | 'degraded' | 'critical'
  healthyCount: number
  totalCount: number
  feeds: FeedStatus[]
}

type FeedStatusWidgetProps = {
  refreshKey?: number
}

export default function FeedStatusWidget({ refreshKey }: FeedStatusWidgetProps = {}) {
  const [health, setHealth] = useState<OverallHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        // Only show loading on initial load, not on refresh
        if (!health) setLoading(true)
        const response = await fetch('/api/health?detailed=true', { cache: 'no-store' })
        const data = await response.json()
        
        if (data.status) {
          const services = data.checks?.services || {}
          const db = data.checks?.database || {}
          const redis = data.checks?.redis || {}

          const feeds: FeedStatus[] = [
            { id: 'usgs', name: 'USGS Earthquake Feed', status: mapStatus(services.usgs?.status), lastCheck: new Date().toISOString(), responseTime: services.usgs?.latencyMs },
            { id: 'noaa', name: 'NOAA Tsunami Alerts', status: mapStatus(services.noaa?.status), lastCheck: new Date().toISOString(), responseTime: services.noaa?.latencyMs },
            { id: 'ptwc', name: 'PTWC Tsunami Feed', status: mapStatus(services.ptwc?.status), lastCheck: new Date().toISOString(), responseTime: services.ptwc?.latencyMs },
            { id: 'emsc', name: 'EMSC Earthquake Feed', status: mapStatus(services.emsc?.status), lastCheck: new Date().toISOString(), responseTime: services.emsc?.latencyMs },
            { id: 'jma', name: 'JMA Quick Reports', status: mapStatus(services.jma?.status), lastCheck: new Date().toISOString(), responseTime: services.jma?.latencyMs },
            { id: 'iris', name: 'IRIS Event Service', status: mapStatus(services.iris?.status), lastCheck: new Date().toISOString(), responseTime: services.iris?.latencyMs },
            // Infra (helps diagnose):
            { id: 'database', name: 'Database', status: mapStatus(db.status), lastCheck: new Date().toISOString(), responseTime: db.latencyMs },
            { id: 'redis', name: 'Redis Cache', status: mapStatus(redis.status), lastCheck: new Date().toISOString(), responseTime: redis.latencyMs },
          ]

          const healthyCount = feeds.filter(f => f.status === 'healthy').length
          const overallStatus = healthyCount === feeds.length ? 'healthy' : healthyCount > 0 ? 'degraded' : 'critical'

          setHealth({ status: overallStatus, healthyCount, totalCount: feeds.length, feeds })
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch feed status')
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30 * 1000)
    return () => clearInterval(interval)
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const mapStatus = (status: any): 'healthy' | 'warning' | 'critical' | 'unknown' => {
    if (status === 'ok' || status === 'healthy') return 'healthy'
    if (status === 'unhealthy' || status === 'error') return 'critical'
    if (status === 'warning' || status === 'degraded') return 'warning'
    return 'unknown'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <AlertTriangle className="h-4 w-4 text-slate-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-50 border-green-200'
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      case 'critical': return 'bg-red-50 border-red-200'
      default: return 'bg-slate-50 border-slate-200'
    }
  }

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50'
      case 'degraded': return 'text-yellow-600 bg-yellow-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-slate-600 bg-slate-50'
    }
  }

  const formatLastCheck = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  if (loading) {
    return (
      <WidgetCard title="Data Feed Status" icon={Radio} iconColor="green" subtitle="Real-time earthquake data sources">
        <div className="animate-pulse">
          <div className="h-16 bg-slate-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-slate-200 rounded"></div>
            <div className="h-12 bg-slate-200 rounded"></div>
            <div className="h-12 bg-slate-200 rounded"></div>
          </div>
        </div>
      </WidgetCard>
    )
  }

  if (error) {
    return (
      <WidgetCard title="Data Feed Status" icon={Radio} iconColor="green" subtitle="Real-time earthquake data sources">
        <p className="text-sm text-red-600">{error}</p>
      </WidgetCard>
    )
  }

  if (!health) return null

  return (
    <WidgetCard
      title="Data Feed Status"
      icon={Radio}
      iconColor="green"
      subtitle="Real-time earthquake data sources"
      headerAction={
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getOverallStatusColor(health.status)}`}>
          {health.status === 'healthy' ? '● All Systems Operational' :
           health.status === 'degraded' ? '● Partial Outage' : '● Service Disruption'}
        </div>
      }
    >

      <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wifi className="h-5 w-5 text-slate-600" />
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-slate-900">Overall Health</div>
                <HelpTooltip 
                  title="Multi-Source Aggregation"
                  content="Events aggregated from USGS, EMSC, JMA, and IRIS. Color indicates source quality."
                  side="right"
                />
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {health.healthyCount} of {health.totalCount} feeds operational
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {Math.round((health.healthyCount / health.totalCount) * 100)}%
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {health.feeds.map((feed) => (
          <div 
            key={feed.id}
            className={`p-3 rounded-lg border ${getStatusColor(feed.status)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1">
                {getStatusIcon(feed.status)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900 truncate">
                    {feed.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {formatLastCheck(feed.lastCheck)}
                    </div>
                    {feed.responseTime && (
                      <div className="text-xs text-slate-500">
                        • {feed.responseTime}ms
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500 text-center">
          Auto-refreshing every 30 seconds
        </div>
      </div>
    </WidgetCard>
  )
}
