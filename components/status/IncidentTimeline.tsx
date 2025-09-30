'use client'

import { CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react'

type TimelineEvent = {
  id: string
  service?: string
  eventType: string
  severity: string
  message: string
  createdAt: string
}

type IncidentTimelineProps = {
  events: TimelineEvent[]
}

export default function IncidentTimeline({ events }: IncidentTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12" role="status" aria-label="No events">
        <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">No recent system events</p>
        <p className="text-xs text-slate-500 mt-2">
          Events will appear here as service status changes occur
        </p>
      </div>
    )
  }

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" aria-label="Critical" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" aria-label="Warning" />
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" aria-label="Healthy" />
      default:
        return <Activity className="h-5 w-5 text-slate-400" aria-label="Info" />
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'error':
        return 'border-red-300 bg-red-50'
      case 'recovery':
        return 'border-green-300 bg-green-50'
      case 'deploy':
        return 'border-blue-300 bg-blue-50'
      default:
        return 'border-yellow-300 bg-yellow-50'
    }
  }

  const getBadgeColor = (eventType: string) => {
    switch (eventType) {
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'recovery':
        return 'bg-green-100 text-green-800'
      case 'deploy':
        return 'bg-blue-100 text-blue-800 border border-blue-200'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  // Separate deploy events from incidents
  const deployEvents = events.filter(e => e.eventType === 'deploy')
  const incidentEvents = events.filter(e => e.eventType !== 'deploy')

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays}d ago`
  }
  return (
    <div className="space-y-3">
      {events.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-green-50 via-emerald-50/50 to-green-50 rounded-xl border-2 border-green-200/50 shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 shadow-lg mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-lg font-semibold text-slate-900 mb-1">All Systems Operational</p>
          <p className="text-sm text-slate-600">No incidents in the past 24 hours</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[23px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200" />
          
          {events.map((event, idx) => {
            const Icon = getIcon(event.eventType)
            const badgeColor = getBadgeColor(event.eventType)
            const isDeploy = event.eventType === 'deploy'
            
            return (
              <div
                key={event.id}
                className="relative flex items-start gap-4 mb-3 animate-fade-in"
                style={{ animationDelay: `${idx * 75}ms` }}
              >
                {/* Icon with glow */}
                <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl ${badgeColor} ${
                  isDeploy ? 'ring-2 ring-blue-200' : 'shadow-md'
                } flex items-center justify-center z-10 group-hover:scale-105 transition-transform duration-200`}>
                  <Icon className="h-5 w-5" />
                  {isDeploy && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white animate-pulse" />
                  )}
                </div>
                
                {/* Content card */}
                <div className={`flex-1 p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                  isDeploy 
                    ? 'bg-gradient-to-br from-blue-50 to-indigo-50/30 border-blue-200/60 hover:border-blue-300' 
                    : 'bg-gradient-to-br from-white to-slate-50/50 border-slate-200/80 hover:border-slate-300'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-sm font-semibold text-slate-900 leading-snug">{event.message}</h4>
                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap bg-slate-100 px-2 py-1 rounded-md">
                      {formatTime(event.createdAt)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2.5 py-1 rounded-lg font-semibold ${badgeColor} shadow-sm`}>
                      {event.eventType.replace('_', ' ')}
                    </span>
                    {event.service && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-slate-600 uppercase tracking-wide">{event.service}</span>
                      </>
                    )}
                    {event.severity && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className={`font-semibold ${getSeverityColor(event.severity)} uppercase tracking-wide`}>
                          {event.severity}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
