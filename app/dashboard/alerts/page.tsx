'use client'

import { useEffect, useState, useMemo } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { AlertTriangle, Clock, MapPin, Activity, Globe, CheckCircle, XCircle } from 'lucide-react'
import WidgetCard from '@/components/dashboard/WidgetCard'
import TimeRangeSwitcher from '@/components/status/TimeRangeSwitcher'

export const dynamic = 'force-dynamic'

type RangeKey = '24h' | '7d' | '30d'

type ServiceStatus = {
  status: string
  responseTime?: number
  lastCheck?: number
  error?: string
}

export default function EarthquakeMonitoringPage() {
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState({ total: 0, last24h: 0 })
  const [loading, setLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [timeRange, setTimeRange] = useState<RangeKey>('24h')
  const [isPaused, setIsPaused] = useState(false)
  const [monitoringActive, setMonitoringActive] = useState(false)
  const [sourceHealth, setSourceHealth] = useState<{ usgs?: ServiceStatus; emsc?: ServiceStatus; jma?: ServiceStatus; iris?: ServiceStatus }>({})
  const ALERTS_PER_PAGE = 20

  // Fetch earthquake alerts with cache: 'no-store'
  useEffect(() => {
    if (isPaused) return

    const fetchAlerts = async () => {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const response = await fetch(`/api/alerts/history?limit=200&startDate=${thirtyDaysAgo}`, { cache: 'no-store' })
        const data = await response.json()
        if (data.success) {
          const allAlerts = data.data?.alerts || []
          setAlerts(allAlerts)
          setHasMore(allAlerts.length > ALERTS_PER_PAGE)
          
          // Calculate real stats from alerts
          const now = Date.now()
          const dayAgo = now - 24 * 60 * 60 * 1000
          
          setStats({
            total: allAlerts.length,
            last24h: allAlerts.filter((a: any) => {
              const alertTime = new Date(a.timestamp).getTime()
              return alertTime > dayAgo
            }).length
          })
        }
      } catch (error) {
        console.error('Failed to fetch alerts:', error)
      } finally {
        setLoading(false)
        setIsInitialLoad(false)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [isPaused])

  // Fetch monitoring status
  useEffect(() => {
    const fetchMonitoring = async () => {
      try {
        const response = await fetch('/api/monitoring', { cache: 'no-store' })
        const data = await response.json()
        if (data.success) {
          setMonitoringActive(data.isMonitoring ?? false)
        }
      } catch (error) {
        console.error('Failed to fetch monitoring status:', error)
      }
    }

    fetchMonitoring()
    const interval = setInterval(fetchMonitoring, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch source health (USGS/EMSC/JMA/IRIS)
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health?detailed=true&record=true', { cache: 'no-store' })
        const data = await response.json()
        
        if (data?.checks?.services) {
          const services = data.checks.services
          const now = Date.now()
          
          setSourceHealth({
            usgs: {
              status: services.usgs?.status || 'unknown',
              responseTime: services.usgs?.latencyMs,
              lastCheck: now,
              error: services.usgs?.error
            },
            emsc: {
              status: services.emsc?.status || 'unknown',
              responseTime: services.emsc?.latencyMs,
              lastCheck: now,
              error: services.emsc?.error
            },
            jma: {
              status: services.jma?.status || 'unknown',
              responseTime: services.jma?.latencyMs,
              lastCheck: now,
              error: services.jma?.error
            },
            iris: {
              status: services.iris?.status || 'unknown',
              responseTime: services.iris?.latencyMs,
              lastCheck: now,
              error: services.iris?.error
            }
          })
        }
      } catch (error) {
        console.error('Failed to fetch source health:', error)
      }
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  // Filter alerts by time range
  const filteredAlerts = useMemo(() => {
    const now = Date.now()
    const timeWindows = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }
    const since = now - timeWindows[timeRange]

    return alerts.filter((alert: any) => {
      const alertTime = new Date(alert.timestamp).getTime()
      return alertTime >= since
    })
  }, [alerts, timeRange])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'critical':
      case 'error':
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-slate-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical':
      case 'error':
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  return (
    <AuthGuard>
      <AppLayout 
        title="Earthquake Monitoring"
        breadcrumbs={[
          { label: 'Earthquake Monitoring' }
        ]}
      >
        <div className="space-y-6">
          {/* Alert Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WidgetCard
              title="Total Alerts"
              icon={AlertTriangle}
              iconColor="orange"
              subtitle="All tracked earthquake alerts"
            >
              <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
            </WidgetCard>
            
            <WidgetCard
              title="Last 24 Hours"
              icon={Clock}
              iconColor="blue"
              subtitle="Recent seismic activity"
            >
              <div className="text-3xl font-bold text-slate-900">{stats.last24h}</div>
            </WidgetCard>
            
            <WidgetCard
              title="Monitoring Status"
              icon={Activity}
              iconColor={monitoringActive ? 'green' : 'slate'}
              subtitle="Real-time feed status"
            >
              <div className={`text-3xl font-bold ${monitoringActive ? 'text-green-600' : 'text-slate-600'}`}>
                {monitoringActive ? 'Active' : 'Paused'}
              </div>
            </WidgetCard>
          </div>

          {/* Source Health */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <WidgetCard
              title="USGS"
              icon={Globe}
              iconColor="blue"
              subtitle="Primary earthquake source"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(sourceHealth.usgs?.status || 'unknown')}
                  <div className={`px-2 py-1 text-xs font-medium rounded border ${
                    getStatusColor(sourceHealth.usgs?.status || 'unknown')
                  }`}>
                    {sourceHealth.usgs?.status === 'healthy' || sourceHealth.usgs?.status === 'ok' ? 'Operational' :
                     sourceHealth.usgs?.status === 'warning' || sourceHealth.usgs?.status === 'degraded' ? 'Degraded' :
                     sourceHealth.usgs?.status === 'critical' || sourceHealth.usgs?.status === 'error' ? 'Down' :
                     'Unknown'}
                  </div>
                </div>
                {sourceHealth.usgs?.responseTime && (
                  <div className="text-xs text-slate-600">
                    {sourceHealth.usgs.responseTime}ms
                  </div>
                )}
              </div>
            </WidgetCard>

            <WidgetCard
              title="EMSC"
              icon={Globe}
              iconColor="cyan"
              subtitle="European seismic data"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(sourceHealth.emsc?.status || 'unknown')}
                  <div className={`px-2 py-1 text-xs font-medium rounded border ${
                    getStatusColor(sourceHealth.emsc?.status || 'unknown')
                  }`}>
                    {sourceHealth.emsc?.status === 'healthy' || sourceHealth.emsc?.status === 'ok' ? 'Operational' :
                     sourceHealth.emsc?.status === 'warning' || sourceHealth.emsc?.status === 'degraded' ? 'Degraded' :
                     sourceHealth.emsc?.status === 'critical' || sourceHealth.emsc?.status === 'error' ? 'Down' :
                     'Unknown'}
                  </div>
                </div>
                {sourceHealth.emsc?.responseTime && (
                  <div className="text-xs text-slate-600">
                    {sourceHealth.emsc.responseTime}ms
                  </div>
                )}
              </div>
            </WidgetCard>

            <WidgetCard
              title="JMA"
              icon={Globe}
              iconColor="purple"
              subtitle="Japan Meteorological"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(sourceHealth.jma?.status || 'unknown')}
                  <div className={`px-2 py-1 text-xs font-medium rounded border ${
                    getStatusColor(sourceHealth.jma?.status || 'unknown')
                  }`}>
                    {sourceHealth.jma?.status === 'healthy' || sourceHealth.jma?.status === 'ok' ? 'Operational' :
                     sourceHealth.jma?.status === 'warning' || sourceHealth.jma?.status === 'degraded' ? 'Degraded' :
                     sourceHealth.jma?.status === 'critical' || sourceHealth.jma?.status === 'error' ? 'Down' :
                     'Unknown'}
                  </div>
                </div>
                {sourceHealth.jma?.responseTime && (
                  <div className="text-xs text-slate-600">
                    {sourceHealth.jma.responseTime}ms
                  </div>
                )}
              </div>
            </WidgetCard>

            <WidgetCard
              title="IRIS"
              icon={Globe}
              iconColor="green"
              subtitle="Seismology consortium"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(sourceHealth.iris?.status || 'unknown')}
                  <div className={`px-2 py-1 text-xs font-medium rounded border ${
                    getStatusColor(sourceHealth.iris?.status || 'unknown')
                  }`}>
                    {sourceHealth.iris?.status === 'healthy' || sourceHealth.iris?.status === 'ok' ? 'Operational' :
                     sourceHealth.iris?.status === 'warning' || sourceHealth.iris?.status === 'degraded' ? 'Degraded' :
                     sourceHealth.iris?.status === 'critical' || sourceHealth.iris?.status === 'error' ? 'Down' :
                     'Unknown'}
                  </div>
                </div>
                {sourceHealth.iris?.responseTime && (
                  <div className="text-xs text-slate-600">
                    {sourceHealth.iris.responseTime}ms
                  </div>
                )}
              </div>
            </WidgetCard>
          </div>

          {/* Alerts List */}
          <WidgetCard
            title="Recent Earthquake Alerts"
            icon={AlertTriangle}
            iconColor="orange"
            subtitle={`${filteredAlerts.length} alerts in selected range`}
            className="flex flex-col min-h-0"
            noPadding
            headerAction={
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Auto-refresh every 30s</span>
                <TimeRangeSwitcher value={timeRange} onChange={setTimeRange} />
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isPaused
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {isPaused ? 'Paused' : 'Live'}
                </button>
              </div>
            }
          >
            <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: '600px' }}>
              {loading && isInitialLoad ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-slate-600">Loading alerts...</p>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Earthquake Alerts Found</h3>
                  <p className="text-slate-600">No seismic alerts have been dispatched yet.</p>
                </div>
              ) : (
                <>
                <div className="space-y-4">
                  {filteredAlerts.slice(0, page * ALERTS_PER_PAGE).map((alert: any, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-slate-900">
                              Magnitude {alert.magnitude}
                            </span>
                            <span className="text-sm text-slate-500">•</span>
                            <span className="text-sm text-slate-600">{alert.location}</span>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{alert.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-slate-500">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(alert.timestamp).toLocaleString()}
                            </span>
                            {alert.location && (
                              <span className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {alert.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`px-2 py-1 text-xs font-medium rounded ${
                          alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {alert.severity || 'low'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Load More Button */}
                {page * ALERTS_PER_PAGE < filteredAlerts.length && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={loadingMore}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? 'Loading...' : `Load More (${filteredAlerts.length - page * ALERTS_PER_PAGE} remaining)`}
                    </button>
                  </div>
                )}
                
                {/* Showing count */}
                <div className="mt-4 text-center text-sm text-slate-600">
                  Showing {Math.min(page * ALERTS_PER_PAGE, filteredAlerts.length)} of {filteredAlerts.length} alerts
                </div>
                </>
              )}
            </div>
          </WidgetCard>
        </div>
      </AppLayout>
    </AuthGuard>
  )
}
