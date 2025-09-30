'use client'

import { useState } from 'react'
import { Shield, User, Clock, Filter, Download, Search } from 'lucide-react'

type AuditAction = 
  | 'monitoring_started'
  | 'monitoring_stopped'
  | 'alert_sent'
  | 'alert_threshold_changed'
  | 'contact_added'
  | 'contact_removed'
  | 'settings_updated'
  | 'manual_override'
  | 'system_access'
  | 'data_export'

type AuditEntry = {
  id: string
  timestamp: Date
  action: AuditAction
  description: string
  user: {
    id: string
    name: string
    email: string
  }
  ipAddress?: string
  metadata?: Record<string, any>
  severity: 'info' | 'warning' | 'critical'
}

type AuditTrailLoggerProps = {
  entries: AuditEntry[]
  onExport?: () => void
}

export default function AuditTrailLogger({ entries, onExport }: AuditTrailLoggerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAction, setFilterAction] = useState<AuditAction | 'all'>('all')
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'info' | 'warning' | 'critical'>('all')

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesAction = filterAction === 'all' || entry.action === filterAction
    const matchesSeverity = filterSeverity === 'all' || entry.severity === filterSeverity

    return matchesSearch && matchesAction && matchesSeverity
  })

  const getActionLabel = (action: AuditAction) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Audit Trail
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Complete log of all system actions and user activities
            </p>
          </div>
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Filter */}
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value as AuditAction | 'all')}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Actions</option>
            <option value="monitoring_started">Monitoring Started</option>
            <option value="monitoring_stopped">Monitoring Stopped</option>
            <option value="alert_sent">Alert Sent</option>
            <option value="alert_threshold_changed">Threshold Changed</option>
            <option value="contact_added">Contact Added</option>
            <option value="contact_removed">Contact Removed</option>
            <option value="settings_updated">Settings Updated</option>
            <option value="manual_override">Manual Override</option>
            <option value="system_access">System Access</option>
            <option value="data_export">Data Export</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as any)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severity</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Entries List */}
      <div className="max-h-[500px] overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-medium">No audit entries found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  {/* User Avatar */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {entry.user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">
                          {entry.user.name}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getSeverityColor(entry.severity)}`}>
                          {getActionLabel(entry.action)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-2">{entry.description}</p>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.user.email}
                      </span>
                      {entry.ipAddress && (
                        <span>IP: {entry.ipAddress}</span>
                      )}
                    </div>

                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                          View Details
                        </summary>
                        <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                          <pre className="text-xs text-slate-700 font-mono overflow-x-auto">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Showing {filteredEntries.length} of {entries.length} entries</span>
          <span className="text-slate-500">Last 30 days</span>
        </div>
      </div>
    </div>
  )
}
