'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { Waves, Clock, MapPin, Activity } from 'lucide-react'

export default function TsunamiMonitoringPage() {
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState({ total: 0, last24h: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const ALERTS_PER_PAGE = 20

  useEffect(() => {
    // Fetch tsunami alerts from last 30 days
    const fetchAlerts = async () => {
      try {
        const response = await fetch('/api/tsunami')
        const data = await response.json()
        if (data.success) {
          const allAlerts = data.data?.alerts || data.alerts || []
          // Filter to last 30 days
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          const tsunamiAlerts = allAlerts
            .filter((a: any) => new Date(a.createdAt || a.timestamp) > thirtyDaysAgo)
          setAlerts(tsunamiAlerts)
          setStats({
            total: tsunamiAlerts.length,
            last24h: tsunamiAlerts.filter((a: any) => {
              const alertTime = new Date(a.createdAt || a.timestamp)
              const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
              return alertTime > dayAgo
            }).length
          })
        }
      } catch (error) {
        console.error('Failed to fetch alerts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

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
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Alerts</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <Waves className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Last 24 Hours</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.last24h}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Monitoring Status</p>
                  <p className="text-2xl font-bold text-green-600">Active</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </div>

          {/* Alerts List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Recent Tsunami Alerts</h3>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-slate-600">Loading alerts...</p>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8">
                  <Waves className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Tsunami Alerts Found</h3>
                  <p className="text-slate-600">No tsunami alerts have been dispatched yet.</p>
                </div>
              ) : (
                <>
                <div className="space-y-4">
                  {alerts.slice(0, page * ALERTS_PER_PAGE).map((alert: any, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-slate-900">
                              {alert.title || 'Tsunami Alert'}
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
                {page * ALERTS_PER_PAGE < alerts.length && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={loadingMore}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? 'Loading...' : `Load More (${alerts.length - page * ALERTS_PER_PAGE} remaining)`}
                    </button>
                  </div>
                )}
                
                {/* Showing count */}
                <div className="mt-4 text-center text-sm text-slate-600">
                  Showing {Math.min(page * ALERTS_PER_PAGE, alerts.length)} of {alerts.length} alerts
                </div>
                </>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  )
}
