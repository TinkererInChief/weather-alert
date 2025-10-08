'use client'

import { useEffect, useState, useMemo } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { 
  Waves, Clock, MapPin, Activity, Globe, Wifi, CheckCircle, AlertTriangle, XCircle,
  TrendingUp, BarChart3, Filter, RefreshCw, Download, Bell, BellOff
} from 'lucide-react'
import TimeRangeSwitcher from '@/components/status/TimeRangeSwitcher'
import { Can } from '@/components/auth/Can'
import { Permission } from '@/lib/rbac/roles'
import EventHoverCard from '@/components/shared/EventHoverCard'
import { TsunamiEvent } from '@/types/event-hover'

export const dynamic = 'force-dynamic'

type RangeKey = '24h' | '7d' | '30d'
type TabKey = 'live' | 'analytics'

type ServiceStatus = {
  status: string
  responseTime?: number
  lastCheck?: number
  error?: string
}

export default function TsunamiMonitoringPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('live')
  
  // Live feed state
  const [alerts, setAlerts] = useState([])
  const [liveStats, setLiveStats] = useState({ total: 0, last24h: 0, activeThreats: 0 })
  const [loading, setLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [livePage, setLivePage] = useState(1)
  const [timeRange, setTimeRange] = useState<RangeKey>('24h')
  const [isPaused, setIsPaused] = useState(false)
  const [monitoringActive, setMonitoringActive] = useState(false)
  const [sourceHealth, setSourceHealth] = useState<{ noaa?: ServiceStatus; ptwc?: ServiceStatus }>({})
  
  // Analytics state (Phase 2)
  const [analyticsAlerts, setAnalyticsAlerts] = useState<any[]>([])
  const [tsunamiStats, setTsunamiStats] = useState<{
    totalAlerts: number
    warningAlerts: number
    watchAlerts: number
    advisoryAlerts: number
    warningRate: number
    threatDistribution: Array<{ level: string; count: number; percentage: number }>
    oceanDistribution: Array<{ ocean: string; count: number }>
  } | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsPage, setAnalyticsPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    threatLevel: '',
    ocean: '',
    messageType: '',
    startDate: '',
    endDate: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  
  // Shared state (Phase 1)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'info' | 'success' | 'error'; message: string }>>([])
  
  // Phase 3 state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  
  const ALERTS_PER_PAGE = 20

  // Toast helper
  const addToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.floor(Math.random() * 1_000_000_000)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  // Manual refresh handler
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if (activeTab === 'live') {
        await fetchAlerts()
      } else {
        await fetchAnalyticsData()
      }
      setLastUpdated(new Date())
      addToast('Data refreshed successfully', 'success')
    } catch (error) {
      addToast('Failed to refresh data', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  // Phase 3: Browser notifications
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      setNotificationsEnabled(permission === 'granted')
      if (permission === 'granted') {
        addToast('Browser notifications enabled', 'success')
      }
    }
  }

  const sendBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { 
        body, 
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      })
    }
  }

  // Phase 3: CSV Export
  const exportToCSV = () => {
    const data = activeTab === 'live' ? filteredAlerts : analyticsAlerts
    const csvContent = [
      ['Time', 'Location', 'Threat Level', 'Ocean', 'Message Type', 'Description'].join(','),
      ...data.map((alert: any) => [
        new Date(alert.processedAt || alert.createdAt || alert.timestamp || alert.time).toISOString(),
        `"${alert.location || 'Unknown'}"`,
        alert.threat?.level || alert.urgency || 'Info',
        alert.ocean || 'Unknown',
        alert.messageType || 'Alert',
        `"${(alert.description || alert.instruction || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tsunami-alerts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    addToast('CSV export successful', 'success')
  }

  // Phase 2: Fetch analytics data
  const fetchAnalyticsData = async () => {
    setAnalyticsLoading(true)
    try {
      // Fetch last 30 days of historical data for analytics
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const response = await fetch(`/api/tsunami?startDate=${thirtyDaysAgo}&limit=200`, { cache: 'no-store' })
      const data = await response.json()
      
      if (data.success) {
        let allAlerts = data.data?.alerts || data.alerts || []
        
        // Apply filters
        if (filters.threatLevel) {
          allAlerts = allAlerts.filter((a: any) => 
            (a.threat?.level || a.urgency || '').toLowerCase().includes(filters.threatLevel.toLowerCase())
          )
        }
        if (filters.ocean) {
          allAlerts = allAlerts.filter((a: any) => 
            (a.ocean || '').toLowerCase().includes(filters.ocean.toLowerCase())
          )
        }
        if (filters.messageType) {
          allAlerts = allAlerts.filter((a: any) => 
            (a.messageType || '').toLowerCase().includes(filters.messageType.toLowerCase())
          )
        }
        if (filters.startDate) {
          allAlerts = allAlerts.filter((a: any) => 
            new Date(a.processedAt || a.createdAt || a.timestamp || a.time) >= new Date(filters.startDate)
          )
        }
        if (filters.endDate) {
          allAlerts = allAlerts.filter((a: any) => 
            new Date(a.processedAt || a.createdAt || a.timestamp || a.time) <= new Date(filters.endDate)
          )
        }

        setAnalyticsAlerts(allAlerts)
        setTotalPages(Math.ceil(allAlerts.length / 50))
        
        // Calculate statistics
        const threatCounts = { warning: 0, watch: 0, advisory: 0, info: 0 }
        const oceanCounts: Record<string, number> = {}
        
        allAlerts.forEach((alert: any) => {
          const level = (alert.threat?.level || alert.urgency || 'info').toLowerCase()
          if (level.includes('warning')) threatCounts.warning++
          else if (level.includes('watch')) threatCounts.watch++
          else if (level.includes('advisory')) threatCounts.advisory++
          else threatCounts.info++
          
          const ocean = alert.ocean || 'Unknown'
          oceanCounts[ocean] = (oceanCounts[ocean] || 0) + 1
        })
        
        const total = allAlerts.length
        
        setTsunamiStats({
          totalAlerts: total,
          warningAlerts: threatCounts.warning,
          watchAlerts: threatCounts.watch,
          advisoryAlerts: threatCounts.advisory,
          warningRate: total > 0 ? (threatCounts.warning / total) * 100 : 0,
          threatDistribution: [
            { level: 'Warning', count: threatCounts.warning, percentage: total > 0 ? (threatCounts.warning / total) * 100 : 0 },
            { level: 'Watch', count: threatCounts.watch, percentage: total > 0 ? (threatCounts.watch / total) * 100 : 0 },
            { level: 'Advisory', count: threatCounts.advisory, percentage: total > 0 ? (threatCounts.advisory / total) * 100 : 0 },
            { level: 'Info', count: threatCounts.info, percentage: total > 0 ? (threatCounts.info / total) * 100 : 0 }
          ],
          oceanDistribution: Object.entries(oceanCounts)
            .map(([ocean, count]) => ({ ocean, count }))
            .sort((a, b) => b.count - a.count)
        })
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      addToast('Failed to fetch analytics data', 'error')
    } finally {
      setAnalyticsLoading(false)
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

  // Fetch tsunami alerts with cache: 'no-store'
  const fetchAlerts = async () => {
    try {
      // Fetch last 30 days of historical data to match earthquake alerts
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const response = await fetch(`/api/tsunami?startDate=${thirtyDaysAgo}&limit=200`, { cache: 'no-store' })
      const data = await response.json()
      
      if (data.success) {
        const allAlerts = data.data?.alerts || data.alerts || []
        setAlerts(allAlerts)
        
        // Calculate stats
        const now = Date.now()
        const dayAgo = now - 24 * 60 * 60 * 1000
        const activeThreats = allAlerts.filter((a: any) => 
          a.threat?.level === 'warning' || a.urgency === 'Immediate'
        ).length
        
        setLiveStats({
          total: allAlerts.length,
          last24h: allAlerts.filter((a: any) => {
            const alertTime = new Date(a.processedAt || a.createdAt || a.timestamp || a.time).getTime()
            return alertTime > dayAgo
          }).length,
          activeThreats
        })
        setLastUpdated(new Date())

        // Phase 3: Check for new critical alerts and send notifications
        if (notificationsEnabled && liveStats.activeThreats > 0) {
          sendBrowserNotification(
            '🌊 Tsunami Warning Alert',
            `${liveStats.activeThreats} active tsunami warning${liveStats.activeThreats > 1 ? 's' : ''} detected`
          )
        }
      }
    } catch (error) {
      console.error('Failed to fetch tsunami alerts:', error)
      addToast('Failed to fetch alerts', 'error')
    } finally {
      setLoading(false)
      setIsInitialLoad(false)
    }
  }

  useEffect(() => {
    if (isPaused || activeTab !== 'live') return

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [isPaused, activeTab, notificationsEnabled])

  // Fetch analytics data when switching to analytics tab
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsData()
    }
  }, [activeTab, analyticsPage, filters])

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
        title="Tsunami Alerts"
        breadcrumbs={[
          { label: 'Alerts' }
        ]}
      >
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="border-b border-slate-200">
            <nav className="flex gap-8" role="tablist">
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
            <div className="flex items-center gap-3">
              {/* Notification Toggle */}
              <button
                onClick={requestNotificationPermission}
                className={`inline-flex items-center px-3 py-2 border rounded-xl transition-all shadow-sm ${
                  notificationsEnabled
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title={notificationsEnabled ? 'Notifications enabled' : 'Enable browser notifications'}
              >
                {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              </button>

              {/* CSV Export */}
              <button
                onClick={exportToCSV}
                disabled={activeTab === 'live' ? filteredAlerts.length === 0 : analyticsAlerts.length === 0}
                className="inline-flex items-center px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                title="Export to CSV"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Hero Metrics - Live Tab */}
          {activeTab === 'live' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Total Alerts */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <Waves className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    30d
                  </div>
                </div>
                <h3 className="text-sm font-medium text-blue-900/70 mb-1">Total Alerts</h3>
                <p className="text-3xl font-bold text-blue-900">{liveStats.total}</p>
              </div>

              {/* Last 24h */}
              <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl p-6 border border-cyan-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <Clock className="h-6 w-6 text-cyan-600" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-cyan-900/70 mb-1">Last 24 Hours</h3>
                <p className="text-3xl font-bold text-cyan-900">{liveStats.last24h}</p>
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

              {/* Active Threats */}
              <div className={`bg-gradient-to-br rounded-xl p-6 border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${
                liveStats.activeThreats > 0
                  ? 'from-red-50 to-orange-50 border-red-100'
                  : 'from-slate-50 to-gray-50 border-slate-100'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <AlertTriangle className={`h-6 w-6 ${liveStats.activeThreats > 0 ? 'text-red-600' : 'text-slate-400'}`} />
                  </div>
                  {liveStats.activeThreats > 0 && (
                    <div className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full animate-pulse">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      Active
                    </div>
                  )}
                </div>
                <h3 className={`text-sm font-medium mb-1 ${liveStats.activeThreats > 0 ? 'text-red-900/70' : 'text-slate-900/70'}`}>
                  Active Threats
                </h3>
                <p className={`text-3xl font-bold ${liveStats.activeThreats > 0 ? 'text-red-900' : 'text-slate-900'}`}>
                  {liveStats.activeThreats}
                </p>
              </div>
            </div>
          )}

          {/* Content based on active tab */}
          {activeTab === 'live' ? (
            <>
              {/* Source Health */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* NOAA Card */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Wifi className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">NOAA Tsunami</h3>
                      <p className="text-xs text-slate-500">Primary tsunami data source</p>
                    </div>
                  </div>
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
                  <div className="text-xs text-red-600 p-2 bg-red-50 rounded-lg border border-red-100">
                    {sourceHealth.noaa.error}
                  </div>
                )}
                  </div>
                </div>

                {/* PTWC Card */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-cyan-50 rounded-lg">
                      <Globe className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">PTWC</h3>
                      <p className="text-xs text-slate-500">Pacific Tsunami Warning Center</p>
                    </div>
                  </div>
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
                  <div className="text-xs text-red-600 p-2 bg-red-50 rounded-lg border border-red-100">
                    {sourceHealth.ptwc.error}
                  </div>
                )}
                  </div>
                </div>
              </div>

              {/* Alerts List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Waves className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Recent Tsunami Alerts</h3>
                      <p className="text-sm text-slate-500">{filteredAlerts.length} alerts in selected range</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">Auto-refresh every 30s</span>
                    <TimeRangeSwitcher value={timeRange} onChange={setTimeRange} />
                    <button
                      onClick={() => setIsPaused(!isPaused)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        isPaused
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {isPaused ? 'Paused' : 'Live'}
                    </button>
                  </div>
                </div>
            <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: '600px' }}>
              {loading && isInitialLoad ? (
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
                <div className="space-y-4 p-6">
                  {filteredAlerts.slice(0, livePage * ALERTS_PER_PAGE).map((alert: any, index) => {
                    const tsunamiEvent: TsunamiEvent = {
                      id: alert.id || `tsunami-${index}`,
                      location: alert.location || 'Unknown location',
                      latitude: alert.latitude || alert.lat || undefined,
                      longitude: alert.longitude || alert.lon || alert.lng || undefined,
                      magnitude: alert.magnitude,
                      time: alert.processedAt || alert.createdAt || alert.timestamp || alert.time,
                      threatLevel: (alert.threat?.level || alert.urgency || 'info').toLowerCase() as 'advisory' | 'watch' | 'warning' | 'information' | 'info',
                      ocean: alert.ocean || 'Unknown',
                      type: alert.messageType || alert.category,
                      eventId: alert.eventId,
                    }
                    
                    return (
                      <EventHoverCard
                        key={alert.id || index}
                        event={tsunamiEvent}
                        type="tsunami"
                        tsunamiTargetLocation={{
                          latitude: 21.3, // Hawaii as default target
                          longitude: -157.8,
                          name: 'Hawaii'
                        }}
                      >
                        <div className="border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
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
              </div>
            </>
          ) : (
            <Can permission={Permission.VIEW_ALERTS} fallback={
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-700">
                You don't have permission to view alert history.
              </div>
            }>
              {/* Analytics Hero Metrics */}
              {tsunamiStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Total Alerts */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <Waves className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-blue-900/70 mb-1">Total Alerts</h3>
                    <p className="text-3xl font-bold text-blue-900">{tsunamiStats.totalAlerts.toLocaleString()}</p>
                    <p className="text-xs text-blue-700 mt-1">Last 30 days</p>
                  </div>

                  {/* Warning Rate */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <AlertTriangle className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-orange-900/70 mb-1">Warning Rate</h3>
                    <p className="text-3xl font-bold text-orange-900">{tsunamiStats.warningRate.toFixed(1)}%</p>
                    <p className="text-xs text-orange-700 mt-1">{tsunamiStats.warningAlerts} warnings</p>
                  </div>

                  {/* Watch Alerts */}
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <Activity className="h-6 w-6 text-yellow-600" />
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-yellow-900/70 mb-1">Watch Alerts</h3>
                    <p className="text-3xl font-bold text-yellow-900">{tsunamiStats.watchAlerts}</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      {tsunamiStats.totalAlerts > 0 ? ((tsunamiStats.watchAlerts / tsunamiStats.totalAlerts) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>

                  {/* Advisory Alerts */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-green-900/70 mb-1">Advisory Alerts</h3>
                    <p className="text-3xl font-bold text-green-900">{tsunamiStats.advisoryAlerts}</p>
                    <p className="text-xs text-green-700 mt-1">
                      {tsunamiStats.totalAlerts > 0 ? ((tsunamiStats.advisoryAlerts / tsunamiStats.totalAlerts) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                </div>
              )}

              {/* Threat Distribution & Ocean Distribution */}
              {tsunamiStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Threat Level Distribution */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Threat Level Distribution
                    </h3>
                    <div className="space-y-3">
                      {tsunamiStats.threatDistribution.map((item) => (
                        <div key={item.level} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-700">{item.level}</span>
                            <span className="text-slate-600">{item.count} ({item.percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                item.level === 'Warning' ? 'bg-red-500' :
                                item.level === 'Watch' ? 'bg-yellow-500' :
                                item.level === 'Advisory' ? 'bg-blue-500' :
                                'bg-slate-400'
                              }`}
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ocean Distribution */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Globe className="h-5 w-5 text-cyan-600" />
                      Top Alert Regions
                    </h3>
                    <div className="space-y-3">
                      {tsunamiStats.oceanDistribution.slice(0, 6).map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-900">{item.ocean}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-600">{item.count} alerts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Filters Panel */}
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
                          Threat Level
                        </label>
                        <select
                          value={filters.threatLevel}
                          onChange={(e) => setFilters({ ...filters, threatLevel: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All</option>
                          <option value="warning">Warning</option>
                          <option value="watch">Watch</option>
                          <option value="advisory">Advisory</option>
                          <option value="info">Info</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Ocean/Region
                        </label>
                        <input
                          type="text"
                          value={filters.ocean}
                          onChange={(e) => setFilters({ ...filters, ocean: e.target.value })}
                          placeholder="e.g., Pacific"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Message Type
                        </label>
                        <input
                          type="text"
                          value={filters.messageType}
                          onChange={(e) => setFilters({ ...filters, messageType: e.target.value })}
                          placeholder="e.g., Update"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
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
                          setFilters({ threatLevel: '', ocean: '', messageType: '', startDate: '', endDate: '' })
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

              {/* Historical Alerts Table */}
              {analyticsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="text-slate-600 mt-4">Loading alerts...</p>
                </div>
              ) : analyticsAlerts.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <Waves className="h-12 w-12 text-slate-300 mx-auto mb-4" />
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
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Timestamp
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Location
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Threat Level
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Ocean
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Type
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {analyticsAlerts.slice((analyticsPage - 1) * 50, analyticsPage * 50).map((alert: any, index) => {
                            const tsunamiEvent: TsunamiEvent = {
                              id: alert.id || `tsunami-analytics-${index}`,
                              location: alert.location || 'Unknown',
                              latitude: alert.latitude || alert.lat || undefined,
                              longitude: alert.longitude || alert.lon || alert.lng || undefined,
                              magnitude: alert.magnitude,
                              time: alert.processedAt || alert.createdAt || alert.timestamp || alert.time,
                              threatLevel: (alert.threat?.level || alert.urgency || 'info').toLowerCase() as 'advisory' | 'watch' | 'warning' | 'information' | 'info',
                              ocean: alert.ocean || 'Unknown',
                              type: alert.messageType || alert.category,
                              eventId: alert.eventId,
                            }
                            
                            return (
                              <EventHoverCard
                                key={alert.id || index}
                                event={tsunamiEvent}
                                type="tsunami"
                                tsunamiTargetLocation={{
                                  latitude: 21.3,
                                  longitude: -157.8,
                                  name: 'Hawaii'
                                }}
                              >
                                <tr className="hover:bg-slate-50 transition-colors cursor-pointer">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                    {new Date(alert.processedAt || alert.createdAt || alert.timestamp || alert.time).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-slate-900 max-w-xs truncate">
                                      {alert.location || 'Unknown'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      (alert.threat?.level || alert.urgency || '').toLowerCase().includes('warning') ? 'bg-red-100 text-red-800' :
                                      (alert.threat?.level || alert.urgency || '').toLowerCase().includes('watch') ? 'bg-yellow-100 text-yellow-800' :
                                      (alert.threat?.level || alert.urgency || '').toLowerCase().includes('advisory') ? 'bg-blue-100 text-blue-800' :
                                      'bg-slate-100 text-slate-800'
                                    }`}>
                                      {alert.threat?.level || alert.urgency || 'Info'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                    {alert.ocean || 'Unknown'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                    {alert.messageType || 'Alert'}
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
