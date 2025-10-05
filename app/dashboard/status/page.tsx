'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { Activity, CheckCircle, AlertTriangle, XCircle, Database, Wifi, MessageSquare, Mail, Globe, MessageCircle, Phone } from 'lucide-react'
import LatencyChart from '@/components/status/LatencyChart'
import StatusTimeline, { TimelinePoint } from '@/components/status/StatusTimeline'
import RangeSwitcher from '@/components/status/RangeSwitcher'
import HeroMetrics from '@/components/status/HeroMetrics'
import IncidentTimeline from '@/components/status/IncidentTimeline'
import TrendIndicator from '@/components/status/TrendIndicator'
import ServiceDependencyMap from '@/components/status/ServiceDependencyMap'
import MaintenanceScheduler from '@/components/status/MaintenanceScheduler'

export const dynamic = 'force-dynamic'

// Types for strict mode
type OverallStatus = 'healthy' | 'warning' | 'critical' | 'degraded' | 'error' | 'unknown'

type ServiceKey = 'database' | 'redis' | 'sms' | 'email' | 'usgs' | 'noaa' | 'emsc' | 'jma' | 'ptwc' | 'iris' | 'whatsapp' | 'voice'

type ServiceStatus = {
  status: OverallStatus
  responseTime?: number
  lastCheck?: string | number
  error?: string
}

type SystemEvent = {
  id: string
  service?: string
  eventType: string
  severity: string
  message: string
  oldStatus?: string
  newStatus?: string
  metadata?: any
  createdAt: string
}

type SystemStatus = {
  status: OverallStatus
  uptime?: number
  services?: Partial<Record<ServiceKey, ServiceStatus>>
}

type RangeKey = '60m' | '24h' | '7d'

type HistoryPoint = {
  time: number
  latency?: number
  latencyP50?: number
  latencyP95?: number
  latencyP99?: number
}

type HeroMetrics = {
  uptimePercent: number
  mttrMinutes: number
  incidentsResolved: number
  avgResponseTimeMs: number
}

export default function SystemStatusPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [latencyHistory, setLatencyHistory] = useState<Partial<Record<ServiceKey, HistoryPoint[]>>>({})
  const [range, setRange] = useState<RangeKey>('24h')
  const [uptimeTimeline, setUptimeTimeline] = useState<Partial<Record<ServiceKey, TimelinePoint[]>>>({})
  const [events, setEvents] = useState<SystemEvent[]>([])
  const [heroMetrics, setHeroMetrics] = useState<HeroMetrics | null>(null)

  useEffect(() => {
    // Fetch system status
    const fetchStatus = async () => {
      try {
        let response = await fetch('/api/health?detailed=true&record=true', { cache: 'no-store' })
        let raw: any = await response.json()
        // Fallback: if the API returned only basic health (no checks), re-fetch with cache-busting param
        if (!raw?.checks) {
          response = await fetch(`/api/health?detailed=true&record=true&_=${Date.now()}` as string, { cache: 'no-store' })
          raw = await response.json()
        }

        const coerce = (s: unknown): OverallStatus => {
          const raw = String(s ?? 'unknown')
          if (raw === 'unhealthy') return 'critical'
          if (raw === 'ok') return 'healthy'
          const v = raw as OverallStatus
          return (['healthy','warning','critical','degraded','error','unknown'] as const).includes(v) ? v : 'unknown'
        }

        const normalize = (s: unknown): OverallStatus => {
          const v = coerce(s)
          return v === 'unknown' ? 'warning' : v
        }

        const checks = raw?.checks ?? {}
        const services = checks?.services ?? {}
        const now = Date.now()

        const usgsStatus = coerce(services?.usgs?.status)
        const noaaStatus = coerce(services?.noaa?.status)
        const emscStatus = coerce(services?.emsc?.status)
        const jmaStatus = coerce(services?.jma?.status)
        const ptwcStatus = coerce(services?.ptwc?.status)
        const irisStatus = coerce(services?.iris?.status)

        const mapped: SystemStatus = {
          status: coerce(raw?.status),
          uptime: (checks?.system?.uptime as number | undefined) ?? raw?.uptime,
          services: {
            database: {
              status: normalize(checks?.database?.status),
              responseTime: typeof checks?.database?.latencyMs === 'number' ? checks.database.latencyMs : undefined,
              lastCheck: now,
              error: checks?.database?.error
            },
            redis: {
              status: normalize(checks?.redis?.status),
              responseTime: typeof checks?.redis?.latencyMs === 'number' ? checks.redis.latencyMs : undefined,
              lastCheck: now,
              error: checks?.redis?.error
            },
            sms: {
              status: normalize(services?.twilio?.status),
              responseTime: typeof services?.twilio?.latencyMs === 'number' ? services.twilio.latencyMs : undefined,
              lastCheck: now,
              error: services?.twilio?.error
            },
            email: {
              status: normalize(services?.sendgrid?.status),
              responseTime: typeof services?.sendgrid?.latencyMs === 'number' ? services.sendgrid.latencyMs : undefined,
              lastCheck: now,
              error: services?.sendgrid?.error
            },
            usgs: {
              status: normalize(usgsStatus),
              responseTime: typeof services?.usgs?.latencyMs === 'number' ? services.usgs.latencyMs : undefined,
              lastCheck: now,
              error: services?.usgs?.error
            },
            noaa: {
              status: normalize(noaaStatus),
              responseTime: typeof services?.noaa?.latencyMs === 'number' ? services.noaa.latencyMs : undefined,
              lastCheck: now,
              error: services?.noaa?.error
            },
            emsc: {
              status: normalize(emscStatus),
              responseTime: typeof services?.emsc?.latencyMs === 'number' ? services.emsc.latencyMs : undefined,
              lastCheck: now,
              error: services?.emsc?.error
            },
            jma: {
              status: normalize(jmaStatus),
              responseTime: typeof services?.jma?.latencyMs === 'number' ? services.jma.latencyMs : undefined,
              lastCheck: now,
              error: services?.jma?.error
            },
            ptwc: {
              status: normalize(ptwcStatus),
              responseTime: typeof services?.ptwc?.latencyMs === 'number' ? services.ptwc.latencyMs : undefined,
              lastCheck: now,
              error: services?.ptwc?.error
            },
            iris: {
              status: normalize(irisStatus),
              responseTime: typeof services?.iris?.latencyMs === 'number' ? services.iris.latencyMs : undefined,
              lastCheck: now,
              error: services?.iris?.error
            },
            whatsapp: {
              status: normalize(services?.twilio?.status),
              responseTime: typeof services?.twilio?.latencyMs === 'number' ? services.twilio.latencyMs : undefined,
              lastCheck: now,
              error: services?.twilio?.error
            },
            voice: {
              status: normalize(services?.twilio?.status),
              responseTime: typeof services?.twilio?.latencyMs === 'number' ? services.twilio.latencyMs : undefined,
              lastCheck: now,
              error: services?.twilio?.error
            }
          }
        }

        setSystemStatus(mapped)

        // We now rely on server time-series; status fetch above triggers snapshot persistence
      } catch (error) {
        console.error('Failed to fetch system status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch history + uptime for selected range
  useEffect(() => {
    let active = true
    const servicesParam = 'database,redis,sms,email,whatsapp,voice,usgs,noaa,emsc,jma,ptwc,iris'
    const load = async () => {
      try {
        const [histRes, upRes] = await Promise.all([
          fetch(`/api/health/history?range=${range}&services=${servicesParam}`, { cache: 'no-store' }),
          fetch(`/api/health/uptime?range=${range}&services=${servicesParam}`, { cache: 'no-store' }),
        ])
        const json: any = await histRes.json()
        const up: any = await upRes.json()
        if (!active) return
        if (!json?.series) return
        const mapSeries = (key: ServiceKey) => {
          const arr = (json.series[key] as Array<{ time: number; latencyAvg?: number; latencyP50?: number; latencyP95?: number; latencyP99?: number }> | undefined) || []
          return arr.map(p => ({ 
            time: Number(p.time), 
            latency: typeof p.latencyAvg === 'number' ? p.latencyAvg : undefined,
            latencyP50: typeof p.latencyP50 === 'number' ? p.latencyP50 : undefined,
            latencyP95: typeof p.latencyP95 === 'number' ? p.latencyP95 : undefined,
            latencyP99: typeof p.latencyP99 === 'number' ? p.latencyP99 : undefined
          }))
        }
        setLatencyHistory({
          database: mapSeries('database'),
          redis: mapSeries('redis'),
          sms: mapSeries('sms'),
          email: mapSeries('email'),
          whatsapp: mapSeries('whatsapp'),
          voice: mapSeries('voice'),
          usgs: mapSeries('usgs'),
          noaa: mapSeries('noaa'),
          emsc: mapSeries('emsc'),
          jma: mapSeries('jma'),
          ptwc: mapSeries('ptwc'),
          iris: mapSeries('iris'),
        })

        if (up?.timeline) {
          const tl = (key: ServiceKey) => (up.timeline[key] as TimelinePoint[] | undefined) || []
          setUptimeTimeline({
            database: tl('database'),
            redis: tl('redis'),
            sms: tl('sms'),
            email: tl('email'),
            whatsapp: tl('whatsapp'),
            voice: tl('voice'),
            usgs: tl('usgs'),
            noaa: tl('noaa'),
            emsc: tl('emsc'),
            jma: tl('jma'),
            ptwc: tl('ptwc'),
            iris: tl('iris'),
          })
        }
      } catch (e) {
        console.error('Failed to load health history', e)
      }
    }

    load()
    const id = setInterval(load, 30000)
    return () => { active = false; clearInterval(id) }
  }, [range])

  // Fetch recent events
  useEffect(() => {
    let active = true
    const loadEvents = async () => {
      try {
        const res = await fetch('/api/health/events?limit=10', { cache: 'no-store' })
        const data = await res.json()
        if (active && data?.events) {
          setEvents(data.events)
        }
      } catch (e) {
        console.error('Failed to load health events', e)
      }
    }

    loadEvents()
    const id = setInterval(loadEvents, 30000)
    return () => { active = false; clearInterval(id) }
  }, [])

  // Fetch hero metrics
  useEffect(() => {
    let active = true
    const loadMetrics = async () => {
      try {
        const res = await fetch('/api/health/metrics?period=30d', { cache: 'no-store' })
        const data = await res.json()
        if (active && data) {
          setHeroMetrics(data)
        }
      } catch (e) {
        console.error('Failed to load hero metrics', e)
      }
    }

    loadMetrics()
    const id = setInterval(loadMetrics, 60000) // Update every minute
    return () => { active = false; clearInterval(id) }
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'critical':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Activity className="h-5 w-5 text-slate-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical':
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  const services: Array<{ name: string; icon: any; key: ServiceKey }> = [
    { name: 'Database', icon: Database, key: 'database' },
    { name: 'Redis Cache', icon: Activity, key: 'redis' },
    { name: 'SMS Service', icon: MessageSquare, key: 'sms' },
    { name: 'WhatsApp', icon: MessageCircle, key: 'whatsapp' },
    { name: 'Voice', icon: Phone, key: 'voice' },
    { name: 'Email Service', icon: Mail, key: 'email' },
    { name: 'USGS API', icon: Globe, key: 'usgs' },
    { name: 'NOAA Tsunami', icon: Wifi, key: 'noaa' },
    { name: 'EMSC', icon: Globe, key: 'emsc' },
    { name: 'JMA', icon: Globe, key: 'jma' },
    { name: 'PTWC', icon: Wifi, key: 'ptwc' },
    { name: 'IRIS', icon: Globe, key: 'iris' }
  ]

  return (
    <AuthGuard>
      <AppLayout 
        title="System Status"
        breadcrumbs={[
          { label: 'System Status' }
        ]}
      >
        <div className="space-y-6">
          {/* Hero Metrics */}
          {heroMetrics && (
            <HeroMetrics
              uptimePercent={heroMetrics.uptimePercent}
              mttrMinutes={heroMetrics.mttrMinutes}
              incidentsResolved={heroMetrics.incidentsResolved}
              avgResponseTimeMs={heroMetrics.avgResponseTimeMs}
            />
          )}

          {/* Overall Status */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Overall System Status</h3>
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" role="status" aria-label="Loading"></div>
              ) : (
                <div className="flex items-center space-x-2">
                  {getStatusIcon(systemStatus?.status || 'unknown')}
                  <span className={`px-3 py-1 text-sm font-medium rounded-full border ${
                    getStatusColor(systemStatus?.status || 'unknown')
                  }`}>
                    {systemStatus?.status === 'healthy' ? 'All Systems Operational' :
                     systemStatus?.status === 'warning' ? 'Some Services Degraded' :
                     systemStatus?.status === 'critical' ? 'System Issues Detected' :
                     'Status Unknown'}
                  </span>
                </div>
              )}
            </div>
            
            {systemStatus?.uptime && (
              <div className="text-sm text-slate-600">
                System uptime: {Math.floor(systemStatus.uptime / 86400)} days, {Math.floor((systemStatus.uptime % 86400) / 3600)} hours
              </div>
            )}
          </div>

          {/* Service Dependency Map */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Service Dependencies</h3>
              <p className="text-sm text-slate-500 mt-1">Visual topology showing service relationships and impact</p>
            </div>
            <div className="p-6">
              <ServiceDependencyMap services={systemStatus?.services || {}} />
            </div>
          </div>

          {/* Service Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              const Icon = service.icon
              const serviceStatus = systemStatus?.services?.[service.key] as ServiceStatus | undefined
              const history = latencyHistory[service.key] || []
              
              // Calculate trend based on recent history
              const getTrend = () => {
                if (history.length < 2) return 'stable'
                const recent = history.slice(-5).filter(p => p.latency !== undefined)
                if (recent.length < 2) return 'stable'
                const avg1 = recent.slice(0, Math.floor(recent.length / 2)).reduce((sum, p) => sum + (p.latency || 0), 0) / Math.floor(recent.length / 2)
                const avg2 = recent.slice(Math.floor(recent.length / 2)).reduce((sum, p) => sum + (p.latency || 0), 0) / Math.ceil(recent.length / 2)
                const diff = ((avg2 - avg1) / avg1) * 100
                if (diff > 10) return 'down' // Latency increasing is bad
                if (diff < -10) return 'up' // Latency decreasing is good
                return 'stable'
              }
              
              return (
                <div 
                  key={service.key} 
                  className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  role="article"
                  aria-label={`${service.name} status`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <Icon className="h-5 w-5 text-slate-600" />
                      </div>
                      <h4 className="font-semibold text-slate-900">{service.name}</h4>
                    </div>
                    {getStatusIcon(serviceStatus?.status || 'unknown')}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`px-2 py-1 text-xs font-medium rounded border ${
                        getStatusColor(serviceStatus?.status || 'unknown')
                      }`}>
                        {serviceStatus?.status === 'healthy' ? 'Operational' :
                         (serviceStatus?.status === 'warning' || serviceStatus?.status === 'degraded') ? 'Degraded' :
                         (serviceStatus?.status === 'critical' || serviceStatus?.status === 'error') ? 'Down' :
                         'Unknown'}
                      </div>
                      {history.length > 0 && serviceStatus?.status === 'healthy' && (
                        <TrendIndicator trend={getTrend()} />
                      )}
                    </div>
                    
                    {serviceStatus?.responseTime && (
                      <div className="text-sm text-slate-700 font-medium">
                        {serviceStatus.responseTime}ms
                        <span className="text-xs text-slate-500 ml-1">response time</span>
                      </div>
                    )}
                    
                    {serviceStatus?.lastCheck && (
                      <div className="text-xs text-slate-500">
                        Checked {new Date(serviceStatus.lastCheck).toLocaleTimeString()}
                      </div>
                    )}
                    
                    {serviceStatus?.error && (
                      <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-100">
                        {serviceStatus.error}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Service Latency (Selected Range) */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Service Latency</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Auto-refresh every 30s</span>
                <RangeSwitcher value={range} onChange={setRange} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {([
                { key: 'database', name: 'Database', color: '#3b82f6' },
                { key: 'redis', name: 'Redis', color: '#06b6d4' },
                { key: 'sms', name: 'SMS', color: '#10b981' },
                { key: 'email', name: 'Email', color: '#8b5cf6' },
                { key: 'whatsapp', name: 'WhatsApp', color: '#22c55e' },
                { key: 'voice', name: 'Voice', color: '#f59e0b' },
                { key: 'usgs', name: 'USGS API', color: '#64748b' },
                { key: 'noaa', name: 'NOAA Tsunami', color: '#ef4444' },
                { key: 'emsc', name: 'EMSC', color: '#06b6d4' },
                { key: 'jma', name: 'JMA', color: '#ec4899' },
                { key: 'ptwc', name: 'PTWC', color: '#14b8a6' },
                { key: 'iris', name: 'IRIS', color: '#a855f7' },
              ] as Array<{ key: ServiceKey; name: string; color: string }> )
                .filter(cfg => (latencyHistory[cfg.key]?.length ?? 0) > 0)
                .map(cfg => (
                  <LatencyChart key={cfg.key} title={cfg.name} points={latencyHistory[cfg.key] as HistoryPoint[]} color={cfg.color} />
                ))}
            </div>
          </div>

          {/* Service Uptime Timeline */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Service Uptime Timeline</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Auto-refresh every 30s</span>
                <RangeSwitcher value={range} onChange={setRange} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {([
                { key: 'database', name: 'Database' },
                { key: 'redis', name: 'Redis' },
                { key: 'sms', name: 'SMS' },
                { key: 'email', name: 'Email' },
                { key: 'whatsapp', name: 'WhatsApp' },
                { key: 'voice', name: 'Voice' },
                { key: 'usgs', name: 'USGS API' },
                { key: 'noaa', name: 'NOAA Tsunami' },
                { key: 'emsc', name: 'EMSC' },
                { key: 'jma', name: 'JMA' },
                { key: 'ptwc', name: 'PTWC' },
                { key: 'iris', name: 'IRIS' },
              ] as Array<{ key: ServiceKey; name: string }> )
                .filter(cfg => (uptimeTimeline[cfg.key]?.length ?? 0) > 0)
                .map(cfg => (
                  <StatusTimeline key={cfg.key} title={cfg.name} points={uptimeTimeline[cfg.key] as TimelinePoint[]} />
                ))}
            </div>
          </div>

          {/* Recent System Events & Maintenance Windows - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Incidents */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
              <div className="p-6 border-b border-slate-200 flex-shrink-0">
                <h3 className="text-lg font-semibold text-slate-900">Recent System Events</h3>
                <p className="text-sm text-slate-500 mt-1">Real-time status changes and incidents</p>
              </div>
              
              <div className="p-6 overflow-y-auto" style={{ maxHeight: '400px' }}>
                <IncidentTimeline events={events} />
              </div>
            </div>

            {/* Maintenance Scheduler */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
              <div className="p-6 overflow-y-auto" style={{ maxHeight: '480px' }}>
                <MaintenanceScheduler />
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  )
}
