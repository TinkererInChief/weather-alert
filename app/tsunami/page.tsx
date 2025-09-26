'use client'

import { useState, useEffect } from 'react'
import { Waves, AlertTriangle, Clock, MapPin, Activity, RefreshCw, Play, Square, TrendingUp } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'

interface TsunamiAlert {
  id: string
  title: string
  category: string
  urgency: string
  severity: string
  location: string
  latitude: number
  longitude: number
  magnitude?: number
  description: string
  instruction: string
  threat: {
    level: string
    confidence: number
    affectedRegions: string[]
  }
  processedAt: string
}

interface TsunamiStats {
  totalAlerts: number
  alertsLast24h: number
  alertsLast7d: number
  recentAlerts: Array<{
    id: string
    type: string
    severity: number
    title: string
    location: string
    timestamp: string
  }>
  alertsByLevel: Record<string, number>
}

export default function TsunamiPage() {
  const [alerts, setAlerts] = useState<TsunamiAlert[]>([])
  const [stats, setStats] = useState<TsunamiStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [monitoringStatus, setMonitoringStatus] = useState(false)
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  useEffect(() => {
    fetchTsunamiData()
    fetchMonitoringStatus()
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchTsunamiData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchTsunamiData = async () => {
    try {
      setLoading(true)
      
      // Fetch tsunami alerts
      const alertsResponse = await fetch('/api/tsunami')
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json()
        if (alertsData.success) {
          setAlerts(alertsData.data.alerts || [])
          setLastChecked(alertsData.data.lastChecked)
        }
      }

      // Fetch stats (including tsunami stats)  
      const statsResponse = await fetch('/api/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.success && statsData.data.stats.tsunami) {
          setStats(statsData.data.stats.tsunami)
        }
      }

    } catch (error) {
      console.error('Error fetching tsunami data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMonitoringStatus = async () => {
    try {
      const response = await fetch('/api/tsunami/monitor')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMonitoringStatus(data.data.monitoring.isMonitoring)
        }
      }
    } catch (error) {
      console.error('Error fetching monitoring status:', error)
    }
  }

  const toggleMonitoring = async () => {
    try {
      const method = monitoringStatus ? 'DELETE' : 'POST'
      const response = await fetch('/api/tsunami/monitor', { method })
      
      if (response.ok) {
        setMonitoringStatus(!monitoringStatus)
        // Refresh data after status change
        setTimeout(fetchTsunamiData, 1000)
      }
    } catch (error) {
      console.error('Error toggling monitoring:', error)
    }
  }

  const manualCheck = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tsunami', { method: 'POST' })
      
      if (response.ok) {
        // Refresh data after manual check
        setTimeout(fetchTsunamiData, 2000)
      }
    } catch (error) {
      console.error('Error performing manual check:', error)
    }
  }

  const getThreatLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'warning': return 'text-red-600 bg-red-50 border-red-200'
      case 'watch': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'advisory': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getThreatIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'warning': return '🚨🌊'
      case 'watch': return '⚠️🌊'
      case 'advisory': return '📢🌊'
      default: return '🌊'
    }
  }

  return (
    <AppLayout 
      title="Tsunami Alert System" 
      breadcrumbs={[{ label: 'Tsunami Monitoring' }]}
    >
      <div className="space-y-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-600">Real-time tsunami monitoring and alerts</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={manualCheck}
              disabled={loading}
              className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Activity className="h-4 w-4" />
              <span>{loading ? 'Checking...' : 'Check Now'}</span>
            </button>
            
            <button
              onClick={toggleMonitoring}
              className={`btn flex items-center gap-2 ${
                monitoringStatus ? 'btn-success' : 'btn-secondary'
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${monitoringStatus ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
              <span>{monitoringStatus ? 'Monitoring Active' : 'Start Monitoring'}</span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Alerts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAlerts}</p>
                </div>
                <Waves className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Last 24 Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.alertsLast24h}</p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Last 7 Days</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.alertsLast7d}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monitoring</p>
                  <p className="text-2xl font-bold text-gray-900">{monitoringStatus ? 'Active' : 'Inactive'}</p>
                </div>
                <Activity className={`h-8 w-8 ${monitoringStatus ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </div>
        )}

        {/* Current Alerts */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Current Alerts</h2>
            {lastChecked && (
              <p className="text-sm text-gray-500">
                Last checked: {new Date(lastChecked).toLocaleString()}
              </p>
            )}
          </div>

          {loading && alerts.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
              <Activity className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading tsunami alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
              <Waves className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Tsunami Alerts</h3>
              <p className="text-gray-600">All clear! Monitoring continues in the background.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className={`bg-white p-6 rounded-lg shadow-sm border-l-4 ${getThreatLevelColor(alert.threat.level)}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getThreatIcon(alert.threat.level)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{alert.location}</span>
                          </span>
                          {alert.magnitude && (
                            <span>Magnitude: {alert.magnitude}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getThreatLevelColor(alert.threat.level)}`}>
                        {alert.threat.level.toUpperCase()}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {Math.round(alert.threat.confidence * 100)}% confidence
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-700 mb-2">{alert.description}</p>
                    <div className="bg-gray-50 p-3 rounded border-l-4 border-yellow-400">
                      <p className="text-sm font-medium text-gray-900">Instructions:</p>
                      <p className="text-sm text-gray-700">{alert.instruction}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Category: {alert.category} | Severity: {alert.severity} | Urgency: {alert.urgency}</span>
                    <span>Processed: {new Date(alert.processedAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Alert History */}
        {stats && stats.recentAlerts && stats.recentAlerts.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Alert History</h2>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alert</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recentAlerts.map((alert) => (
                      <tr key={alert.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {alert.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getThreatLevelColor(alert.type)}`}>
                            {alert.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{alert.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{alert.severity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(alert.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
