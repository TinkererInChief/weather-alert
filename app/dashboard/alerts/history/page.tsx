'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Search, Filter, TrendingUp, CheckCircle, XCircle, Users, MapPin, Activity, BarChart3 } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { Can } from '@/components/auth/Can'
import { Permission } from '@/lib/rbac/roles'

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

export default function AlertHistoryPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    minMagnitude: '',
    maxMagnitude: '',
    success: '',
    startDate: '',
    endDate: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  
  useEffect(() => {
    fetchAlerts()
    fetchStats()
  }, [page, filters])
  
  const fetchAlerts = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: page.toString(),
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
        setAlerts(data.data.alerts)
        setTotalPages(data.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
    }
  }
  
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
  
  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude >= 7) return 'text-red-600 bg-red-50'
    if (magnitude >= 6) return 'text-orange-600 bg-orange-50'
    if (magnitude >= 5) return 'text-yellow-600 bg-yellow-50'
    return 'text-blue-600 bg-blue-50'
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
  
  return (
    <AuthGuard>
      <AppLayout>
        <Can permission={Permission.VIEW_ALERTS} fallback={
          <div className="p-6 max-w-7xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
              You don't have permission to view alert history.
            </div>
          </div>
        }>
          <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-blue-600" />
                Alert History
              </h1>
              <p className="text-slate-600 mt-2">
                Historical earthquake alerts and performance analytics
              </p>
            </div>
            
            {/* Stats Cards */}
            {stats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Total Alerts</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          {stats.overview.totalAlerts.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Last 30 days</p>
                      </div>
                      <Activity className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Success Rate</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">
                          {stats.overview.successRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {stats.overview.successfulAlerts} successful
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Avg Magnitude</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          {stats.magnitudeStats.average.toFixed(1)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Range: {stats.magnitudeStats.min.toFixed(1)} - {stats.magnitudeStats.max.toFixed(1)}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Contacts Notified</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          {stats.overview.totalContactsNotified.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Avg: {stats.overview.avgContactsNotified.toFixed(0)} per alert
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                </div>
                
                {/* Success by Magnitude */}
                <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
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
                  <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
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
            <div className="mb-6">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              
              {showFilters && (
                <div className="mt-4 bg-white rounded-lg border border-slate-200 p-4">
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
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Status
                      </label>
                      <select
                        value={filters.success}
                        onChange={(e) => setFilters({ ...filters, success: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        setFilters({ minMagnitude: '', maxMagnitude: '', success: '', startDate: '', endDate: '' })
                        setPage(1)
                      }}
                      className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Clear Filters
                    </button>
                    <button
                      onClick={() => setPage(1)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Alerts Table */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-slate-600 mt-4">Loading alerts...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
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
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
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
                            Magnitude
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Depth
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Contacts
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {alerts.map((alert) => (
                          <tr key={alert.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              {formatDate(alert.timestamp)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-slate-900 max-w-xs truncate">
                                {alert.location}
                              </div>
                              {alert.latitude && alert.longitude && (
                                <div className="text-xs text-slate-500">
                                  {alert.latitude.toFixed(2)}°, {alert.longitude.toFixed(2)}°
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMagnitudeColor(alert.magnitude)}`}>
                                M{alert.magnitude.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              {alert.depth ? `${alert.depth.toFixed(1)} km` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              {alert.contactsNotified}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Can>
      </AppLayout>
    </AuthGuard>
  )
}
