'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Ship, AlertTriangle, MapPin, Activity } from 'lucide-react'
import WidgetCard from '@/components/dashboard/WidgetCard'
import dynamic from 'next/dynamic'

const VesselMap = dynamic(() => import('@/components/vessels/VesselMap'), { ssr: false })

type Vessel = {
  id: string
  mmsi: string
  name: string
  vesselType: string
  latitude: number | null
  longitude: number | null
  speed: number | null
  heading: number | null
  destination: string | null
  lastSeen: Date | null
  activeAlertCount: number
}

type VesselAlert = {
  id: string
  vessel: {
    id: string
    mmsi: string
    name: string
  }
  type: string
  severity: string
  riskLevel: string
  distance: number | null
  recommendation: string
  createdAt: Date
  vesselPosition: {
    latitude: number
    longitude: number
  } | null
}

export default function VesselsPage() {
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [alerts, setAlerts] = useState<VesselAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [alertStats, setAlertStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    moderate: 0
  })
  
  useEffect(() => {
    fetchVessels()
    fetchAlerts()
    const interval = setInterval(() => {
      fetchVessels()
      fetchAlerts()
    }, 30000)
    return () => clearInterval(interval)
  }, [])
  
  const fetchVessels = async () => {
    try {
      // Only fetch recent vessels (last hour) and limit to 1000 for performance
      const response = await fetch('/api/vessels?active=true&withPosition=true&limit=1000', {
        cache: 'no-store'
      })
      const data = await response.json()
      if (data.success) {
        setVessels(data.vessels)
      }
    } catch (error) {
      console.error('Failed to fetch vessels:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/vessels/alerts?active=true', {
        cache: 'no-store'
      })
      const data = await response.json()
      if (data.success) {
        setAlerts(data.alerts)
        setAlertStats({
          total: data.stats.total,
          critical: data.stats.bySeverity.critical,
          high: data.stats.bySeverity.high,
          moderate: data.stats.bySeverity.moderate
        })
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    }
  }
  
  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200'
    }
    return colors[severity] || 'bg-slate-100 text-slate-800 border-slate-200'
  }
  
  return (
    <AppLayout 
      title="Vessel Tracking"
      breadcrumbs={[{ label: 'Vessels' }]}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Ship className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-blue-900/70 mb-1">Tracked Vessels</h3>
            <p className="text-3xl font-bold text-blue-900">{vessels.length}</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border border-red-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-red-900/70 mb-1">Critical Alerts</h3>
            <p className="text-3xl font-bold text-red-900">{alertStats.critical}</p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-orange-900/70 mb-1">High Risk</h3>
            <p className="text-3xl font-bold text-orange-900">{alertStats.high}</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-green-900/70 mb-1">Active</h3>
            <p className="text-3xl font-bold text-green-900">
              {vessels.filter(v => v.lastSeen && Date.now() - new Date(v.lastSeen).getTime() < 3600000).length}
            </p>
            <p className="text-xs text-green-700 mt-1">Last hour</p>
          </div>
        </div>
        
        {/* Map */}
        <WidgetCard
          title="Vessel Positions"
          icon={MapPin}
          iconColor="blue"
          subtitle={`${vessels.length} vessels tracked`}
          noPadding
        >
          <div style={{ height: '500px', width: '100%' }}>
            {!loading && <VesselMap vessels={vessels} alerts={alerts} />}
            {loading && (
              <div className="h-full flex items-center justify-center">
                <div className="text-slate-600">Loading map...</div>
              </div>
            )}
          </div>
        </WidgetCard>
        
        {/* Alerts Table */}
        <WidgetCard
          title="Active Vessel Alerts"
          icon={AlertTriangle}
          iconColor="orange"
          subtitle={`${alerts.length} active alerts`}
        >
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              No active vessel alerts
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Vessel
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Distance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Recommendation
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Ship className="h-4 w-4 text-slate-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {alert.vessel.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              MMSI: {alert.vessel.mmsi}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                        {alert.type}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                        {alert.distance ? `${alert.distance.toFixed(0)} km` : 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 max-w-md">
                        <div className="truncate">{alert.recommendation}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(alert.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </WidgetCard>
      </div>
    </AppLayout>
  )
}
