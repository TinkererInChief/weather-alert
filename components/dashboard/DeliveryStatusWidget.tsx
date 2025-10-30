'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Send, Eye, Mail, MessageSquare, Phone } from 'lucide-react'
import WidgetCard from './WidgetCard'
import HelpTooltip from '../guidance/HelpTooltip'

type DeliveryStats = {
  total: number
  sent: number
  delivered: number
  read: number
  failed: number
  queued: number
  byChannel: {
    sms: { sent: number; delivered: number; read: number; failed: number }
    email: { sent: number; delivered: number; read: number; failed: number }
    whatsapp: { sent: number; delivered: number; read: number; failed: number }
    voice: { sent: number; delivered: number; read: number; failed: number }
  }
}

type DeliveryStatusWidgetProps = {
  timeRangeExternal?: '24h' | '7d' | '30d'
  refreshKey?: number
}

export default function DeliveryStatusWidget({ timeRangeExternal, refreshKey }: DeliveryStatusWidgetProps = {}) {
  const [stats, setStats] = useState<DeliveryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('30d')

  // Sync with external dashboard time filter if provided
  useEffect(() => {
    if (timeRangeExternal && timeRangeExternal !== timeRange) {
      setTimeRange(timeRangeExternal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRangeExternal])

  useEffect(() => {
    fetchDeliveryStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchDeliveryStats, 30000)
    return () => clearInterval(interval)
  }, [timeRange, refreshKey])

  const fetchDeliveryStats = async () => {
    try {
      const response = await fetch(`/api/delivery/stats?range=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch delivery stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <WidgetCard title="Delivery Status" icon={Send} iconColor="orange" subtitle="Real-time notification delivery metrics">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          </div>
        </div>
      </WidgetCard>
    )
  }

  const deliveryRate = stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(1) : '0'
  const readRate = stats.delivered > 0 ? ((stats.read / stats.delivered) * 100).toFixed(1) : '0'

  return (
    <WidgetCard
      title="Delivery Status"
      icon={Send}
      iconColor="orange"
      subtitle="Real-time notification delivery metrics"
      className="flex-1 flex flex-col"
      noPadding
    >
      {/* Time Range Selector */}
      <div className="px-6 pb-4 border-b border-slate-200">
        <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('24h')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                timeRange === '24h'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                timeRange === '7d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                timeRange === '30d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              30d
            </button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-xs text-slate-500 mt-1">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
            <div className="text-xs text-slate-500 mt-1">Sent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <div className="text-xs text-slate-500 mt-1">Delivered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.read}</div>
            <div className="text-xs text-slate-500 mt-1">Read</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-xs text-slate-500 mt-1">Failed</div>
          </div>
        </div>

        {/* Rates */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-slate-600">Delivery Rate:</span>
            <span className="font-semibold text-slate-900">{deliveryRate}%</span>
            <HelpTooltip 
              title="Success Rate"
              content="Percentage of messages successfully delivered across all channels. Target: >95%."
              side="top"
            />
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-purple-600" />
            <span className="text-slate-600">Read Rate:</span>
            <span className="font-semibold text-slate-900">{readRate}%</span>
          </div>
        </div>
      </div>

      {/* Channel Breakdown */}
      <div className="p-6 flex-1">
        <h4 className="text-sm font-semibold text-slate-700 mb-4">By Channel</h4>
        <div className="space-y-4">
          {/* SMS */}
          <ChannelRow
            icon={<MessageSquare className="h-4 w-4" />}
            name="SMS"
            color="blue"
            stats={stats.byChannel.sms}
          />

          {/* Email */}
          <ChannelRow
            icon={<Mail className="h-4 w-4" />}
            name="Email"
            color="green"
            stats={stats.byChannel.email}
          />

          {/* WhatsApp */}
          <ChannelRow
            icon={<MessageSquare className="h-4 w-4" />}
            name="WhatsApp"
            color="emerald"
            stats={stats.byChannel.whatsapp}
          />

          {/* Voice */}
          <ChannelRow
            icon={<Phone className="h-4 w-4" />}
            name="Voice"
            color="purple"
            stats={stats.byChannel.voice}
          />
        </div>
      </div>
    </WidgetCard>
  )
}

type ChannelRowProps = {
  icon: React.ReactNode
  name: string
  color: 'blue' | 'green' | 'emerald' | 'purple'
  stats: { sent: number; delivered: number; read: number; failed: number }
}

function ChannelRow({ icon, name, color, stats }: ChannelRowProps) {
  const total = stats.sent + stats.delivered + stats.read + stats.failed
  
  if (total === 0) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-${color}-100 text-${color}-600 flex items-center justify-center`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-700">{name}</div>
          <div className="text-xs text-slate-500">No messages sent</div>
        </div>
      </div>
    )
  }

  const deliveredPercent = ((stats.delivered / total) * 100).toFixed(0)
  const readPercent = ((stats.read / total) * 100).toFixed(0)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-${color}-100 text-${color}-600 flex items-center justify-center`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-medium text-slate-700">{name}</div>
            <div className="text-xs text-slate-500">{total} total</div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className={`bg-${color}-600`}
              style={{ width: `${deliveredPercent}%` }}
              title={`${stats.delivered} delivered`}
            />
            <div
              className={`bg-${color}-400`}
              style={{ width: `${readPercent}%` }}
              title={`${stats.read} read`}
            />
          </div>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="ml-11 flex items-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <Send className="h-3 w-3" />
          <span>{stats.sent} sent</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-600" />
          <span>{stats.delivered} delivered</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="h-3 w-3 text-purple-600" />
          <span>{stats.read} read</span>
        </div>
        {stats.failed > 0 && (
          <div className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-red-600" />
            <span>{stats.failed} failed</span>
          </div>
        )}
      </div>
    </div>
  )
}
