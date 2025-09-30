'use client'

import { AlertTriangle, MapPin, Clock, Users, Zap, TrendingUp } from 'lucide-react'

type AlertPriority = 'critical' | 'high' | 'medium' | 'low'

type PrioritizedAlert = {
  id: string
  type: 'earthquake' | 'tsunami'
  magnitude?: number
  severity?: number
  location: string
  riskScore: number
  priority: AlertPriority
  contactsAtRisk: number
  impactRadius: number
  estimatedArrival?: number // minutes
  factors: {
    proximity: number
    historicalImpact: number
    populationDensity: number
    timeSensitivity: number
  }
  recommendation: string
}

type SmartAlertPrioritizationProps = {
  alerts: PrioritizedAlert[]
  onSendAlert?: (alertId: string) => void
  onViewDetails?: (alertId: string) => void
}

export default function SmartAlertPrioritization({ 
  alerts, 
  onSendAlert,
  onViewDetails 
}: SmartAlertPrioritizationProps) {
  const getPriorityColor = (priority: AlertPriority) => {
    switch (priority) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-900',
          badge: 'bg-red-600 text-white'
        }
      case 'high':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-300',
          text: 'text-orange-900',
          badge: 'bg-orange-600 text-white'
        }
      case 'medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          text: 'text-yellow-900',
          badge: 'bg-yellow-600 text-white'
        }
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-300',
          text: 'text-blue-900',
          badge: 'bg-blue-600 text-white'
        }
    }
  }

  const getRiskLevel = (score: number) => {
    if (score >= 80) return 'Critical Risk'
    if (score >= 60) return 'High Risk'
    if (score >= 40) return 'Moderate Risk'
    return 'Low Risk'
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Zap className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-600 font-medium">No priority alerts</p>
        <p className="text-xs text-slate-500 mt-1">High-risk events will be displayed here</p>
      </div>
    )
  }

  // Sort by risk score (highest first)
  const sortedAlerts = [...alerts].sort((a, b) => b.riskScore - a.riskScore)

  return (
    <div className="space-y-4">
      {sortedAlerts.map((alert) => {
        const colors = getPriorityColor(alert.priority)

        return (
          <div
            key={alert.id}
            className={`${colors.bg} border-2 ${colors.border} rounded-xl p-5 transition-all hover:shadow-lg`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${colors.badge}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-lg font-bold ${colors.text}`}>
                      {alert.type === 'earthquake' ? 'EARTHQUAKE' : 'TSUNAMI'} ALERT
                    </h3>
                    <span className={`px-2 py-0.5 ${colors.badge} text-xs font-bold uppercase rounded`}>
                      {alert.priority}
                    </span>
                  </div>
                  <p className="text-sm ${colors.text} font-medium">
                    {alert.type === 'earthquake' ? `M${alert.magnitude?.toFixed(1)}` : `Severity ${alert.severity}`} • {alert.location}
                  </p>
                </div>
              </div>

              {/* Risk Score */}
              <div className="text-right">
                <div className="text-3xl font-bold ${colors.text}">{alert.riskScore}</div>
                <div className="text-xs font-medium text-slate-600">{getRiskLevel(alert.riskScore)}</div>
              </div>
            </div>

            {/* Impact Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Users className={`h-4 w-4 ${colors.text}`} />
                <div>
                  <div className={`text-sm font-semibold ${colors.text}`}>
                    {alert.contactsAtRisk}
                  </div>
                  <div className="text-xs text-slate-600">Contacts at Risk</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className={`h-4 w-4 ${colors.text}`} />
                <div>
                  <div className={`text-sm font-semibold ${colors.text}`}>
                    {alert.impactRadius} km
                  </div>
                  <div className="text-xs text-slate-600">Impact Radius</div>
                </div>
              </div>

              {alert.estimatedArrival && (
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${colors.text}`} />
                  <div>
                    <div className={`text-sm font-semibold ${colors.text}`}>
                      {alert.estimatedArrival} min
                    </div>
                    <div className="text-xs text-slate-600">Estimated Arrival</div>
                  </div>
                </div>
              )}
            </div>

            {/* Risk Factors */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-700 mb-2">Risk Factors</div>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(alert.factors).map(([factor, value]) => (
                  <div key={factor} className="bg-white rounded-lg p-2 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs capitalize text-slate-600">
                        {factor.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{value}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          value >= 80 ? 'bg-red-500' :
                          value >= 60 ? 'bg-orange-500' :
                          value >= 40 ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendation */}
            <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-1">
                    Recommended Action
                  </div>
                  <p className="text-xs text-slate-600">{alert.recommendation}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onSendAlert?.(alert.id)}
                className={`flex-1 py-2.5 ${colors.badge} font-medium text-sm rounded-lg hover:opacity-90 transition-opacity`}
              >
                Send Emergency Alert
              </button>
              <button
                onClick={() => onViewDetails?.(alert.id)}
                className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium text-sm rounded-lg hover:bg-slate-50 transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
