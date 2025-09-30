'use client'

import { CheckCircle2, Eye, Send, Users, MessageSquare, MessageCircle, Mail, Phone } from 'lucide-react'

type EngagementData = {
  alertId: string
  title: string
  timestamp: string
  sent: number
  delivered: number
  read: number
  confirmed: number
  channelBreakdown: {
    sms?: { sent: number; delivered: number; read: number }
    whatsapp?: { sent: number; delivered: number; read: number }
    email?: { sent: number; delivered: number; read: number }
    voice?: { sent: number; delivered: number; read: number }
  }
  topChannel?: string
}

type ContactEngagementAnalyticsProps = {
  recentAlerts: EngagementData[]
}

export default function ContactEngagementAnalytics({ recentAlerts }: ContactEngagementAnalyticsProps) {
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms':
        return MessageSquare
      case 'whatsapp':
        return MessageCircle
      case 'email':
        return Mail
      case 'voice':
        return Phone
      default:
        return Send
    }
  }

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0
    return Math.round((value / total) * 100)
  }

  if (recentAlerts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-600 font-medium">No recent alert data</p>
        <p className="text-xs text-slate-500 mt-1">Engagement metrics will appear here after alerts are sent</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-5 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Contact Engagement Analytics</h3>
        <p className="text-xs text-slate-500 mt-1">Track how contacts interact with emergency alerts</p>
      </div>

      <div className="divide-y divide-slate-100">
        {recentAlerts.map((alert) => {
          const deliveryRate = calculatePercentage(alert.delivered, alert.sent)
          const readRate = calculatePercentage(alert.read, alert.sent)
          const confirmRate = calculatePercentage(alert.confirmed, alert.sent)
          const TopChannelIcon = alert.topChannel ? getChannelIcon(alert.topChannel) : Send

          return (
            <div key={alert.alertId} className="p-5 hover:bg-slate-50 transition-colors">
              {/* Alert Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{alert.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                {alert.topChannel && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg">
                    <TopChannelIcon className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">
                      Best: {alert.topChannel}
                    </span>
                  </div>
                )}
              </div>

              {/* Engagement Funnel */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Send className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">{alert.sent}</div>
                  <div className="text-xs text-slate-500">Sent</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {alert.delivered}
                    <span className="text-sm font-normal text-green-600 ml-1">
                      ({deliveryRate}%)
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">Delivered</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Eye className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {alert.read}
                    <span className="text-sm font-normal text-blue-600 ml-1">
                      ({readRate}%)
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">Read</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {alert.confirmed}
                    <span className="text-sm font-normal text-purple-600 ml-1">
                      ({confirmRate}%)
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">Confirmed</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div
                  className="absolute top-0 left-0 h-full bg-green-200 transition-all"
                  style={{ width: `${deliveryRate}%` }}
                />
                <div
                  className="absolute top-0 left-0 h-full bg-blue-400 transition-all"
                  style={{ width: `${readRate}%` }}
                />
                <div
                  className="absolute top-0 left-0 h-full bg-purple-600 transition-all"
                  style={{ width: `${confirmRate}%` }}
                />
              </div>

              {/* Channel Breakdown */}
              {Object.keys(alert.channelBreakdown).length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(alert.channelBreakdown).map(([channel, stats]) => {
                    const ChannelIcon = getChannelIcon(channel)
                    const channelReadRate = calculatePercentage(stats.read, stats.sent)

                    return (
                      <div
                        key={channel}
                        className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg"
                      >
                        <ChannelIcon className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-slate-700 truncate capitalize">
                            {channel}
                          </div>
                          <div className="text-xs text-slate-500">
                            {channelReadRate}% read
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <button className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-center">
          View Detailed Analytics →
        </button>
      </div>
    </div>
  )
}
