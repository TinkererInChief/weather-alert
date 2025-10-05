'use client'

import { useEffect, useState } from 'react'
import { Clock, AlertTriangle, Waves, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

type MonitoringService = {
  id: string
  name: string
  icon: any
  lastCheck?: Date
  nextCheck?: Date
  status: 'active' | 'inactive' | 'error'
  interval: number // in ms
}

export default function LastCheckWidget() {
  const [services, setServices] = useState<MonitoringService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const fetchMonitoringStatus = async () => {
      try {
        setLoading(true)
        
        // Fetch earthquake monitoring status
        const monitoringResponse = await fetch('/api/monitoring', { cache: 'no-store' })
        const monitoringData = await monitoringResponse.json()
        
        // Fetch tsunami monitoring status
        const tsunamiResponse = await fetch('/api/tsunami/monitor', { cache: 'no-store' })
        const tsunamiData = await tsunamiResponse.json()

        const serviceList: MonitoringService[] = [
          {
            id: 'earthquake',
            name: 'Earthquake Monitoring',
            icon: AlertTriangle,
            lastCheck: monitoringData.lastCheck ? new Date(monitoringData.lastCheck) : undefined,
            nextCheck: monitoringData.nextCheck ? new Date(monitoringData.nextCheck) : undefined,
            status: monitoringData.isMonitoring ? 'active' : 'inactive',
            interval: monitoringData.interval || 60000 // Default 1 minute
          },
          {
            id: 'tsunami',
            name: 'Tsunami Monitoring',
            icon: Waves,
            lastCheck: tsunamiData.data?.lastChecked ? new Date(tsunamiData.data.lastChecked) : undefined,
            nextCheck: tsunamiData.data?.nextCheck ? new Date(tsunamiData.data.nextCheck) : undefined,
            status: tsunamiData.data?.isMonitoring ? 'active' : 'inactive',
            interval: tsunamiData.data?.interval || 300000 // Default 5 minutes
          }
        ]

        setServices(serviceList)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch monitoring status')
      } finally {
        setLoading(false)
      }
    }

    fetchMonitoringStatus()
    // Refresh every 10 seconds
    const interval = setInterval(fetchMonitoringStatus, 10 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Update "now" every second for countdown timers
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTimeSince = (date?: Date) => {
    if (!date) return 'Never'
    
    const seconds = Math.floor((now - date.getTime()) / 1000)
    
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const formatTimeUntil = (date?: Date) => {
    if (!date) return 'Unknown'
    
    const seconds = Math.floor((date.getTime() - now) / 1000)
    
    if (seconds < 0) return 'Due now'
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            <span>Active</span>
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
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
            <XCircle className="h-3 w-3" />
            <span>Inactive</span>
          </div>
        )
    }
  }

  const getProgressPercentage = (service: MonitoringService) => {
    if (!service.lastCheck || !service.nextCheck || service.status !== 'active') return 0
    
    const total = service.nextCheck.getTime() - service.lastCheck.getTime()
    const elapsed = now - service.lastCheck.getTime()
    
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-32 mb-4"></div>
          <div className="space-y-4">
            <div className="h-24 bg-slate-200 rounded"></div>
            <div className="h-24 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <Clock className="h-5 w-5" />
          <h3 className="font-semibold">Monitoring Status</h3>
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  const activeServices = services.filter(s => s.status === 'active').length

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Monitoring Status</h3>
        </div>
        <div className="text-xs font-medium text-slate-600">
          {activeServices}/{services.length} Active
        </div>
      </div>

      <div className="space-y-4">
        {services.map((service) => {
          const Icon = service.icon
          const progress = getProgressPercentage(service)
          
          return (
            <div key={service.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    service.status === 'active' ? 'bg-green-100 text-green-600' :
                    service.status === 'error' ? 'bg-red-100 text-red-600' :
                    'bg-slate-200 text-slate-500'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-slate-900">
                      {service.name}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Last: {formatTimeSince(service.lastCheck)}</span>
                      </div>
                      {service.status === 'active' && service.nextCheck && (
                        <div className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          <span>Next: {formatTimeUntil(service.nextCheck)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {getStatusBadge(service.status)}
              </div>

              {service.status === 'active' && service.nextCheck && (
                <div className="space-y-1">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Checking every {Math.floor(service.interval / 1000)}s</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {services.some(s => s.status === 'inactive') && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            ⚠️ Some monitoring services are inactive. Start them from the admin controls to receive alerts.
          </p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500 text-center">
          Real-time monitoring status • Updates every 10 seconds
        </div>
      </div>
    </div>
  )
}
