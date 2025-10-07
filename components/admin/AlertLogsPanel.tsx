'use client'

import { useState, useEffect } from 'react'
import { Bell, AlertTriangle, Waves, Calendar, MapPin, Users, CheckCircle, XCircle, Loader2, Filter } from 'lucide-react'

type AlertLog = {
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
  dataSources: string[]
  primarySource: string | null
  createdAt: string
}

export default function AlertLogsPanel() {
  const [alerts, setAlerts] = useState<AlertLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [dateFilter, setDateFilter] = useState<'24h' | '7d' | '30d'>('7d')

  useEffect(() => {
    fetchAlerts()
  }, [dateFilter])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/alerts/history?range=${dateFilter}`)
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'success') return alert.success
    if (filter === 'failed') return !alert.success
    return true
  })

  const stats = {
    total: alerts.length,
    success: alerts.filter(a => a.success).length,
    failed: alerts.filter(a => !a.success).length,
    totalContacts: alerts.reduce((sum, a) => sum + a.contactsNotified, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-600">Total Alerts</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600">Successful</p>
          <p className="text-2xl font-bold text-green-900">{stats.success}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-600">Failed</p>
          <p className="text-2xl font-bold text-red-900">{stats.failed}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600">Contacts Notified</p>
          <p className="text-2xl font-bold text-blue-900">{stats.totalContacts}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('success')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Successful
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'failed'
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Failed
          </button>
        </div>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setDateFilter('24h')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateFilter === '24h'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            24h
          </button>
          <button
            onClick={() => setDateFilter('7d')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateFilter === '7d'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            7d
          </button>
          <button
            onClick={() => setDateFilter('30d')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateFilter === '30d'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            30d
          </button>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Event</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Magnitude</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contacts</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Sources</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No alerts found
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-mono text-slate-600">
                          {alert.earthquakeId.substring(0, 8)}...
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900">{alert.location}</div>
                      {alert.latitude && alert.longitude && (
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {alert.latitude.toFixed(2)}°, {alert.longitude.toFixed(2)}°
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        alert.magnitude >= 7
                          ? 'bg-red-100 text-red-800'
                          : alert.magnitude >= 6
                          ? 'bg-orange-100 text-orange-800'
                          : alert.magnitude >= 5
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        M {alert.magnitude.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-slate-700">
                        <Users className="h-4 w-4 text-slate-400" />
                        {alert.contactsNotified}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {alert.dataSources.map((source) => (
                          <span
                            key={source}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {alert.success ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Success</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Failed</span>
                          </div>
                        )}
                      </div>
                      {alert.errorMessage && (
                        <div className="text-xs text-red-600 mt-1 truncate max-w-xs">
                          {alert.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div>{new Date(alert.timestamp).toLocaleDateString()}</div>
                      <div>{new Date(alert.timestamp).toLocaleTimeString()}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
