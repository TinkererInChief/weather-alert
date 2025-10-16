'use client'

import { useState, useEffect } from 'react'
import { Activity, CheckCircle, XCircle, AlertTriangle, Shield } from 'lucide-react'
import RangeSwitcher from '@/components/status/RangeSwitcher'
import AggregatedStatusTimeline from '@/components/status/AggregatedStatusTimeline'
import HeroMetrics from '@/components/status/HeroMetrics'

type TimelinePoint = {
  time: number
  worstStatus: 'healthy' | 'warning' | 'critical'
  count: number
}
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
  const [uptimeTimeline, setUptimeTimeline] = useState<Partial<Record<'database' | 'redis' | 'sms' | 'email' | 'whatsapp' | 'voice' | 'usgs' | 'noaa' | 'emsc' | 'jma' | 'ptwc' | 'iris', TimelinePoint[]>>>({})
  const [heroMetrics, setHeroMetrics] = useState<HeroMetricsData | null>(null)

  const formatLatency = (ms: unknown) =>
    typeof ms === 'number' ? `${Math.max(0, Math.round(ms))}ms` : '-'

  useEffect(() => {
    fetchSystemStatus()
    // Silent refresh every 30 seconds (no loading state)
    const interval = setInterval(() => fetchSystemStatus(true), 30000)
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
        const hist: any = await histRes.json()
        const up: any = await upRes.json()
        if (!active) return
        
        console.log('Uptime API response:', up)
        console.log('Timeline data:', up?.timeline)
        
        if (up?.timeline) {
          const tl = (key: keyof typeof uptimeTimeline) => (up.timeline[key] as TimelinePoint[] | undefined) || []
          const newTimeline = {
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
          }
          console.log('Setting uptime timeline:', newTimeline)
          setUptimeTimeline(newTimeline)
        } else {
          console.warn('No timeline data in uptime response')
        }
      } catch (e) {
        console.error('Failed to load history/uptime', e)
      }
    }
    load()
    // Silent refresh every 30 seconds
    const id = setInterval(load, 30000)
    return () => { active = false; clearInterval(id) }
  }, [range])

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

  const fetchSystemStatus = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const healthUrl = silent ? '/api/health?detailed=true&record=true' : '/api/health?detailed=true'
      const [healthRes, statsRes] = await Promise.all([
        fetch(healthUrl, { cache: 'no-store' }),
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
      if (!silent) setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />
      default: return <Activity className="h-5 w-5 text-gray-400" />
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
              onClick={() => fetchSystemStatus(false)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Refresh Status
            </button>
          </div>
        </div>

        {/* Aggregated System Health Timeline */}
        <div className="card">
          <div className="flex items-center justify-end mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Range: {range}</span>
              <RangeSwitcher value={range} onChange={setRange} />
            </div>
          </div>
          <AggregatedStatusTimeline servicesData={uptimeTimeline} />
        </div>
        </div>
      </main>
    </div>
  )
}
