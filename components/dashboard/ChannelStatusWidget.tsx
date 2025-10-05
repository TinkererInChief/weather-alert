'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Mail, Phone, MessageCircle, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'

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

export default function ChannelStatusWidget() {
  const [channels, setChannels] = useState<ChannelStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChannelStatus = async () => {
      try {
        setLoading(true)
        
        // Fetch health data for channel status
        const healthResponse = await fetch('/api/health?detailed=true', { cache: 'no-store' })
        const healthData = await healthResponse.json()
        const services = healthData.checks?.services || {}

        // Fetch recent delivery stats for success rates
        const deliveryResponse = await fetch('/api/delivery/stats?range=24h', { cache: 'no-store' })
        const deliveryData = await deliveryResponse.json()

        const channelStatuses: ChannelStatus[] = [
          {
            id: 'sms',
            name: 'SMS',
            icon: MessageSquare,
            status: getChannelStatus(services.sms?.status),
            lastSuccessful: deliveryData?.data?.byChannel?.sms?.lastSuccessful,
            successRate: deliveryData?.data?.byChannel?.sms?.successRate
          },
          {
            id: 'email',
            name: 'Email',
            icon: Mail,
            status: getChannelStatus(services.email?.status),
            lastSuccessful: deliveryData?.data?.byChannel?.email?.lastSuccessful,
            successRate: deliveryData?.data?.byChannel?.email?.successRate
          },
          {
            id: 'voice',
            name: 'Voice',
            icon: Phone,
            status: getChannelStatus(services.voice?.status),
            lastSuccessful: deliveryData?.data?.byChannel?.voice?.lastSuccessful,
            successRate: deliveryData?.data?.byChannel?.voice?.successRate
          },
          {
            id: 'whatsapp',
            name: 'WhatsApp',
            icon: MessageCircle,
            status: getChannelStatus(services.whatsapp?.status),
            lastSuccessful: deliveryData?.data?.byChannel?.whatsapp?.lastSuccessful,
            successRate: deliveryData?.data?.byChannel?.whatsapp?.successRate
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
  }, [])

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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-40 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-slate-200 rounded"></div>
            <div className="h-16 bg-slate-200 rounded"></div>
            <div className="h-16 bg-slate-200 rounded"></div>
            <div className="h-16 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-2">Notification Channels</h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  const workingCount = channels.filter(c => c.status === 'working' || c.status === 'configured').length

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Notification Channels</h3>
        <div className="text-xs font-medium text-slate-600">
          {workingCount}/{channels.length} Operational
        </div>
      </div>

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
    </div>
  )
}
