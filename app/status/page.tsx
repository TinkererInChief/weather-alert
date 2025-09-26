'use client'

import { useState, useEffect } from 'react'
import { Activity, CheckCircle, XCircle, AlertTriangle, Clock, Wifi, Database, Globe, Phone, Mail, MessageSquare, MessageCircle } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'

type Tile = { status: 'healthy' | 'warning' | 'critical'; latency: string; message: string; code?: number; error?: string }

interface SystemStatus {
  overall: 'healthy' | 'warning' | 'critical'
  uptime: string
  lastCheck: string
  services: {
    database: Tile
    redis: Tile
    usgs: Tile
    sms: Tile
    email: Tile
    whatsapp: Tile
    voice: Tile
  }
  stats: {
    totalAlerts: number
    successRate: string
    avgResponseTime: string
    activeContacts: number
  }
}

export default function SystemStatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const formatLatency = (ms: unknown) =>
    typeof ms === 'number' ? `${Math.max(0, Math.round(ms))}ms` : '-'

  useEffect(() => {
    fetchSystemStatus()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchSystemStatus = async () => {
    try {
      setLoading(true)
      const [healthRes, statsRes] = await Promise.all([
        fetch('/api/health?detailed=true', { cache: 'no-store' }),
        fetch('/api/stats', { cache: 'no-store' })
      ])

      const health = await healthRes.json()
      const statsJson = await statsRes.json()

      const overall: SystemStatus['overall'] = health.status === 'healthy' ? 'healthy' : health.status === 'degraded' ? 'warning' : 'critical'

      const dbStatus = health.checks?.database?.status || 'warning'
      const services = health.checks?.services || {}
      const redis = health.checks?.redis || {}

      const mapStatus = (s: string | undefined): 'healthy' | 'warning' | 'critical' => {
        if (s === 'healthy') return 'healthy'
        if (s === 'warning') return 'warning'
        return 'critical'
      }

      const sysStatus: SystemStatus = {
        overall,
        uptime: `${Math.max(0, Number(health.uptime) || 0)}s`,
        lastCheck: new Date().toISOString(),
        services: {
          database: {
            status: mapStatus(dbStatus),
            latency: formatLatency(health.checks?.database?.latencyMs),
            message: health.checks?.database?.message || 'Database check'
          },
          redis: {
            status: mapStatus(redis?.status),
            latency: formatLatency(redis?.latencyMs),
            message: redis?.message || 'Redis check',
            code: undefined,
            error: redis?.error
          },
          usgs: {
            status: mapStatus(services.usgs?.status),
            latency: formatLatency(services.usgs?.latencyMs),
            message: services.usgs?.message || 'USGS API',
            code: services.usgs?.statusCode,
            error: services.usgs?.error
          },
          sms: {
            status: mapStatus(services.twilio?.status),
            latency: formatLatency(services.twilio?.latencyMs),
            message: services.twilio?.message || 'Twilio SMS service',
            code: services.twilio?.statusCode,
            error: services.twilio?.error
          },
          email: {
            status: mapStatus(services.sendgrid?.status),
            latency: formatLatency(services.sendgrid?.latencyMs),
            message: services.sendgrid?.message || 'SendGrid email service',
            code: services.sendgrid?.statusCode,
            error: services.sendgrid?.error
          },
          whatsapp: {
            status: mapStatus(services.twilio?.status),
            latency: formatLatency(services.twilio?.latencyMs),
            message: 'WhatsApp via Twilio',
            code: services.twilio?.statusCode,
            error: services.twilio?.error
          },
          voice: {
            status: mapStatus(services.twilio?.status),
            latency: formatLatency(services.twilio?.latencyMs),
            message: 'Twilio Voice service',
            code: services.twilio?.statusCode,
            error: services.twilio?.error
          }
        },
        stats: {
          totalAlerts: statsJson?.data?.stats?.totalAlerts ?? 0,
          successRate: typeof statsJson?.data?.stats?.successRate === 'string' ? statsJson.data.stats.successRate + '%' : `${statsJson?.data?.stats?.successRate ?? 0}%`,
          avgResponseTime: `${health.responseTime || 0}ms`,
          activeContacts: statsJson?.data?.stats?.activeContacts ?? 0
        }
      }

      setStatus(sysStatus)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch system status:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />
      default: return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'border-green-200 bg-green-50'
      case 'warning': return 'border-yellow-200 bg-yellow-50'
      case 'critical': return 'border-red-200 bg-red-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'database': return <Database className="h-6 w-6" />
      case 'usgs': return <Globe className="h-6 w-6" />
      case 'sms': return <MessageSquare className="h-6 w-6" />
      case 'email': return <Mail className="h-6 w-6" />
      case 'whatsapp': return <MessageCircle className="h-6 w-6" />
      case 'voice': return <Phone className="h-6 w-6" />
      default: return <Activity className="h-6 w-6" />
    }
  }

  if (loading) {
    return (
      <AppLayout title="System Status">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 loading-shimmer rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 loading-shimmer rounded-xl"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout 
      title="System Status" 
      breadcrumbs={[{ label: 'System Status' }]}
    >
      <div className="space-y-8">
        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(status?.overall || 'healthy')}
            <div>
              <h2 className="text-xl font-semibold text-slate-900">System Operational</h2>
              <p className="text-sm text-slate-600">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={fetchSystemStatus}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Refresh Status
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">System Uptime</p>
                <p className="text-2xl font-bold text-slate-900">{status?.uptime}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{status?.stats.successRate}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Avg Response</p>
                <p className="text-2xl font-bold text-slate-900">{status?.stats.avgResponseTime}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Alerts</p>
                <p className="text-2xl font-bold text-slate-900">{status?.stats.totalAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Service Status */}
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Service Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {status && Object.entries(status.services).map(([service, details]) => (
              <div
                key={service}
                className={`p-4 rounded-xl border-2 ${getStatusColor(details.status)} transition-all duration-200`}
                title={`${details.message}${details.latency ? ` • Latency: ${details.latency}` : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getServiceIcon(service)}
                    <span className="font-medium capitalize text-slate-900">
                      {service === 'usgs' ? 'USGS API' : service}
                    </span>
                  </div>
                  {getStatusIcon(details.status)}
                </div>
                <p className="text-sm text-slate-600 mb-1">{details.message}</p>
                {('code' in details || 'error' in details) && (
                  <p className="text-xs text-slate-500 mb-1">
                    {('code' in details && details.code) ? `HTTP ${details.code}` : ''}
                    {('error' in details && details.error) ? `${('code' in details && details.code) ? ' • ' : ''}${details.error}` : ''}
                  </p>
                )}
                <p className="text-xs text-slate-500">Latency: {details.latency}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Recent System Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">System health check completed</p>
                <p className="text-xs text-slate-500">2 minutes ago</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Activity className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">USGS earthquake data synchronized</p>
                <p className="text-xs text-slate-500">5 minutes ago</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Email service experiencing minor delays</p>
                <p className="text-xs text-slate-500">12 minutes ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
