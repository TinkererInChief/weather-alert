'use client'

import { useEffect, useState, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import WidgetCard from '@/components/dashboard/WidgetCard'
import { Database, Ship, MapPin, Bell, Activity } from 'lucide-react'
import { ResponsiveContainer, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { usePersistedState } from '@/lib/hooks/usePersistedState'

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

// Timeout wrapper to prevent hanging requests
const fetchWithTimeout = <T,>(
  promise: Promise<T>,
  timeoutMs = 10000
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ])
}

export default function DatabaseDashboard() {
  // Client-side caching with 60s TTL for instant navigation
  const [stats, setStats, statsFromCache] = usePersistedState<DatabaseStats | null>(
    'dashboard_db_stats',
    null,
    { ttl: 60000, version: '1.0' }
  )
  const [loading, setLoading] = useState(!statsFromCache)
  const [error, setError] = useState<string | null>(null)
  const [lazyLoadTrigger, setLazyLoadTrigger] = useState(false)
  const lazyLoadRef = useRef<HTMLDivElement>(null)
  type PositionsBucket = { t: string; positions: number; uniqueVessels: number }
  type AlertsBucket = { t: string; opened: number; resolved: number; active: number; bySeverity: Record<string, number> }
  const [positions, setPositions] = useState<PositionsBucket[] | null>(null)
  const [alertsSeries, setAlertsSeries] = useState<AlertsBucket[] | null>(null)
  const [filtersCounts, setFiltersCounts] = useState<{
    flags: Array<{ value: string; count: number }>
    vesselTypes: Array<{ value: string; count: number }>
  } | null>(null)
  const [buildYearBuckets, setBuildYearBuckets] = useState<Array<{ bin: number; count: number }> | null>(null)
  type SpeedDist = { buckets: Array<{ bin: number; count: number }>; distinctVessels: number; withSpeed: number; min: number }
  type NavStatusDist = { categories: Array<{ value: string; count: number }>; distinctVessels: number; withStatus: number }
  type DestTop = { top: Array<{ value: string; count: number }>; totalPositions: number; withDestination: number }
  const [speedDist, setSpeedDist] = useState<SpeedDist | null>(null)
  const [navStatusDist, setNavStatusDist] = useState<NavStatusDist | null>(null)
  const [destTopData, setDestTopData] = useState<DestTop | null>(null)
  type DataQualityField = { key: string; present: number }
  type DataQuality = { level: 'position' | 'vessel'; since: string; totalPositions?: number; totalVessels?: number; fields: DataQualityField[] }
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null)
  type VesselsBucket = { t: string; newCount: number }
  const [vesselsSeries, setVesselsSeries] = useState<VesselsBucket[] | null>(null)
  const [ownersTop, setOwnersTop] = useState<Array<{ value: string; count: number }> | null>(null)
  const [operatorsTop, setOperatorsTop] = useState<Array<{ value: string; count: number }> | null>(null)

  const fetchStats = async () => {
    try {
      const response = await fetchWithTimeout(
        fetch('/api/database/stats-cached', { cache: 'no-store' }),
        10000
      )
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
        setError(null)
      } else {
        setError(data.details || data.error || 'Unknown error')
      }
    } catch (err) {
      console.error('Failed to fetch database stats:', err)
      // Don't set error on timeout - keep old data visible
      if (err instanceof Error && err.message !== 'Request timeout') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchPositionsSeries = async () => {
    try {
      const res = await fetch('/api/database/metrics/positions-series?range=24h&bucket=5m', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) setPositions(data.buckets)
    } catch {}
  }

  const fetchAlertsSeries = async () => {
    try {
      const res = await fetch('/api/database/metrics/alerts-series?range=24h&bucket=5m', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) setAlertsSeries(data.buckets)
    } catch {}
  }

  const fetchFiltersCounts = async () => {
    try {
      const res = await fetch('/api/vessels/filters', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) {
        setFiltersCounts({ flags: data.filters.flags, vesselTypes: data.filters.vesselTypes })
      }
    } catch {}
  }

  const fetchSpeedBuckets = async () => {
    try {
      const res = await fetch('/api/database/metrics/distributions?type=speed&range=24h&bin=1&min=1&max=60', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) setSpeedDist({ buckets: data.buckets, distinctVessels: data.distinctVessels, withSpeed: data.withSpeed, min: typeof data.min === 'number' ? data.min : 1 })
    } catch {}
  }

  const fetchNavStatusCats = async () => {
    try {
      const res = await fetch('/api/database/metrics/distributions?type=navStatus&range=24h', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) setNavStatusDist({ categories: data.categories, distinctVessels: data.distinctVessels, withStatus: data.withStatus })
    } catch {}
  }

  const fetchDataQuality = async () => {
    try {
      const res = await fetch('/api/database/metrics/data-quality?range=24h&level=position', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) setDataQuality(data)
    } catch {}
  }

  const fetchBuildYearBuckets = async () => {
    try {
      const res = await fetch('/api/database/metrics/distributions?type=buildYear&group=decade', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) setBuildYearBuckets(data.buckets)
    } catch {}
  }

  const fetchDestTop = async () => {
    try {
      const res = await fetch('/api/database/metrics/distributions?type=destination&range=24h', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) setDestTopData({ top: data.top, totalPositions: data.totalPositions, withDestination: data.withDestination })
    } catch {}
  }

  const fetchVesselsSeries = async () => {
    try {
      const res = await fetch('/api/database/metrics/vessels-series?range=30d&bucket=1d', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) setVesselsSeries(data.buckets)
    } catch {}
  }

  const fetchOwnersTop = async () => {
    try {
      const res = await fetch('/api/database/metrics/distributions?type=owner&limit=10', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) setOwnersTop(data.top)
    } catch {}
  }

  const fetchOperatorsTop = async () => {
    try {
      const res = await fetch('/api/database/metrics/distributions?type=operator&limit=10', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) setOperatorsTop(data.top)
    } catch {}
  }

  useEffect(() => {
    // Track last fetch times for different data categories
    let lastStaticFetch = 0
    const STATIC_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes
    
    const tick = async () => {
      const now = Date.now()
      const needsStaticRefresh = now - lastStaticFetch > STATIC_REFRESH_INTERVAL
      
      // PARALLEL Group 1: Real-time data (always fetch)
      const realtimePromises = [
        fetchStats(),
        fetchPositionsSeries(),
        fetchAlertsSeries(),
        fetchSpeedBuckets(),
        fetchNavStatusCats(),
        fetchDataQuality()
      ]
      
      // PARALLEL Group 2: Semi-static data (only every 5 minutes)
      const staticPromises = needsStaticRefresh ? [
        fetchFiltersCounts(),
        fetchBuildYearBuckets(),
        fetchOwnersTop(),
        fetchOperatorsTop(),
        fetchDestTop(),
        fetchVesselsSeries()
      ] : []
      
      // Execute all in parallel with error tolerance
      const results = await Promise.allSettled([
        ...realtimePromises,
        ...staticPromises
      ])
      
      // Log any failures (but don't break the page)
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.warn(`Dashboard API call ${i} failed:`, result.reason)
        }
      })
      
      if (needsStaticRefresh) {
        lastStaticFetch = now
      }
    }

    // Run first tick immediately on mount
    let ticking = false
    const run = async () => {
      if (ticking) return
      ticking = true
      try { 
        await tick() 
      } catch (err) {
        console.error('Dashboard tick error:', err)
      } finally { 
        ticking = false 
      }
    }

    // Initial load
    void run()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => { void run() }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Lazy loading for below-the-fold content using Intersection Observer
  useEffect(() => {
    if (!lazyLoadRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !lazyLoadTrigger) {
          setLazyLoadTrigger(true)
          console.log('📊 Lazy loading below-the-fold charts...')
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    observer.observe(lazyLoadRef.current)
    return () => observer.disconnect()
  }, [lazyLoadTrigger])

  if (loading) {
    return (
      <AppLayout title="Database Statistics" breadcrumbs={[{ label: 'Database' }] }>
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

  if (!stats) {
    return (
      <AppLayout title="Database Statistics" breadcrumbs={[{ label: 'Database' }]}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 animate-pulse text-blue-500" />
            <p className="text-gray-600">Loading database statistics...</p>
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
                  {(stats.vesselStats?.total ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  +{(stats.vesselStats?.newToday ?? 0).toLocaleString()} today
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
                  {(stats.positionStats?.total ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  +{(stats.positionStats?.today ?? 0).toLocaleString()} today
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
                  {(stats.alertStats?.active ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  {stats.alertStats?.critical ?? 0} critical
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
                {(stats.positionStats?.last15Min ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">position updates</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Last Hour</p>
              <p className="text-3xl font-bold text-green-600">
                {(stats.positionStats?.lastHour ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">position updates</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Recently Active</p>
              <p className="text-3xl font-bold text-purple-600">
                {(stats.vesselStats?.recentlyActive ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">vessels (last hour)</p>
            </div>
          </div>
        </WidgetCard>

        {/* New vessels series */}
        {vesselsSeries && vesselsSeries.length > 0 ? (
          <WidgetCard title="New Vessels (30d)" icon={Ship} iconColor="slate" subtitle="New vessel records created per UTC day">
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={vesselsSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleDateString()} />
                  <Legend />
                  <Area type="monotone" dataKey="newCount" stroke="#64748b" fill="#cbd5e1" name="New Vessels" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </WidgetCard>
        ) : null}

        {/* Positions series */}
        {positions && positions.length > 0 ? (
          <WidgetCard title="Positions Activity (24h)" icon={Activity} iconColor="blue" subtitle="Positions ingested per 5-minute bucket and unique vessels active in each bucket">
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={positions} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="posArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                  <YAxis />
                  <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
                  <Legend />
                  <Area type="monotone" dataKey="positions" stroke="#60a5fa" fillOpacity={1} fill="url(#posArea)" name="Positions" />
                  <Line type="monotone" dataKey="uniqueVessels" stroke="#10b981" dot={false} name="Unique Vessels" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </WidgetCard>
        ) : null}

        {/* Alerts series */}
        {alertsSeries && alertsSeries.length > 0 ? (
          <WidgetCard title="Alerts (24h)" icon={Bell} iconColor="orange" subtitle="Opened and resolved alerts per bucket; red line shows active alerts">
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={alertsSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                  <YAxis />
                  <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString()} />
                  <Legend />
                  {Array.from(new Set(alertsSeries.flatMap(b => Object.keys(b.bySeverity)))).map((sev) => (
                    <Area key={sev} type="monotone" dataKey={`bySeverity.${sev}`} stackId="1" stroke="#f59e0b" fill="#fde68a" name={sev} />
                  ))}
                  <Line type="monotone" dataKey="active" stroke="#ef4444" dot={false} name="Active" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </WidgetCard>
        ) : null}

        {/* Lazy load trigger point - below the fold */}
        <div ref={lazyLoadRef} />

        {/* Operational metrics - lazy loaded */}
        {lazyLoadTrigger && (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {speedDist?.buckets?.length ? (
            <WidgetCard
              title="Speed Histogram (24h)"
              icon={Activity}
              iconColor="green"
              subtitle={(() => {
                const active = speedDist?.distinctVessels || 0
                const withSpeed = speedDist?.withSpeed || 0
                const pct = active ? Math.round((withSpeed / active) * 100) : 0
                const min = speedDist?.min ?? 1
                return `Latest speed per ship in the last 24h • Coverage: ${pct}% of active ships${pct < 100 ? ' (partial)' : ''} • Excludes speeds < ${min} kn • Caps > 60 kn`
              })()}
            >
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={speedDist.buckets} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bin" tickFormatter={(v) => `${v} kn`} />
                    <YAxis />
                    <Tooltip labelFormatter={(v) => `${v} kn`} />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </WidgetCard>
          ) : null}

          {navStatusDist?.categories?.length ? (
            <WidgetCard
              title="Navigation Status"
              icon={Activity}
              iconColor="slate"
              subtitle={(() => {
                const total = navStatusDist?.distinctVessels || 0
                const known = navStatusDist?.withStatus || 0
                const pct = total ? Math.round((known / total) * 100) : 0
                return `Latest status per ship in the last 24h • Coverage: ${pct}% of active ships${pct < 100 ? ' (partial)' : ''}`
              })()}
            >
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={navStatusDist.categories} dataKey="count" nameKey="value" outerRadius={90} innerRadius={50}>
                      {navStatusDist.categories.map((_, i) => (
                        <Cell key={i} fill={["#60a5fa","#34d399","#fbbf24","#f87171","#a78bfa","#f472b6","#fb7185","#4ade80"][i % 8]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </WidgetCard>
          ) : null}
          </div>

          {/* Category charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtersCounts?.flags?.length ? (
            <WidgetCard
              title="Ships by Flag"
              icon={Database}
              iconColor="slate"
              subtitle={(() => {
                const total = stats?.vesselStats.total || 0
                const have = filtersCounts.flags.reduce((a, b) => a + b.count, 0)
                const pct = total ? Math.round((have / total) * 100) : 0
                return `Coverage: ${pct}% of vessels have a flag${pct < 100 ? ' (partial)' : ''} • Top 100`
              })()}
            >
              {(() => {
                const rn = new Intl.DisplayNames(['en'], { type: 'region' })
                const data = filtersCounts.flags.map(f => {
                  const name = rn.of(f.value)
                  return { code: f.value, label: name ? `${f.value} — ${name}` : f.value, count: f.count }
                })
                const fullHeight = Math.max(260, data.length * 24)
                return (
                  <div style={{ width: '100%', maxHeight: 520, overflowY: 'auto' }}>
                    <div style={{ width: '100%', height: fullHeight }}>
                      <ResponsiveContainer>
                        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="label" width={240} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#64748b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )
              })()}
            </WidgetCard>
          ) : null}

          {destTopData?.top?.length ? (
            <WidgetCard
              title="Top Destinations (24h)"
              icon={MapPin}
              iconColor="orange"
              subtitle={(() => {
                const total = destTopData?.totalPositions || 0
                const withDest = destTopData?.withDestination || 0
                const pct = total ? Math.round((withDest / total) * 100) : 0
                return `Destinations in last 24h • Coverage: ${pct}% of positions labeled${pct < 100 ? ' (partial)' : ''} • Top 100`
              })()}
            >
              {(() => {
                const fullHeight = Math.max(260, destTopData.top.length * 24)
                return (
                  <div style={{ width: '100%', maxHeight: 520, overflowY: 'auto' }}>
                    <div style={{ width: '100%', height: fullHeight }}>
                      <ResponsiveContainer>
                        <BarChart data={destTopData.top} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="value" width={220} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )
              })()}
            </WidgetCard>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {buildYearBuckets?.length ? (
            <WidgetCard
              title="Build Year (Decades)"
              icon={Database}
              iconColor="purple"
              subtitle={(() => {
                const total = stats?.vesselStats.total || 0
                const have = buildYearBuckets.reduce((a, b) => a + b.count, 0)
                const pct = total ? Math.round((have / total) * 100) : 0
                return `Coverage: ${pct}% of vessels have a build year${pct < 100 ? ' (partial)' : ''}`
              })()}
            >
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={buildYearBuckets} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bin" tickFormatter={(v) => `${v}s`} />
                    <YAxis />
                    <Tooltip labelFormatter={(v) => `${v}s`} />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </WidgetCard>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ownersTop?.length ? (
            <WidgetCard
              title="Top Owners"
              icon={Database}
              iconColor="slate"
              subtitle={(() => {
                const total = stats?.vesselStats.total || 0
                const have = ownersTop.reduce((a, b) => a + b.count, 0)
                const pct = total ? Math.round((have / total) * 100) : 0
                return `Coverage: ~${pct}% of vessels have an owner${pct < 100 ? ' (partial)' : ''}`
              })()}
            >
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={ownersTop} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="value" width={160} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#94a3b8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </WidgetCard>
          ) : null}

          {operatorsTop?.length ? (
            <WidgetCard
              title="Top Operators"
              icon={Database}
              iconColor="slate"
              subtitle={(() => {
                const total = stats?.vesselStats.total || 0
                const have = operatorsTop.reduce((a, b) => a + b.count, 0)
                const pct = total ? Math.round((have / total) * 100) : 0
                return `Coverage: ~${pct}% of vessels have an operator${pct < 100 ? ' (partial)' : ''}`
              })()}
            >
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={operatorsTop} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="value" width={160} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#64748b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </WidgetCard>
          ) : null}
        </div>

        

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dataQuality && ((dataQuality.totalPositions ?? dataQuality.totalVessels ?? 0) > 0) ? (
            <WidgetCard
              title="Data Quality Coverage (24h)"
              icon={Activity}
              iconColor="emerald"
              subtitle={(() => {
                const denom = (dataQuality.totalPositions ?? dataQuality.totalVessels) || 0
                return `Position-level • % of recent positions with Speed, Course, Heading, Status, Destination • n=${denom.toLocaleString()}`
              })()}
            >
              {(() => {
                const denom = (dataQuality.totalPositions ?? dataQuality.totalVessels) || 0
                const label = (k: string) => k === 'speed' ? 'Speed' : k === 'course' ? 'Course' : k === 'heading' ? 'Heading' : k === 'navStatus' ? 'Nav Status' : k === 'destination' ? 'Destination' : k
                const data = dataQuality.fields.map(f => {
                  const present = f.present
                  const missing = Math.max(0, denom - present)
                  const presentPct = denom ? Math.round((present / denom) * 100) : 0
                  const missingPct = 100 - presentPct
                  return { key: label(f.key), presentPct, missingPct, present, missing }
                })
                return (
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="key" />
                        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(value: any, name: any, props: any) => {
                          if (name === 'presentPct') return [`${value}%`, 'Present']
                          if (name === 'missingPct') return [`${value}%`, 'Missing']
                          return [value, name]
                        }} />
                        <Legend />
                        <Bar dataKey="presentPct" stackId="q" fill="#22c55e" name="Present" />
                        <Bar dataKey="missingPct" stackId="q" fill="#e5e7eb" name="Missing" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )
              })()}
            </WidgetCard>
          ) : null}

          {filtersCounts?.vesselTypes?.length ? (
            <WidgetCard
              title="Ships by Type"
              icon={Ship}
              iconColor="blue"
              subtitle={(() => {
                const total = stats?.vesselStats.total || 0
                const have = filtersCounts.vesselTypes.reduce((a, b) => a + b.count, 0)
                const pct = total ? Math.round((have / total) * 100) : 0
                return `Coverage: ${pct}% of vessels have a type${pct < 100 ? ' (partial)' : ''}`
              })()}
            >
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={filtersCounts.vesselTypes.slice(0, 8)} dataKey="count" nameKey="value" outerRadius={90} innerRadius={50}>
                      {filtersCounts.vesselTypes.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={["#60a5fa","#34d399","#fbbf24","#f87171","#a78bfa","#f472b6","#fb7185","#4ade80"][i % 8]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </WidgetCard>
          ) : null}
          </div>
          </>
        )}

      </div>
    </AppLayout>
  )
}
