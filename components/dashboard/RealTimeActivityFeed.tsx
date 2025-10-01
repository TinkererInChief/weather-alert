'use client'

import { useEffect, useState } from 'react'
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  MessageSquare, 
  Phone, 
  Mail, 
  MessageCircle,
  Server,
  Users,
  Zap
} from 'lucide-react'

type ActivityType = 
  | 'earthquake_detected' 
  | 'tsunami_detected'
  | 'alert_sent' 
  | 'notification_delivered'
  | 'contact_confirmed'
  | 'system_event'
  | 'manual_action'
  | 'service_health'

type ActivityItem = {
  id: string
  type: ActivityType
  title: string
  description?: string
  timestamp: Date
  severity: 'info' | 'success' | 'warning' | 'error'
  metadata?: Record<string, any>
}

type RealTimeActivityFeedProps = {
  maxItems?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

export default function RealTimeActivityFeed({ 
  maxItems = 20, 
  autoRefresh = true,
  refreshInterval = 3000 
}: RealTimeActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (!autoRefresh || isPaused) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/activities')
        if (res.ok) {
          const data = await res.json()
          setActivities(prev => {
            const newItems = data.activities || []
            const combined = [...newItems, ...prev]
            return combined.slice(0, maxItems)
          })
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error)
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, isPaused, maxItems, refreshInterval])

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'earthquake_detected':
      case 'tsunami_detected':
        return Activity
      case 'alert_sent':
        return Zap
      case 'notification_delivered':
        return CheckCircle2
      case 'contact_confirmed':
        return Users
      case 'system_event':
        return Server
      case 'service_health':
        return AlertTriangle
      case 'manual_action':
        return Info
      default:
        return Activity
    }
  }

  const getActivityColor = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'text-green-600 bg-green-50'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50'
      case 'error':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-blue-600 bg-blue-50'
    }
  }

  const getRelativeTime = (timestamp: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - new Date(timestamp).getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)

    if (diffSecs < 10) return 'just now'
    if (diffSecs < 60) return `${diffSecs}s ago`
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Live Activity Feed</h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time system events and notifications</p>
        </div>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isPaused
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {isPaused ? 'Paused' : 'Live'}
        </button>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Activity className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm text-slate-600 font-medium">No recent activity</p>
            <p className="text-xs text-slate-500 mt-1">Events will appear here as they happen</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              const colorClass = getActivityColor(activity.severity)
              
              return (
                <div
                  key={activity.id}
                  className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium text-slate-900 line-clamp-1">
                          {activity.title}
                        </h4>
                        <span className="text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
                          {getRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                      
                      {activity.description && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                      )}

                      {activity.metadata && (
                        <div className="flex items-center gap-3 mt-2">
                          {activity.metadata.contactsNotified && (
                            <span className="text-xs text-slate-500">
                              <Users className="inline h-3 w-3 mr-1" />
                              {activity.metadata.contactsNotified} notified
                            </span>
                          )}
                          {activity.metadata.channels && (
                            <div className="flex items-center gap-1">
                              {activity.metadata.channels.includes('sms') && (
                                <MessageSquare className="h-3 w-3 text-slate-400" />
                              )}
                              {activity.metadata.channels.includes('whatsapp') && (
                                <MessageCircle className="h-3 w-3 text-slate-400" />
                              )}
                              {activity.metadata.channels.includes('email') && (
                                <Mail className="h-3 w-3 text-slate-400" />
                              )}
                              {activity.metadata.channels.includes('voice') && (
                                <Phone className="h-3 w-3 text-slate-400" />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
