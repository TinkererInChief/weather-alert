'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Mail, Phone, MessageCircle, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'
import WidgetCard from './WidgetCard'

type ChannelStatus = {
  id: string
  name: string
  icon: any
  status: 'configured' | 'working' | 'error' | 'unconfigured'
  lastSuccessful?: string
  lastAttempt?: string
  error?: string
  successRate?: number
}

type ChannelStatusWidgetProps = {
  timeRangeExternal?: '24h' | '7d' | '30d'
  refreshKey?: number
}

export default function ChannelStatusWidget({ timeRangeExternal = '24h', refreshKey }: ChannelStatusWidgetProps = {}) {
  const [channels, setChannels] = useState<ChannelStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChannelStatus = async () => {
      try {
        // Only show loading on initial load, not on refresh
        if (channels.length === 0) setLoading(true)
        
        // Fetch health data for channel status
        const healthResponse = await fetch('/api/health?detailed=true', { cache: 'no-store' })
        const healthData = await healthResponse.json()
        const services = healthData.checks?.services || {}

        // Fetch recent delivery stats for success rates (sync with dashboard filter)
        const deliveryResponse = await fetch(`/api/delivery/stats?range=${encodeURIComponent(timeRangeExternal)}`, { cache: 'no-store' })
        const deliveryData = await deliveryResponse.json()

        const byChannel = deliveryData?.stats?.byChannel || {
          sms: { sent: 0, delivered: 0, read: 0, failed: 0 },
          email: { sent: 0, delivered: 0, read: 0, failed: 0 },
          whatsapp: { sent: 0, delivered: 0, read: 0, failed: 0 },
          voice: { sent: 0, delivered: 0, read: 0, failed: 0 }
        }
        const totalOf = (s: { sent: number; delivered: number; read: number; failed: number }) => s.sent + s.delivered + s.read + s.failed

        const channelStatuses: ChannelStatus[] = [
          {
            id: 'sms',
            name: 'SMS',
            icon: MessageSquare,
            status: getChannelStatus(services.twilio?.status),
            successRate: (() => { const s = byChannel.sms; const t = totalOf(s); return t ? (s.delivered / t) * 100 : 0 })()
          },
          {
            id: 'email',
            name: 'Email',
            icon: Mail,
            status: getChannelStatus(services.sendgrid?.status),
            successRate: (() => { const s = byChannel.email; const t = totalOf(s); return t ? (s.delivered / t) * 100 : 0 })()
          },
          {
            id: 'voice',
            name: 'Voice',
            icon: Phone,
            status: getChannelStatus(services.twilio?.status),
            successRate: (() => { const s = byChannel.voice; const t = totalOf(s); return t ? (s.delivered / t) * 100 : 0 })()
          },
          {
            id: 'whatsapp',
            name: 'WhatsApp',
            icon: MessageCircle,
            status: getChannelStatus(services.twilio?.status),
            successRate: (() => { const s = byChannel.whatsapp; const t = totalOf(s); return t ? (s.delivered / t) * 100 : 0 })()
          },
        ]

        setChannels(channelStatuses)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch channel status')
      } finally {
        setLoading(false)
      }
    }

    fetchChannelStatus()
    // Refresh every 60 seconds
    const interval = setInterval(fetchChannelStatus, 60 * 1000)
    return () => clearInterval(interval)
  }, [timeRangeExternal, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const getChannelStatus = (status: any): 'configured' | 'working' | 'error' | 'unconfigured' => {
    if (!status) return 'unconfigured'
    if (status === 'ok' || status === 'healthy') return 'working'
    if (status === 'error' || status === 'unhealthy') return 'error'
    return 'configured'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'working':
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            <span>Working</span>
          </div>
        )
      case 'configured':
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            <span>Ready</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">
            <XCircle className="h-3 w-3" />
            <span>Error</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-medium">
            <AlertTriangle className="h-3 w-3" />
            <span>Not Configured</span>
          </div>
        )
    }
  }

  const formatLastSend = (timestamp?: string) => {
    if (!timestamp) return 'Never'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'border-green-200 bg-green-50'
      case 'configured': return 'border-blue-200 bg-blue-50'
      case 'error': return 'border-red-200 bg-red-50'
      default: return 'border-slate-200 bg-slate-50'
    }
  }

  if (loading) {
    return (
      <WidgetCard title="Notification Channels" icon={MessageSquare} iconColor="green">
        <div className="animate-pulse">
          <div className="space-y-3">
            <div className="h-16 bg-slate-200 rounded"></div>
            <div className="h-16 bg-slate-200 rounded"></div>
            <div className="h-16 bg-slate-200 rounded"></div>
            <div className="h-16 bg-slate-200 rounded"></div>
          </div>
        </div>
      </WidgetCard>
    )
  }

  if (error) {
    return (
      <WidgetCard title="Notification Channels" icon={MessageSquare} iconColor="green">
        <p className="text-sm text-red-600">{error}</p>
      </WidgetCard>
    )
  }

  const workingCount = channels.filter(c => c.status === 'working' || c.status === 'configured').length
  const operational = workingCount === channels.length

  return (
    <WidgetCard
      title="Notification Channels"
      icon={MessageSquare}
      iconColor="green"
      headerAction={
        <span className={`text-xs px-2 py-1 rounded-full ${
          operational ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {workingCount}/{channels.length} Operational
        </span>
      }
    >

      <div className="space-y-3">
        {channels.map((channel) => {
          const Icon = channel.icon
          return (
            <div
              key={channel.id}
              className={`p-4 rounded-lg border ${getStatusColor(channel.status)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-slate-900">
                      {channel.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {channel.lastSuccessful && (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Clock className="h-3 w-3" />
                          {formatLastSend(channel.lastSuccessful)}
                        </div>
                      )}
                      {channel.successRate !== undefined && (
                        <div className="text-xs text-slate-600">
                          • {Math.round(channel.successRate)}% success
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {getStatusBadge(channel.status)}
              </div>

              {channel.successRate !== undefined && (
                <div className="mt-3">
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        channel.successRate >= 95 ? 'bg-green-500' :
                        channel.successRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${channel.successRate}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500 text-center">
          Last 24 hours performance
        </div>
      </div>
    </WidgetCard>
  )
}
