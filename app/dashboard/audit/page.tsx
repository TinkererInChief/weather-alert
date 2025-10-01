'use client'

import { useState, useEffect } from 'react'
import { Shield, Search, Filter, Calendar, User, FileText, Activity, TrendingUp, Clock } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { Can } from '@/components/auth/Can'
import { Permission } from '@/lib/rbac/roles'

type AuditLog = {
  id: string
  userId: string | null
  action: string
  resource: string
  resourceId: string | null
  metadata: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string | null
    role: string
  } | null
}

type Stats = {
  totalLogs: number
  actionCounts: Array<{ action: string; _count: { action: number } }>
  resourceCounts: Array<{ resource: string; _count: { resource: number } }>
  userActivity: Array<{ userId: string | null; _count: { userId: number }; user: any }>
  dailyActivity: Array<{ date: string; count: number }>
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    userId: '',
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
      
      if (filters.action) params.append('action', filters.action)
      if (filters.resource) params.append('resource', filters.resource)
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      
      const response = await fetch(`/api/audit-logs?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setLogs(data.data.logs)
        setTotalPages(data.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/audit-logs/stats?days=7')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }
  
  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50'
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50'
    if (action.includes('UPDATE')) return 'text-blue-600 bg-blue-50'
    return 'text-slate-600 bg-slate-50'
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
        <Can permission={Permission.VIEW_AUDIT_LOGS} fallback={
          <div className="p-6 max-w-7xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
              You don't have permission to view audit logs.
            </div>
          </div>
        }>
          <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-600" />
                Audit Trail
              </h1>
              <p className="text-slate-600 mt-2">
                System activity log for security and compliance monitoring
              </p>
            </div>
            
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Total Events</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {stats.totalLogs.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Last 7 days</p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Top Action</p>
                      <p className="text-lg font-bold text-slate-900 mt-1 truncate">
                        {stats.actionCounts[0]?.action || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {stats.actionCounts[0]?._count.action || 0} times
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Active Users</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {stats.userActivity.length}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">With activity</p>
                    </div>
                    <User className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Avg Daily</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {Math.round(stats.totalLogs / 7)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Events per day</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
              </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Action
                      </label>
                      <input
                        type="text"
                        value={filters.action}
                        onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                        placeholder="e.g., CREATE_USER"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Resource
                      </label>
                      <input
                        type="text"
                        value={filters.resource}
                        onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
                        placeholder="e.g., User"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        setFilters({ action: '', resource: '', userId: '', startDate: '', endDate: '' })
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
            
            {/* Audit Logs Table */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-slate-600 mt-4">Loading audit logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No audit logs found
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
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Resource
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            IP Address
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
                                {log.user?.name || 'System'}
                              </div>
                              <div className="text-xs text-slate-500">
                                {log.user?.email || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-slate-900">{log.resource}</div>
                              {log.resourceId && (
                                <div className="text-xs text-slate-500 truncate max-w-xs">
                                  ID: {log.resourceId}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              {log.ipAddress || 'N/A'}
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
