'use client'

import { useState } from 'react'
import { Ship, Users, MessageSquare, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { VesselAlert } from '../types'

type EscalationSummaryWidgetProps = {
  alerts: VesselAlert[]
  isDryRun: boolean
  onViewFull: () => void
}

export function EscalationSummaryWidget({ alerts, isDryRun, onViewFull }: EscalationSummaryWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (alerts.length === 0) return null

  const totalNotifications = alerts.reduce((sum, alert) => sum + alert.escalation.notificationsSent, 0)
  const totalContacts = new Set(alerts.flatMap(a => a.contacts.map(c => c.name))).size
  const criticalCount = alerts.filter(a => a.severity.toLowerCase() === 'critical').length
  const highCount = alerts.filter(a => a.severity.toLowerCase() === 'high').length

  return (
    <div className="fixed bottom-48 left-4 z-[1000] w-80 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-slate-800/60 border-b border-white/10 hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Escalation Summary</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Quick Stats */}
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800/40 rounded-lg p-2">
            <div className="text-xl font-bold text-white">{alerts.length}</div>
            <div className="text-xs text-slate-400">Alerts</div>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-2">
            <div className="text-xl font-bold text-cyan-400">{totalContacts}</div>
            <div className="text-xs text-slate-400">Contacts</div>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-2">
            <div className="text-xl font-bold text-green-400">{totalNotifications}</div>
            <div className="text-xs text-slate-400">{isDryRun ? 'Simulated' : 'Sent'}</div>
          </div>
        </div>

        {/* Severity Breakdown */}
        {(criticalCount > 0 || highCount > 0) && (
          <div className="flex items-center gap-2 text-xs">
            {criticalCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded">
                <span className="font-semibold">{criticalCount}</span>
                <span>Critical</span>
              </div>
            )}
            {highCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded">
                <span className="font-semibold">{highCount}</span>
                <span>High</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-white/10">
          <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
            {alerts.slice(0, 5).map((alert, i) => (
              <div
                key={alert.alertId}
                className="bg-slate-800/40 rounded-lg p-2 border border-white/5"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Ship className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-white truncate">
                      {alert.vessel.name}
                    </span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    alert.severity.toLowerCase() === 'critical'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-orange-500/20 text-orange-400'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MessageSquare className="w-3 h-3" />
                  <span>{alert.escalation.notificationsSent} {isDryRun ? 'simulated' : 'sent'}</span>
                  <span>•</span>
                  <span>{alert.contacts.length} contacts</span>
                </div>
              </div>
            ))}
            {alerts.length > 5 && (
              <div className="text-center text-xs text-slate-500 pt-1">
                +{alerts.length - 5} more alerts
              </div>
            )}
          </div>

          {/* View Full Button */}
          <div className="p-3 border-t border-white/10">
            <button
              onClick={onViewFull}
              className="w-full px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View Full Escalation Matrix
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
