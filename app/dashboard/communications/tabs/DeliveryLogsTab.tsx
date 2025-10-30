'use client'

import { useState, useEffect } from 'react'
import { Bell, Search, Filter, TrendingUp, CheckCircle, XCircle, Clock, Send, Mail, Phone, MessageSquare, Megaphone, CheckCircle2 } from 'lucide-react'

type DeliveryLog = {
  id: string
  alertJobId: string
  contactId: string
  channel: string
  provider: string
  status: string
  providerMessageId: string | null
  errorMessage: string | null
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  createdAt: string
  contact: {
    id: string
    name: string
    email: string | null
    phone: string | null
  }
  alertJob: {
    id: string
    type: string
    eventType: string
    severity: number
    createdAt: string
  }
}

type Stats = {
  overview: {
    totalDeliveries: number
    successfulDeliveries: number
    failedDeliveries: number
    successRate: number
  }
  statusCounts: Array<{ status: string; _count: { status: number } }>
  channelCounts: Array<{ channel: string; _count: { channel: number } }>
  channelSuccessRates: Array<{ channel: string; total: number; successful: number; successRate: string }>
}

export default function DeliveryLogsTab() {
  const [logs, setLogs] = useState<DeliveryLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    channel: '',
    status: '',
    startDate: '',
    endDate: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  
  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [page, filters])
  
  const fetchLogs = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      })
      
      if (filters.channel) params.append('channel', filters.channel)
      if (filters.status) params.append('status', filters.status)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      
      const response = await fetch(`/api/notifications/delivery-logs?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setLogs(data.data.logs)
        setTotalPages(data.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch delivery logs:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/notifications/stats?days=7')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'sent':
        return 'text-green-600 bg-green-50'
      case 'failed':
      case 'bounced':
        return 'text-red-600 bg-red-50'
      case 'queued':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-slate-600 bg-slate-50'
    }
  }
  
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms':
        return <Phone className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />
      case 'voice':
        return <Megaphone className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }
  
  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-gray-600">
          Track notification delivery status across all channels and providers
        </p>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Sent</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats.overview.totalDeliveries.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Last 7 days</p>
              </div>
              <Send className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Successful</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {stats.overview.successfulDeliveries.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.overview.successRate.toFixed(1)}% success rate
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Failed</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {stats.overview.failedDeliveries.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {((stats.overview.failedDeliveries / stats.overview.totalDeliveries) * 100).toFixed(1)}% failure rate
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Top Channel</p>
                <p className="text-lg font-bold text-slate-900 mt-1 capitalize">
                  {stats.channelCounts[0]?.channel || 'N/A'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.channelCounts[0]?._count.channel || 0} sent
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}
      
      {/* Channel Success Rates */}
      {stats && stats.channelSuccessRates.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Channel Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.channelSuccessRates.map((channel) => (
              <div key={channel.channel} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getChannelIcon(channel.channel)}
                  <span className="font-medium text-slate-900 capitalize">
                    {channel.channel}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total:</span>
                    <span className="font-medium">{channel.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Success:</span>
                    <span className="font-medium text-green-600">{channel.successful}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Rate:</span>
                    <span className="font-medium">{channel.successRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Filter className="h-4 w-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
        
        {showFilters && (
          <div className="mt-4 bg-white rounded-lg border border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Channel
                </label>
                <select
                  value={filters.channel}
                  onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Channels</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="voice">Voice</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="queued">Queued</option>
                  <option value="sent">Sent</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                  <option value="bounced">Bounced</option>
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
                  setFilters({ channel: '', status: '', startDate: '', endDate: '' })
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
      
      {/* Delivery Logs Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 mt-4">Loading delivery logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No delivery logs found
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
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Channel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Delivered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Acknowledged
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {log.contact.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {log.contact.email || log.contact.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getChannelIcon(log.channel)}
                          <span className="text-sm text-slate-900 capitalize">
                            {log.channel}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">
                        {log.provider}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(log.deliveredAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.readAt ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-slate-600">
                              {formatDate(log.readAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
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
            <div className="flex items-center justify-between">
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
  )
}
