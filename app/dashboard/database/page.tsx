'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import WidgetCard from '@/components/dashboard/WidgetCard'
import { Database, Ship, MapPin, Bell, Users, Activity } from 'lucide-react'

type TableStats = {
  table: string
  count: number
  size: string
  lastUpdated: string | null
}

type DatabaseStats = {
  tables: TableStats[]
  totalSize: string
  vesselStats: {
    total: number
    withPositions: number
    recentlyActive: number
    newToday: number
  }
  positionStats: {
    total: number
    today: number
    lastHour: number
    last15Min: number
  }
  alertStats: {
    total: number
    active: number
    critical: number
  }
  userStats: {
    total: number
    admins: number
  }
}

export default function DatabaseDashboard() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/database/stats', { cache: 'no-store' })
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
        setError(null)
      } else {
        setError(data.details || data.error || 'Unknown error')
      }
    } catch (err) {
      console.error('Failed to fetch database stats:', err)
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <AppLayout title="Database Statistics" breadcrumbs={[{ label: 'Database' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Loading database statistics...</div>
        </div>
      </AppLayout>
    )
  }

  if (!stats || error) {
    return (
      <AppLayout title="Database Statistics" breadcrumbs={[{ label: 'Database' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 font-semibold mb-2">Failed to load database statistics</div>
            {error && <div className="text-sm text-slate-600 font-mono bg-slate-100 p-4 rounded">{error}</div>}
            <button 
              onClick={() => {
                setLoading(true)
                fetchStats()
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Database Statistics" breadcrumbs={[{ label: 'Database' }]}>
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Vessels</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">
                  {stats.vesselStats.total.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  +{stats.vesselStats.newToday.toLocaleString()} today
                </p>
              </div>
              <Ship className="h-12 w-12 text-blue-400 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Vessel Positions</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  {stats.positionStats.total.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  +{stats.positionStats.today.toLocaleString()} today
                </p>
              </div>
              <MapPin className="h-12 w-12 text-green-400 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Active Alerts</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">
                  {stats.alertStats.active.toLocaleString()}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  {stats.alertStats.critical} critical
                </p>
              </div>
              <Bell className="h-12 w-12 text-orange-400 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Database Size</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">
                  {stats.totalSize}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {stats.tables.length} tables
                </p>
              </div>
              <Database className="h-12 w-12 text-purple-400 opacity-50" />
            </div>
          </div>
        </div>

        {/* Real-time Activity */}
        <WidgetCard title="Real-time Activity" icon={Activity} iconColor="blue">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Last 15 Minutes</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats.positionStats.last15Min.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">position updates</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Last Hour</p>
              <p className="text-3xl font-bold text-green-600">
                {stats.positionStats.lastHour.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">position updates</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Recently Active</p>
              <p className="text-3xl font-bold text-purple-600">
                {stats.vesselStats.recentlyActive.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">vessels (last hour)</p>
            </div>
          </div>
        </WidgetCard>

        {/* Table Details */}
        <WidgetCard title="Database Tables" icon={Database} iconColor="slate">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Table Name</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Record Count</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Size</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {stats.tables.map((table) => (
                  <tr key={table.table} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-mono text-slate-900">{table.table}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-slate-700">
                      {table.count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-600">{table.size}</td>
                    <td className="py-3 px-4 text-sm text-right text-slate-500">
                      {table.lastUpdated || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WidgetCard>
      </div>
    </AppLayout>
  )
}
