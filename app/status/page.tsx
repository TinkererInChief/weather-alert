'use client'

import { useState, useEffect } from 'react'
import { Activity, CheckCircle, XCircle, AlertTriangle, Clock, Wifi, Database, Globe, Phone, Mail, MessageSquare, MessageCircle, Shield } from 'lucide-react'
import RangeSwitcher from '@/components/status/RangeSwitcher'
import LatencyChart from '@/components/status/LatencyChart'
import StatusTimeline, { TimelinePoint } from '@/components/status/StatusTimeline'
import HeroMetrics from '@/components/status/HeroMetrics'
import IncidentTimeline from '@/components/status/IncidentTimeline'
import TrendIndicator from '@/components/status/TrendIndicator'
import Link from 'next/link'
import WorkInProgressBanner from '@/components/common/WorkInProgressBanner'
import { formatTime } from '@/lib/date-utils'

type Tile = { status: 'healthy' | 'warning' | 'critical'; latency: string; message: string; code?: number; error?: string }

type HistoryPoint = {
  time: number
  latency?: number
  latencyP50?: number
  latencyP95?: number
  latencyP99?: number
}

type SystemEvent = {
  id: string
  service?: string
  eventType: string
  severity: string
  message: string
  createdAt: string
}

type HeroMetricsData = {
  uptimePercent: number
  mttrMinutes: number
  incidentsResolved: number
  avgResponseTimeMs: number
}

interface SystemStatus {
  overall: 'healthy' | 'warning' | 'critical'
  uptime: string
  lastCheck: string
  services: {
    database: Tile
    redis: Tile
    usgs: Tile
    noaa: Tile
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
  const [range, setRange] = useState<'60m' | '24h' | '7d'>('60m')
  const [latencyHistory, setLatencyHistory] = useState<Partial<Record<'database' | 'redis' | 'sms' | 'email' | 'whatsapp' | 'voice' | 'usgs' | 'noaa', HistoryPoint[]>>>({})
  const [uptimeTimeline, setUptimeTimeline] = useState<Partial<Record<'database' | 'redis' | 'sms' | 'email' | 'whatsapp' | 'voice' | 'usgs' | 'noaa', TimelinePoint[]>>>({})
  const [events, setEvents] = useState<SystemEvent[]>([])
  const [heroMetrics, setHeroMetrics] = useState<HeroMetricsData | null>(null)

  const formatLatency = (ms: unknown) =>
    typeof ms === 'number' ? `${Math.max(0, Math.round(ms))}ms` : '-'

  useEffect(() => {
    fetchSystemStatus()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch history + uptime for selected range
  useEffect(() => {
    let active = true
    const servicesParam = 'database,redis,sms,email,whatsapp,voice,usgs,noaa'
    const load = async () => {
      try {
        const [histRes, upRes] = await Promise.all([
          fetch(`/api/health/history?range=${range}&services=${servicesParam}`, { cache: 'no-store' }),
          fetch(`/api/health/uptime?range=${range}&services=${servicesParam}`, { cache: 'no-store' }),
        ])
        const hist: any = await histRes.json()
        const up: any = await upRes.json()
        if (!active) return
        if (hist?.series) {
          const mapSeries = (key: keyof typeof latencyHistory) => {
            const arr = (hist.series[key] as Array<{ time: number; latencyAvg?: number; latencyP50?: number; latencyP95?: number; latencyP99?: number }> | undefined) || []
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
          })
        }
        if (up?.timeline) {
          const tl = (key: keyof typeof uptimeTimeline) => (up.timeline[key] as TimelinePoint[] | undefined) || []
          setUptimeTimeline({
            database: tl('database'),
            redis: tl('redis'),
            sms: tl('sms'),
            email: tl('email'),
            whatsapp: tl('whatsapp'),
            voice: tl('voice'),
            usgs: tl('usgs'),
            noaa: tl('noaa'),
          })
        }
      } catch (e) {
        console.error('Failed to load history/uptime', e)
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
    const id = setInterval(loadMetrics, 60000)
    return () => { active = false; clearInterval(id) }
  }, [])

  const fetchSystemStatus = async () => {
    try {
      setLoading(true)
      const [healthRes, statsRes] = await Promise.all([
        fetch('/api/health?detailed=true', { cache: 'no-store' }),
        fetch('/api/stats', { cache: 'no-store' })
      ])

      const health = await healthRes.json()
      // Stash build short sha on window for badge access
      if (typeof window !== 'undefined') {
        ;(window as any).__healthBuildShort = health?.build?.short || null
      }
      const statsJson = await statsRes.json()

      const overall: SystemStatus['overall'] =
        health.status === 'healthy'
          ? 'healthy'
          : (health.status === 'degraded' || health.status === 'warning' || health.status === 'unknown')
          ? 'warning'
          : 'critical'

      const dbStatus = health.checks?.database?.status || 'warning'
      const services = health.checks?.services || {}
      const redis = health.checks?.redis || {}

      const mapStatus = (s: string | undefined): 'healthy' | 'warning' | 'critical' => {
        if (s === 'healthy') return 'healthy'
        if (s === 'warning' || s === 'degraded' || s === 'unknown') return 'warning'
        return 'critical'
      }
      const usgs = services.usgs || {}
      const noaa = services.noaa || {}

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
            status: mapStatus(usgs?.status),
            latency: formatLatency(usgs?.latencyMs),
            message: usgs?.message || 'USGS API',
            code: usgs?.statusCode,
            error: usgs?.error
          },
          noaa: {
            status: mapStatus(noaa?.status),
            latency: formatLatency(noaa?.latencyMs),
            message: noaa?.message || 'NOAA Tsunami',
            code: noaa?.statusCode,
            error: noaa?.error
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
      <div className="min-h-screen bg-white">
        <WorkInProgressBanner />
        <header className="bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold">Emergency Alert</h3>
                  <p className="text-xs text-slate-300">Command Center</p>
                </div>
              </Link>
              <Link href="/" className="text-slate-300 hover:text-white transition-colors">
                ← Back to Home
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
            <div className="h-64 bg-slate-200 rounded-xl"></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <WorkInProgressBanner />
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold">Emergency Alert</h3>
                <p className="text-xs text-slate-300">Command Center</p>
              </div>
            </Link>
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">System Status</h1>
          <p className="text-xl text-slate-600">Real-time status of all emergency alert services</p>
        </div>
        <div className="space-y-8">
        
        {/* Hero Metrics */}
        {heroMetrics && (
          <HeroMetrics
            uptimePercent={heroMetrics.uptimePercent}
            mttrMinutes={heroMetrics.mttrMinutes}
            incidentsResolved={heroMetrics.incidentsResolved}
            avgResponseTimeMs={heroMetrics.avgResponseTimeMs}
          />
        )}

        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(status?.overall || 'healthy')}
            <div>
              <h2 className="text-xl font-semibold text-slate-900">System Operational</h2>
              <p className="text-sm text-slate-600">
                Last updated: {formatTime(lastUpdate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Build badge */}
            <span className="text-xs text-slate-500 border border-slate-200 rounded-md px-2 py-1" title="Build commit">
              Build: {(() => {
                const v = (typeof window !== 'undefined' ? (window as any).__healthBuildShort : undefined) || '-'
                return v || '-'
              })()}
            </span>
            <button
              onClick={fetchSystemStatus}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Refresh Status
            </button>
          </div>
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

        {/* Service Latency (Selected Range) */}
        <div className="card">
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
            ] as Array<{ key: keyof typeof latencyHistory; name: string; color: string }> )
              .filter(cfg => (latencyHistory[cfg.key]?.length ?? 0) > 0)
              .map(cfg => (
                <LatencyChart key={cfg.key as string} title={cfg.name} points={latencyHistory[cfg.key] as HistoryPoint[]} color={cfg.color} />
              ))}
          </div>
        </div>

        {/* Service Uptime Timeline */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Service Uptime Timeline</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Range: {range}</span>
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
            ] as Array<{ key: keyof typeof uptimeTimeline; name: string }> )
              .filter(cfg => (uptimeTimeline[cfg.key]?.length ?? 0) > 0)
              .map(cfg => (
                <StatusTimeline key={cfg.key as string} title={cfg.name} points={uptimeTimeline[cfg.key] as TimelinePoint[]} />
              ))}
          </div>
        </div>

        {/* Recent System Events */}
        <div className="card">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Recent System Events</h3>
            <p className="text-sm text-slate-500 mt-1">Real-time status changes and incidents</p>
          </div>
          <IncidentTimeline events={events} />
        </div>
        </div>
      </main>
    </div>
  )
}
