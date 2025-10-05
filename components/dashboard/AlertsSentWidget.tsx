'use client'

import { useEffect, useState } from 'react'
import { Send, AlertTriangle, Waves, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle } from 'lucide-react'

type TimeRange = '24h' | '7d' | '30d'

type AlertStats = {
  total: number
  byType: {
    earthquake: number
    tsunami: number
  }
  byStatus: {
    sent: number
    delivered: number
    failed: number
  }
  successRate: number
  trend: 'up' | 'down' | 'stable'
  trendValue: number
}

export default function AlertsSentWidget() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAlertStats = async () => {
      try {
        setLoading(true)
        
        // Fetch delivery stats
        const response = await fetch(`/api/delivery/stats?range=${timeRange}`, { cache: 'no-store' })
        const data = await response.json()

        if (data.success && data.data) {
          const deliveryData = data.data
          
          // Calculate stats from delivery data
          const total = deliveryData.total || 0
          const delivered = deliveryData.byStatus?.delivered || 0
          const sent = deliveryData.byStatus?.sent || 0
          const failed = deliveryData.byStatus?.failed || 0
          
          setStats({
            total,
            byType: {
              earthquake: deliveryData.byAlertType?.earthquake || 0,
              tsunami: deliveryData.byAlertType?.tsunami || 0
            },
            byStatus: {
              sent,
              delivered,
              failed
            },
            successRate: total > 0 ? ((delivered + sent) / total) * 100 : 100,
            trend: 'stable', // TODO: Calculate from historical comparison
            trendValue: 0
          })
        } else {
          // Fallback to notifications if delivery stats not available
          const notifResponse = await fetch('/api/notifications', { cache: 'no-store' })
          const notifData = await notifResponse.json()
          
          if (notifData.success && notifData.data) {
            const notifications = notifData.data.notifications || []
            
            // Filter by time range
            const now = Date.now()
            const timeWindows = {
              '24h': 24 * 60 * 60 * 1000,
              '7d': 7 * 24 * 60 * 60 * 1000,
              '30d': 30 * 24 * 60 * 60 * 1000,
            }
            const since = now - timeWindows[timeRange]
            
            const recentNotifs = notifications.filter((n: any) => 
              new Date(n.createdAt || n.time).getTime() >= since
            )
            
            const total = recentNotifs.length
            const delivered = recentNotifs.filter((n: any) => n.status === 'delivered').length
            const sent = recentNotifs.filter((n: any) => n.status === 'sent').length
            const failed = recentNotifs.filter((n: any) => n.status === 'failed').length
            
            setStats({
              total,
              byType: {
                earthquake: recentNotifs.filter((n: any) => 
                  n.alertType === 'earthquake' || n.type === 'earthquake'
                ).length,
                tsunami: recentNotifs.filter((n: any) => 
                  n.alertType === 'tsunami' || n.type === 'tsunami'
                ).length
              },
              byStatus: {
                sent,
                delivered,
                failed
              },
              successRate: total > 0 ? ((delivered + sent) / total) * 100 : 100,
              trend: 'stable',
              trendValue: 0
            })
          }
        }
        
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load alert statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchAlertStats()
    // Refresh every 2 minutes
    const interval = setInterval(fetchAlertStats, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [timeRange])

  const TrendIcon = stats?.trend === 'up' ? TrendingUp : stats?.trend === 'down' ? TrendingDown : Minus

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-32 mb-4"></div>
          <div className="h-10 bg-slate-200 rounded w-48 mb-6"></div>
          <div className="space-y-3">
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
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <Send className="h-5 w-5" />
          <h3 className="font-semibold">Alerts Sent</h3>
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Send className="h-5 w-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Alerts Sent</h3>
        </div>
        {stats.trendValue !== 0 && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            stats.trend === 'up' ? 'text-orange-600' : stats.trend === 'down' ? 'text-green-600' : 'text-slate-600'
          }`}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(stats.trendValue)}%</span>
          </div>
        )}
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 mb-6">
        {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              timeRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
          </button>
        ))}
      </div>

      {/* Total Alerts */}
      <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-600 mb-1">Total Alerts</div>
            <div className="text-4xl font-bold text-blue-600">{stats.total}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-600 mb-1">Success Rate</div>
            <div className={`text-2xl font-bold ${
              stats.successRate >= 95 ? 'text-green-600' :
              stats.successRate >= 80 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {Math.round(stats.successRate)}%
            </div>
          </div>
        </div>
      </div>

      {/* By Type */}
      <div className="space-y-3 mb-6">
        <div className="text-xs font-medium text-slate-600 mb-2">By Alert Type</div>
        
        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-slate-900">Earthquake</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-600">
              {stats.total > 0 ? Math.round((stats.byType.earthquake / stats.total) * 100) : 0}%
            </div>
            <div className="text-lg font-bold text-orange-600">
              {stats.byType.earthquake}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-900">Tsunami</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-600">
              {stats.total > 0 ? Math.round((stats.byType.tsunami / stats.total) * 100) : 0}%
            </div>
            <div className="text-lg font-bold text-blue-600">
              {stats.byType.tsunami}
            </div>
          </div>
        </div>
      </div>

      {/* By Status */}
      <div className="space-y-3">
        <div className="text-xs font-medium text-slate-600 mb-2">Delivery Status</div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-slate-700">Delivered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-32 bg-slate-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${stats.total > 0 ? (stats.byStatus.delivered / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
            <span className="font-medium text-slate-900 w-12 text-right">
              {stats.byStatus.delivered}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-600" />
            <span className="text-slate-700">Sent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-32 bg-slate-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${stats.total > 0 ? (stats.byStatus.sent / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
            <span className="font-medium text-slate-900 w-12 text-right">
              {stats.byStatus.sent}
            </span>
          </div>
        </div>

        {stats.byStatus.failed > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-slate-700">Failed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32 bg-slate-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-red-500"
                  style={{ width: `${stats.total > 0 ? (stats.byStatus.failed / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
              <span className="font-medium text-slate-900 w-12 text-right">
                {stats.byStatus.failed}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500 text-center">
          Performance over {timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : '30 days'}
        </div>
      </div>
    </div>
  )
}
