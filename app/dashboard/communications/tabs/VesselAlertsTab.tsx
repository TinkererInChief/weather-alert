'use client'

import { useState, useEffect } from 'react'
import {
  AlertTriangle, Ship, CheckCircle, XCircle, Clock, Mail, MessageSquare,
  Phone, Filter, RefreshCw, ChevronDown, ChevronUp, MapPin, Activity
} from 'lucide-react'
import HelpTooltip from '@/components/guidance/HelpTooltip'

type Severity = 'critical' | 'high' | 'moderate' | 'low'
type Status = 'pending' | 'sent' | 'acknowledged' | 'failed'
type DeliveryStatus = 'pending' | 'sent' | 'failed'

type VesselAlert = {
  id: string
  vesselId: string
  vessel: {
    id: string
    name: string
    mmsi: string
    imo: string | null
  }
  eventId: string
  eventType: string
  severity: Severity
  status: Status
  distance: number
  message: string
  recommendation: string | null
  acknowledged: boolean
  acknowledgedAt: Date | null
  sentAt: Date | null
  createdAt: Date
  deliveryLogs: DeliveryLog[]
}

type DeliveryLog = {
  id: string
  channel: string
  status: DeliveryStatus
  contact: {
    id: string
    name: string
    phone: string | null
    email: string | null
  }
  attempts: number
  errorMessage: string | null
  sentAt: Date | null
  deliveredAt: Date | null
}

export default function VesselAlertsTab() {
  const [alerts, setAlerts] = useState<VesselAlert[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  const [filters, setFilters] = useState({
    severity: '',
    status: '',
    acknowledged: '',
    eventType: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set())

  const fetchAlerts = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      
      if (filters.severity) params.append('severity', filters.severity)
      if (filters.status) params.append('status', filters.status)
      if (filters.acknowledged) params.append('acknowledged', filters.acknowledged)
      if (filters.eventType) params.append('eventType', filters.eventType)

      const response = await fetch(`/api/vessel-alerts?${params}`)
      const data = await response.json()

      if (data.success) {
        setAlerts(data.data.alerts)
        setStats(data.data.stats)
        setTotalPages(data.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch vessel alerts:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [page, filters])

  useEffect(() => {
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [page, filters])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAlerts()
  }

  const toggleExpanded = (alertId: string) => {
    setExpandedAlerts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(alertId)) {
        newSet.delete(alertId)
      } else {
        newSet.add(alertId)
      }
      return newSet
    })
  }

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'acknowledged': return 'bg-green-100 text-green-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
    }
  }

  const getDeliveryIcon = (channel: string) => {
    switch (channel) {
      case 'sms': return <MessageSquare className="h-4 w-4" />
      case 'email': return <Mail className="h-4 w-4" />
      case 'whatsapp': return <Phone className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getDeliveryStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'failed': return 'text-red-600 bg-red-50'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">Monitor and manage vessel proximity alerts with delivery tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <AlertTriangle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-blue-900/70 mb-1">Total Alerts</h3>
            <p className="text-3xl font-bold text-blue-900">
              {Object.values(stats.byStatus || {}).reduce((a: number, b: any) => a + (b as number), 0)}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-green-900/70 mb-1">Acknowledged</h3>
            <p className="text-3xl font-bold text-green-900">{stats.acknowledged || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-100">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-yellow-900/70 mb-1">Pending</h3>
            <p className="text-3xl font-bold text-yellow-900">{stats.unacknowledged || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-100">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-red-900/70 mb-1">Critical</h3>
            <p className="text-3xl font-bold text-red-900">{stats.bySeverity?.critical || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Acknowledged</label>
              <select
                value={filters.acknowledged}
                onChange={(e) => setFilters(prev => ({ ...prev, acknowledged: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
              <select
                value={filters.eventType}
                onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="earthquake">Earthquake</option>
                <option value="tsunami">Tsunami</option>
                <option value="storm">Storm</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setFilters({ severity: '', status: '', acknowledged: '', eventType: '' })}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Alerts List */}
      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12">
            <Ship className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Alerts Found</h3>
            <p className="text-gray-600">No vessel alerts match your current filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-6 hover:bg-gray-50 transition-colors">
                {/* Alert Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Ship className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {alert.vessel.name}
                      </h3>
                      <span className="text-sm text-gray-500">MMSI: {alert.vessel.mmsi}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(alert.status)}`}>
                          {alert.status}
                        </span>
                        <HelpTooltip 
                          title="Alert Status"
                          content="Tracks alert lifecycle: pending (queued), sent (delivered), acknowledged (crew confirmed). Status updates automatically."
                          side="top"
                        />
                      </div>
                      <span className="text-sm text-gray-600 uppercase">{alert.eventType}</span>
                      <span className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-1" />
                        {alert.distance.toFixed(0)} km
                      </span>
                      {alert.acknowledged && (
                        <span className="flex items-center text-sm text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleExpanded(alert.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {expandedAlerts.has(alert.id) ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </button>
                </div>

                {/* Alert Message */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 leading-relaxed">{alert.message}</p>
                  {alert.recommendation && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-900 mb-1">Recommendation:</p>
                      <p className="text-sm text-gray-700">{alert.recommendation}</p>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-6 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Created: {new Date(alert.createdAt).toLocaleString()}
                  </span>
                  {alert.sentAt && (
                    <span className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Sent: {new Date(alert.sentAt).toLocaleString()}
                    </span>
                  )}
                  {alert.acknowledgedAt && (
                    <span className="flex items-center text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Acknowledged: {new Date(alert.acknowledgedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Expanded: Delivery Logs */}
                {expandedAlerts.has(alert.id) && (
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Delivery Logs</h4>
                    {alert.deliveryLogs.length === 0 ? (
                      <p className="text-sm text-gray-600">No delivery logs available.</p>
                    ) : (
                      <div className="space-y-3">
                        {alert.deliveryLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className={`p-2 rounded-lg ${getDeliveryStatusColor(log.status)}`}>
                              {getDeliveryIcon(log.channel)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {log.contact.name}
                                  </span>
                                  <span className="text-sm text-gray-500 mx-2">•</span>
                                  <span className="text-sm text-gray-600 uppercase">{log.channel}</span>
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded ${getDeliveryStatusColor(log.status)}`}>
                                  {log.status}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600">
                                {log.channel === 'sms' && log.contact.phone && (
                                  <span>📱 {log.contact.phone}</span>
                                )}
                                {log.channel === 'email' && log.contact.email && (
                                  <span>✉️ {log.contact.email}</span>
                                )}
                              </div>
                              {log.errorMessage && (
                                <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                                  Error: {log.errorMessage}
                                </div>
                              )}
                              {log.deliveredAt && (
                                <div className="mt-1 text-xs text-green-600">
                                  ✓ Delivered: {new Date(log.deliveredAt).toLocaleString()}
                                </div>
                              )}
                              {log.attempts > 1 && (
                                <div className="mt-1 text-xs text-gray-500">
                                  {log.attempts} attempts
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
