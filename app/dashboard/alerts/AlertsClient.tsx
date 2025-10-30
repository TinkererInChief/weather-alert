'use client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

import { useEffect, useState, useMemo } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { 
  AlertTriangle, Clock, MapPin, Activity, Globe, CheckCircle, XCircle,
  TrendingUp, Users, BarChart3, Filter, RefreshCw, Download, Search, X, ChevronUp, ChevronDown
} from 'lucide-react'
import TimeRangeSwitcher from '@/components/status/TimeRangeSwitcher'
import { Can } from '@/components/auth/Can'
import { Permission } from '@/lib/rbac/roles'
import { getMagnitudeClasses } from '@/lib/utils/event-colors'
import EventHoverCard from '@/components/shared/EventHoverCard'
import { EarthquakeEvent } from '@/types/event-hover'
import WidgetCard from '@/components/dashboard/WidgetCard'
import { useEarthquakeTour } from '@/hooks/useTour'
import { TourId } from '@/lib/guidance/tours'
import HelpButton from '@/components/guidance/HelpButton'
import HelpTooltip from '@/components/guidance/HelpTooltip'

type RangeKey = '24h' | '7d' | '30d'
type TabKey = 'live' | 'analytics'
type ServiceStatus = {
  status: string
  responseTime?: number
  lastCheck?: number
  error?: string
}

type Alert = {
  id: string
  earthquakeId: string
  magnitude: number
  location: string
  latitude: number | null
  longitude: number | null
  depth: number | null
  timestamp: string
  contactsNotified: number
  success: boolean
  errorMessage: string | null
  severity?: string
  description?: string
}

type Stats = {
  overview: {
    totalAlerts: number
    successfulAlerts: number
    failedAlerts: number
    successRate: number
    avgContactsNotified: number
    totalContactsNotified: number
  }
  magnitudeStats: {
    average: number
    min: number
    max: number
  }
  magnitudeDistribution: Array<{ magnitude: number; _count: { magnitude: number } }>
  topLocations: Array<{ location: string; _count: { location: number } }>
  successByMagnitude: Array<{
    magnitudeRange: string
    total: number
    successful: number
    successRate: string
  }>
}

export default function EarthquakeMonitoringPage() {
  // Tour integration
  const earthquakeTour = useEarthquakeTour(true)
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('live')
  
  // Live feed state
  const [alerts, setAlerts] = useState<any[]>([])
  const [liveStats, setLiveStats] = useState({ total: 0, last24h: 0 })
  const [loading, setLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [livePage, setLivePage] = useState(1)
  const [timeRange, setTimeRange] = useState<RangeKey>('24h')
  const [isPaused, setIsPaused] = useState(false)
  const [monitoringActive, setMonitoringActive] = useState(false)
  const [sourceHealth, setSourceHealth] = useState<{ usgs?: ServiceStatus; emsc?: ServiceStatus; jma?: ServiceStatus; iris?: ServiceStatus }>({})
  
  // Analytics state
  const [analyticsAlerts, setAnalyticsAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsPage, setAnalyticsPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    minMagnitude: '',
    maxMagnitude: '',
    success: '',
    startDate: '',
    endDate: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [sortColumn, setSortColumn] = useState<'timestamp' | 'magnitude' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  // Shared state
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'info' | 'success' | 'error'; message: string }>>([])
  
  const ALERTS_PER_PAGE = 20

  // Toast helper
  const addToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.floor(Math.random() * 1_000_000_000)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if (activeTab === 'live') {
        await fetchLiveAlerts()
      } else {
        await fetchAnalyticsAlerts()
        await fetchStats()
      }
      setLastUpdated(new Date())
      addToast('Data refreshed successfully', 'success')
    } catch (error) {
      addToast('Failed to refresh data', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  // Fetch live alerts
  const fetchLiveAlerts = async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const response = await fetch(`/api/alerts/history?limit=200&startDate=${thirtyDaysAgo}`, { cache: 'no-store' })
      const data = await response.json()
      if (data.success) {
        const allAlerts = data.data?.alerts || []
        setAlerts(allAlerts)
        
        // Calculate stats
        const now = Date.now()
        const dayAgo = now - 24 * 60 * 60 * 1000
        
        setLiveStats({
          total: allAlerts.length,
          last24h: allAlerts.filter((a: any) => new Date(a.timestamp).getTime() > dayAgo).length
        })
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch live alerts:', error)
      addToast('Failed to fetch alerts', 'error')
    }
  }

  // Fetch analytics alerts
  const fetchAnalyticsAlerts = async () => {
    try {
      setAnalyticsLoading(true)
      
      const params = new URLSearchParams({
        page: analyticsPage.toString(),
        limit: '50'
      })
      
      if (filters.minMagnitude) params.append('minMagnitude', filters.minMagnitude)
      if (filters.maxMagnitude) params.append('maxMagnitude', filters.maxMagnitude)
      if (filters.success) params.append('success', filters.success)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      
      const response = await fetch(`/api/alerts/history?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setAnalyticsAlerts(data.data.alerts)
        setTotalPages(data.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch analytics alerts:', error)
      addToast('Failed to fetch alerts', 'error')
    } finally {
      setAnalyticsLoading(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/alerts/stats?days=30')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault()
        setActiveTab('live')
      } else if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault()
        setActiveTab('analytics')
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Fetch live alerts with auto-refresh
  useEffect(() => {
    if (isPaused || activeTab !== 'live') return

    fetchLiveAlerts()
    setLoading(false)
    setIsInitialLoad(false)

    const interval = setInterval(fetchLiveAlerts, 30000)
    return () => clearInterval(interval)
  }, [isPaused, activeTab])

  // Fetch analytics data when switching to analytics tab
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsAlerts()
      fetchStats()
    }
  }, [activeTab, analyticsPage, filters])

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

  // Filter live alerts by time range
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

  // Helper functions
  const getMagnitudeColor = (magnitude: number) => {
    return getMagnitudeClasses(magnitude).combined
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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
        title="Earthquake Alerts"
        breadcrumbs={[
          { label: 'Alerts' }
        ]}
      >
        <div className="space-y-6">
          {/* Tab Navigation with Help Button */}
          <div id="earthquake-header" className="flex items-center justify-between border-b border-slate-200">
            <nav id="live-analytics-tabs" className="flex gap-8" role="tablist">
              <button
                onClick={() => setActiveTab('live')}
                className={`pb-4 px-1 font-medium text-sm transition-colors relative ${
                  activeTab === 'live'
                    ? 'text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                role="tab"
                aria-selected={activeTab === 'live'}
              >
                Live Feed
                {activeTab === 'live' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`pb-4 px-1 font-medium text-sm transition-colors relative ${
                  activeTab === 'analytics'
                    ? 'text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                role="tab"
                aria-selected={activeTab === 'analytics'}
              >
                Analytics & History
                {activeTab === 'analytics' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            </nav>
            <div className="flex items-center">
              <HelpButton 
                tours={[
                  {
                    id: TourId.EARTHQUAKE,
                    label: 'Earthquake Tour',
                    onStart: () => earthquakeTour.restartTour()
                  }
                ]}
              />
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <div>
              {lastUpdated && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="h-4 w-4" />
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Hero Metrics */}
          {activeTab === 'live' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Alerts */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    30d
                  </div>
                </div>
                <h3 className="text-sm font-medium text-orange-900/70 mb-1">Total Alerts</h3>
                <p className="text-3xl font-bold text-orange-900">{liveStats.total}</p>
              </div>

              {/* Last 24h */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-blue-900/70 mb-1">Last 24 Hours</h3>
                <p className="text-3xl font-bold text-blue-900">{liveStats.last24h}</p>
              </div>

              {/* Monitoring Status */}
              <div className={`bg-gradient-to-br rounded-xl p-6 border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${
                monitoringActive 
                  ? 'from-green-50 to-emerald-50 border-green-100' 
                  : 'from-slate-50 to-gray-50 border-slate-100'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <Activity className={`h-6 w-6 ${monitoringActive ? 'text-green-600' : 'text-slate-600'}`} />
                  </div>
                  {monitoringActive && (
                    <div className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Live
                    </div>
                  )}
                </div>
                <h3 className={`text-sm font-medium mb-1 ${monitoringActive ? 'text-green-900/70' : 'text-slate-900/70'}`}>
                  Monitoring Status
                </h3>
                <p className={`text-3xl font-bold ${monitoringActive ? 'text-green-900' : 'text-slate-900'}`}>
                  {monitoringActive ? 'Active' : 'Paused'}
                </p>
              </div>
            </div>
          ) : (
            stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Total Alerts */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <Activity className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-blue-900/70 mb-1">Total Alerts</h3>
                  <p className="text-3xl font-bold text-blue-900">{(stats?.overview?.totalAlerts ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-blue-700 mt-1">Last 30 days</p>
                </div>

                {/* Success Rate */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-green-900/70 mb-1">Success Rate</h3>
                  <p className="text-3xl font-bold text-green-900">{stats.overview.successRate.toFixed(1)}%</p>
                  <p className="text-xs text-green-700 mt-1">{stats.overview.successfulAlerts} successful</p>
                </div>

                {/* Avg Magnitude */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <BarChart3 className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-purple-900/70 mb-1">Avg Magnitude</h3>
                  <p className="text-3xl font-bold text-purple-900">{stats.magnitudeStats.average.toFixed(1)}</p>
                  <p className="text-xs text-purple-700 mt-1">
                    Range: {stats.magnitudeStats.min.toFixed(1)} - {stats.magnitudeStats.max.toFixed(1)}
                  </p>
                </div>

                {/* Contacts Notified */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <Users className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-orange-900/70 mb-1">Contacts Notified</h3>
                  <p className="text-3xl font-bold text-orange-900">{(stats?.overview?.totalContactsNotified ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-orange-700 mt-1">
                    Avg: {(stats?.overview?.avgContactsNotified ?? 0).toFixed(0)} per alert
                  </p>
                </div>
              </div>
            )
          )}

          {/* Tab Content */}
          {activeTab === 'live' ? (
            <>
              {/* Source Health - Live Feed Only */}
              <div id="source-health" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div id="data-sources">
            <WidgetCard
              title="USGS"
              subtitle="US Geological Survey"
              icon={Globe}
              iconColor="blue"
              headerAction={
                <HelpTooltip 
                  title="Source Health"
                  content="Real-time connectivity to data sources. Green = Operational, Yellow = Degraded, Red = Down. Response time shown in ms."
                  side="left"
                />
              }
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
            </div>

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
          <div id="earthquake-list">
          <WidgetCard
            title="Recent Earthquake Alerts"
            icon={AlertTriangle}
            iconColor="orange"
            subtitle={`${filteredAlerts.length} alerts in selected range`}
            className="flex flex-col min-h-0"
            noPadding
            headerAction={
              <div id="magnitude-filter" className="flex items-center gap-3">
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
                <div className="space-y-4 p-6">
                  {filteredAlerts.slice(0, livePage * ALERTS_PER_PAGE).map((alert: any, index) => {
                    const earthquakeEvent: EarthquakeEvent = {
                      id: alert.earthquakeId || alert.id,
                      magnitude: alert.magnitude,
                      location: alert.location,
                      latitude: alert.latitude ?? 0,
                      longitude: alert.longitude ?? 0,
                      depth: alert.depth ?? 0,
                      time: alert.timestamp,
                      place: alert.location,
                    }
                    
                    return (
                      <EventHoverCard
                        key={alert.id}
                        event={earthquakeEvent}
                        type="earthquake"
                      >
                        <div className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
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
                      </EventHoverCard>
                    )
                  })}
                </div>
                
                {/* Load More Button */}
                {livePage * ALERTS_PER_PAGE < filteredAlerts.length && (
                  <div className="mt-6 text-center pb-6">
                    <button
                      onClick={() => setLivePage(p => p + 1)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      Load More ({filteredAlerts.length - livePage * ALERTS_PER_PAGE} remaining)
                    </button>
                  </div>
                )}
                
                {/* Showing count */}
                <div className="mt-4 text-center text-sm text-slate-600 pb-6">
                  Showing {Math.min(livePage * ALERTS_PER_PAGE, filteredAlerts.length)} of {filteredAlerts.length} alerts
                </div>
                </>
              )}
            </div>
          </WidgetCard>
          </div>
            </>
          ) : (
            <Can permission={Permission.VIEW_ALERTS} fallback={
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-700">
                You don't have permission to view alert history.
              </div>
            }>
              {/* Analytics Tab Content - Success by Magnitude, Top Locations, Filters, History Table */}
              {stats && (
                <>
                  {/* Success by Magnitude */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Success Rate by Magnitude
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {stats.successByMagnitude.map((range) => (
                        <div key={range.magnitudeRange} className="p-4 bg-slate-50 rounded-lg">
                          <div className="font-medium text-slate-900 mb-2">
                            Magnitude {range.magnitudeRange}
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Total:</span>
                              <span className="font-medium">{range.total}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Success:</span>
                              <span className="font-medium text-green-600">{range.successful}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Rate:</span>
                              <span className="font-medium">{range.successRate}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Locations */}
                  {stats.topLocations.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        Top Alert Locations
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stats.topLocations.slice(0, 6).map((loc, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-900">{loc.location}</span>
                            </div>
                            <span className="text-sm font-medium text-slate-600">
                              {loc._count.location} alerts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Filters */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
                
                {showFilters && (
                  <div className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Min Magnitude
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={filters.minMagnitude}
                          onChange={(e) => setFilters({ ...filters, minMagnitude: e.target.value })}
                          placeholder="e.g., 5.0"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Max Magnitude
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={filters.maxMagnitude}
                          onChange={(e) => setFilters({ ...filters, maxMagnitude: e.target.value })}
                          placeholder="e.g., 7.0"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Status
                        </label>
                        <select
                          value={filters.success}
                          onChange={(e) => setFilters({ ...filters, success: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All</option>
                          <option value="true">Successful</option>
                          <option value="false">Failed</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => {
                          setFilters({ minMagnitude: '', maxMagnitude: '', success: '', startDate: '', endDate: '' })
                          setAnalyticsPage(1)
                        }}
                        className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        Clear Filters
                      </button>
                      <button
                        onClick={() => setAnalyticsPage(1)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Alerts History Table */}
              {analyticsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="text-slate-600 mt-4">Loading alerts...</p>
                </div>
              ) : analyticsAlerts.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <AlertTriangle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    No alerts found
                  </h3>
                  <p className="text-slate-600">
                    Try adjusting your filters or check back later
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[20%] cursor-pointer hover:bg-slate-100 transition-colors"
                              onClick={() => {
                                if (sortColumn === 'timestamp') {
                                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                                } else {
                                  setSortColumn('timestamp')
                                  setSortDirection('desc')
                                }
                              }}
                            >
                              <div className="flex items-center gap-1">
                                Timestamp
                                {sortColumn === 'timestamp' && (
                                  sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[36%]">
                              Location
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[12%] cursor-pointer hover:bg-slate-100 transition-colors"
                              onClick={() => {
                                if (sortColumn === 'magnitude') {
                                  setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                                } else {
                                  setSortColumn('magnitude')
                                  setSortDirection('desc')
                                }
                              }}
                            >
                              <div className="flex items-center gap-1">
                                Magnitude
                                <HelpTooltip 
                                  title="Magnitude Scale"
                                  content="Color-coded severity: <4.0 (Minor/green), 4.0-4.9 (Light/yellow), 5.0-5.9 (Moderate/orange), 6.0-6.9 (Strong/red), 7.0+ (Major/purple). Higher = more energy."
                                  side="top"
                                />
                                {sortColumn === 'magnitude' && (
                                  sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[12%]">
                              <div className="flex items-center gap-2">
                                Depth
                                <HelpTooltip 
                                  title="Earthquake Depth"
                                  content="Distance below surface: Shallow (<70km) causes more damage, Intermediate (70-300km), Deep (>300km). Depth affects wave propagation."
                                  side="top"
                                />
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[10%]">
                              <div className="flex items-center gap-2">
                                Contacts
                                <HelpTooltip 
                                  title="Notified Contacts"
                                  content="Number of contacts notified based on proximity to epicenter. Calculated using distance thresholds and severity."
                                  side="top"
                                />
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-[10%]">
                              <div className="flex items-center gap-2">
                                Status
                                <HelpTooltip 
                                  title="Alert Delivery Status"
                                  content="Success = All messages delivered. Failed = Some delivery issues. Check logs for details."
                                  side="top"
                                />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {[...analyticsAlerts].sort((a, b) => {
                            if (!sortColumn) return 0
                            if (sortColumn === 'timestamp') {
                              const timeA = new Date(a.timestamp).getTime()
                              const timeB = new Date(b.timestamp).getTime()
                              return sortDirection === 'asc' ? timeA - timeB : timeB - timeA
                            }
                            if (sortColumn === 'magnitude') {
                              return sortDirection === 'asc' ? a.magnitude - b.magnitude : b.magnitude - a.magnitude
                            }
                            return 0
                          }).map((alert) => {
                            const earthquakeEvent: EarthquakeEvent = {
                              id: alert.id,
                              magnitude: alert.magnitude,
                              location: alert.location,
                              latitude: alert.latitude ?? 0,
                              longitude: alert.longitude ?? 0,
                              depth: alert.depth ?? 0,
                              time: alert.timestamp,
                              place: alert.location,
                            }
                            
                            return (
                              <EventHoverCard
                                key={alert.id}
                                event={earthquakeEvent}
                                type="earthquake"
                              >
                                <tr className="hover:bg-slate-50 transition-colors cursor-pointer">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 w-[20%]">
                                    {formatDate(alert.timestamp)}
                                  </td>
                                  <td className="px-6 py-4 w-[36%]">
                                    <div className="text-sm text-slate-900 max-w-xs truncate">
                                      {alert.location}
                                    </div>
                                    {alert.latitude && alert.longitude && (
                                      <div className="text-xs text-slate-500">
                                        {alert.latitude.toFixed(2)}°, {alert.longitude.toFixed(2)}°
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap w-[12%]">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMagnitudeColor(alert.magnitude)}`}>
                                      M{alert.magnitude.toFixed(1)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 w-[12%]">
                                    {alert.depth ? `${alert.depth.toFixed(1)} km` : 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 w-[10%]">
                                    {alert.contactsNotified}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap w-[10%]">
                                    {alert.success ? (
                                      <span className="inline-flex items-center gap-1 text-green-600">
                                        <CheckCircle className="h-4 w-4" />
                                        <span className="text-sm">Success</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-red-600">
                                        <XCircle className="h-4 w-4" />
                                        <span className="text-sm">Failed</span>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              </EventHoverCard>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-6">
                      <p className="text-sm text-slate-600">
                        Page {analyticsPage} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAnalyticsPage(p => Math.max(1, p - 1))}
                          disabled={analyticsPage === 1}
                          className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setAnalyticsPage(p => Math.min(totalPages, p + 1))}
                          disabled={analyticsPage === totalPages}
                          className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Can>
          )}

          {/* Toast Notifications */}
          {toasts.length > 0 && (
            <div className="fixed top-4 right-4 z-50 space-y-2">
              {toasts.map(t => (
                <div
                  key={t.id}
                  role="status"
                  className={`min-w-[260px] max-w-sm px-4 py-3 rounded-xl shadow-lg border text-sm ${
                    t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                    t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                    'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {t.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  )
}
