'use client'

import { useEffect, useState, useMemo } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { Waves, Clock, MapPin, Activity, Globe, Wifi, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
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

export default function TsunamiMonitoringPage() {
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState({ total: 0, last24h: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [timeRange, setTimeRange] = useState<RangeKey>('24h')
  const [isPaused, setIsPaused] = useState(false)
  const [monitoringActive, setMonitoringActive] = useState(false)
  const [sourceHealth, setSourceHealth] = useState<{ noaa?: ServiceStatus; ptwc?: ServiceStatus }>({})
  const ALERTS_PER_PAGE = 20

  // Fetch tsunami alerts with cache: 'no-store'
  useEffect(() => {
    if (isPaused) return

    const fetchAlerts = async () => {
      try {
        const response = await fetch('/api/tsunami', { cache: 'no-store' })
        const data = await response.json()
        
        if (data.success) {
          const allAlerts = data.data?.alerts || data.alerts || []
          setAlerts(allAlerts)
          
          // Calculate stats
          const now = Date.now()
          const dayAgo = now - 24 * 60 * 60 * 1000
          
          setStats({
            total: allAlerts.length,
            last24h: allAlerts.filter((a: any) => {
              const alertTime = new Date(a.processedAt || a.createdAt || a.timestamp || a.time).getTime()
              return alertTime > dayAgo
            }).length
          })
        }
      } catch (error) {
        console.error('Failed to fetch tsunami alerts:', error)
      } finally {
        setLoading(false)
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
        const response = await fetch('/api/tsunami/monitor', { cache: 'no-store' })
        const data = await response.json()
        if (data.success) {
          setMonitoringActive(data.data?.monitoring?.isMonitoring ?? false)
        }
      } catch (error) {
        console.error('Failed to fetch monitoring status:', error)
      }
    }

    fetchMonitoring()
    const interval = setInterval(fetchMonitoring, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch source health (NOAA/PTWC)
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health?detailed=true&record=true', { cache: 'no-store' })
        const data = await response.json()
        
        if (data?.checks?.services) {
          const services = data.checks.services
          const now = Date.now()
          
          setSourceHealth({
            noaa: {
              status: services.noaa?.status || 'unknown',
              responseTime: services.noaa?.latencyMs,
              lastCheck: now,
              error: services.noaa?.error
            },
            ptwc: {
              status: services.ptwc?.status || 'unknown',
              responseTime: services.ptwc?.latencyMs,
              lastCheck: now,
              error: services.ptwc?.error
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
      const alertTime = new Date(alert.processedAt || alert.createdAt || alert.timestamp || alert.time).getTime()
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
        title="Tsunami Monitoring"
        breadcrumbs={[
          { label: 'Tsunami Monitoring' }
        ]}
      >
        <div className="space-y-6">
          {/* Alert Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WidgetCard
              title="Total Alerts"
              icon={Waves}
              iconColor="blue"
              subtitle="All tracked tsunami alerts"
            >
              <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
            </WidgetCard>
            
            <WidgetCard
              title="Last 24 Hours"
              icon={Clock}
              iconColor="cyan"
              subtitle="Recent tsunami activity"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <WidgetCard
              title="NOAA Tsunami"
              icon={Wifi}
              iconColor="blue"
              subtitle="Primary tsunami data source"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(sourceHealth.noaa?.status || 'unknown')}
                  <div className={`px-2 py-1 text-xs font-medium rounded border ${
                    getStatusColor(sourceHealth.noaa?.status || 'unknown')
                  }`}>
                    {sourceHealth.noaa?.status === 'healthy' || sourceHealth.noaa?.status === 'ok' ? 'Operational' :
                     sourceHealth.noaa?.status === 'warning' || sourceHealth.noaa?.status === 'degraded' ? 'Degraded' :
                     sourceHealth.noaa?.status === 'critical' || sourceHealth.noaa?.status === 'error' ? 'Down' :
                     'Unknown'}
                  </div>
                </div>
                {sourceHealth.noaa?.responseTime && (
                  <div className="text-sm text-slate-700">
                    {sourceHealth.noaa.responseTime}ms <span className="text-xs text-slate-500">response time</span>
                  </div>
                )}
                {sourceHealth.noaa?.lastCheck && (
                  <div className="text-xs text-slate-500">
                    Checked {new Date(sourceHealth.noaa.lastCheck).toLocaleTimeString()}
                  </div>
                )}
                {sourceHealth.noaa?.error && (
                  <div className="text-xs text-red-600 p-2 bg-red-50 rounded border border-red-100">
                    {sourceHealth.noaa.error}
                  </div>
                )}
              </div>
            </WidgetCard>

            <WidgetCard
              title="PTWC"
              icon={Globe}
              iconColor="cyan"
              subtitle="Pacific Tsunami Warning Center"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(sourceHealth.ptwc?.status || 'unknown')}
                  <div className={`px-2 py-1 text-xs font-medium rounded border ${
                    getStatusColor(sourceHealth.ptwc?.status || 'unknown')
                  }`}>
                    {sourceHealth.ptwc?.status === 'healthy' || sourceHealth.ptwc?.status === 'ok' ? 'Operational' :
                     sourceHealth.ptwc?.status === 'warning' || sourceHealth.ptwc?.status === 'degraded' ? 'Degraded' :
                     sourceHealth.ptwc?.status === 'critical' || sourceHealth.ptwc?.status === 'error' ? 'Down' :
                     'Unknown'}
                  </div>
                </div>
                {sourceHealth.ptwc?.responseTime && (
                  <div className="text-sm text-slate-700">
                    {sourceHealth.ptwc.responseTime}ms <span className="text-xs text-slate-500">response time</span>
                  </div>
                )}
                {sourceHealth.ptwc?.lastCheck && (
                  <div className="text-xs text-slate-500">
                    Checked {new Date(sourceHealth.ptwc.lastCheck).toLocaleTimeString()}
                  </div>
                )}
                {sourceHealth.ptwc?.error && (
                  <div className="text-xs text-red-600 p-2 bg-red-50 rounded border border-red-100">
                    {sourceHealth.ptwc.error}
                  </div>
                )}
              </div>
            </WidgetCard>
          </div>

          {/* Alerts List */}
          <WidgetCard
            title="Recent Tsunami Alerts"
            icon={Waves}
            iconColor="blue"
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
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-slate-600">Loading alerts...</p>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <Waves className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Tsunami Alerts Found</h3>
                  <p className="text-slate-600">No tsunami alerts have been dispatched yet.</p>
                </div>
              ) : (
                <>
                <div className="space-y-4">
                  {filteredAlerts.slice(0, page * ALERTS_PER_PAGE).map((alert: any, index) => (
                    <div key={alert.id || index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-slate-900">
                              {alert.title || alert.category || 'Tsunami Alert'}
                            </span>
                            <span className="text-sm text-slate-500">•</span>
                            <span className="text-sm text-slate-600">{alert.location || 'Unknown location'}</span>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{alert.description || alert.instruction || 'No description available'}</p>
                          <div className="flex items-center space-x-4 text-xs text-slate-500">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(alert.processedAt || alert.createdAt || alert.timestamp || alert.time).toLocaleString()}
                            </span>
                            {alert.location && (
                              <span className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {alert.location}
                              </span>
                            )}
                            {alert.threat && (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                alert.threat.level === 'warning' ? 'bg-red-100 text-red-800' :
                                alert.threat.level === 'watch' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {alert.threat.level}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`px-2 py-1 text-xs font-medium rounded ${
                          alert.severity >= 4 || alert.urgency === 'Immediate' ? 'bg-red-100 text-red-800' :
                          alert.severity >= 2 || alert.urgency === 'Expected' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.urgency || alert.category || 'Info'}
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
