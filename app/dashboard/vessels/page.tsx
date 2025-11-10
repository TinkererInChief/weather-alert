'use client'

import { useEffect, useRef, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Ship, AlertTriangle, MapPin, Activity, Search } from 'lucide-react'
import WidgetCard from '@/components/dashboard/WidgetCard'
import VesselFilters from '@/components/vessels/VesselFilters'
import { formatDualTime } from '@/lib/time-display'
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
  
  type Bounds = { north: number; south: number; east: number; west: number }
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const boundsRef = useRef<Bounds | null>(null)
  const boundsDebounce = useRef<number | undefined>(undefined)
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_LIMIT = 500  // Reduced from 5000 for better performance
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedVesselId, setHighlightedVesselId] = useState<string | null>(null)
  const [mode, setMode] = useState<'active' | 'all'>('active')
  const [fleetOnly, setFleetOnly] = useState(false)
  const [filters, setFilters] = useState({
    vesselType: 'all',
    owner: 'all',
    operator: 'all',
    flag: 'all'
  })
  const [availableFilters, setAvailableFilters] = useState<{
    vesselTypes: Array<{ value: string; count: number }>
    owners: Array<{ value: string; count: number }>
    operators: Array<{ value: string; count: number }>
    flags: Array<{ value: string; count: number }>
  } | null>(null)
  
  const mergeById = (a: Vessel[], b: Vessel[]): Vessel[] => {
    const map = new Map<string, Vessel>()
    for (const v of a) map.set(v.id, v)
    for (const v of b) map.set(v.id, v)
    return Array.from(map.values())
  }
  
  const fetchVessels = async (opts: { reset?: boolean } = {}) => {
    const { reset } = opts
    try {
      const buildParams = (activeFlag: boolean) => {
        const p = new URLSearchParams()
        if (activeFlag) p.set('active', 'true')
        p.set('withPosition', 'true')
        p.set('limit', String(PAGE_LIMIT))
        if (fleetOnly) p.set('fleetOnly', 'true')
        if (filters.vesselType !== 'all') p.set('vesselType', filters.vesselType)
        if (filters.owner !== 'all') p.set('owner', filters.owner)
        if (filters.operator !== 'all') p.set('operator', filters.operator)
        if (filters.flag !== 'all') p.set('flag', filters.flag)
        if (boundsRef.current) {
          p.set('north', String(boundsRef.current.north))
          p.set('south', String(boundsRef.current.south))
          p.set('east', String(boundsRef.current.east))
          p.set('west', String(boundsRef.current.west))
        }
        if (!reset && skip > 0) {
          p.set('skip', String(skip))
        } else {
          p.set('skip', '0')
        }
        return p
      }

      type ApiData = { success?: boolean; vessels?: Vessel[]; count?: number }
      const doFetch = async (activeFlag: boolean) => {
        const response = await fetch(`/api/vessels?${buildParams(activeFlag).toString()}`, { cache: 'no-store' })
        let data: ApiData = {}
        try {
          data = await response.json()
        } catch {
          data = {}
        }
        return { ok: response.ok, data }
      }

      const usingActive = mode === 'active'
      const first = await doFetch(usingActive)
      const firstCount = Array.isArray(first.data.vessels) ? first.data.vessels.length : 0
      const shouldFallback = (!first.ok || !first.data.success || firstCount === 0) && usingActive
      const second = shouldFallback ? await doFetch(false) : null
      const chosen = shouldFallback && second ? second : first
      if (shouldFallback && second?.data?.success) setMode('all')

      if (chosen.data.success && Array.isArray(chosen.data.vessels)) {
        const arr = chosen.data.vessels as Vessel[]
        if (reset) {
          setVessels(arr)
          setSkip(arr.length)
        } else {
          setVessels((prev) => mergeById(prev, arr))
          setSkip((prev) => prev + arr.length)
        }
        setHasMore(arr.length === PAGE_LIMIT)
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
  
  const fetchAvailableFilters = async () => {
    try {
      const response = await fetch('/api/vessels/filters', {
        cache: 'no-store'
      })
      const data = await response.json()
      if (data.success) {
        setAvailableFilters(data.filters)
      }
    } catch (error) {
      console.error('Failed to fetch filters:', error)
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
  
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setHighlightedVesselId(null)
      return
    }
    
    const q = query.toLowerCase().trim()
    const found = vessels.find(v => 
      v.name.toLowerCase().includes(q) ||
      v.mmsi.includes(q) ||
      v.id.includes(q)
    )
    
    if (found) {
      setHighlightedVesselId(found.id)
    } else {
      setHighlightedVesselId(null)
    }
  }
  
  useEffect(() => {
    fetchAvailableFilters()
  }, [])
  
  useEffect(() => {
    fetchVessels({ reset: true })
    fetchAlerts()
    const interval = setInterval(() => {
      fetchVessels({ reset: true })
      fetchAlerts()
    }, 30000)
    return () => clearInterval(interval)
  }, [fleetOnly, filters])
  
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
        
        {/* Search Bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vessels by name, MMSI, or ID..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 outline-none text-slate-900 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                Clear
              </button>
            )}
          </div>
          {searchQuery && !highlightedVesselId && (
            <p className="mt-2 text-sm text-amber-600">No vessel found matching "{searchQuery}"</p>
          )}
          {highlightedVesselId && (
            <p className="mt-2 text-sm text-green-600">
              ✓ Found vessel - highlighted on map
            </p>
          )}
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Fleet Only Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="fleetOnly"
                checked={fleetOnly}
                onChange={(e) => setFleetOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="fleetOnly" className="text-sm text-slate-700 cursor-pointer">
                Fleet Only
              </label>
            </div>
            
            {/* Vessel Type Filter */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Vessel Type</label>
              <select
                value={filters.vesselType}
                onChange={(e) => setFilters(prev => ({ ...prev, vesselType: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                {availableFilters?.vesselTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.value} ({type.count})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Owner Filter */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Owner</label>
              <select
                value={filters.owner}
                onChange={(e) => setFilters(prev => ({ ...prev, owner: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Owners</option>
                {availableFilters?.owners.map(owner => (
                  <option key={owner.value} value={owner.value}>
                    {owner.value} ({owner.count})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Operator Filter */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Operator</label>
              <select
                value={filters.operator}
                onChange={(e) => setFilters(prev => ({ ...prev, operator: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Operators</option>
                {availableFilters?.operators.map(operator => (
                  <option key={operator.value} value={operator.value}>
                    {operator.value} ({operator.count})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Flag Filter */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Flag</label>
              <select
                value={filters.flag}
                onChange={(e) => setFilters(prev => ({ ...prev, flag: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Flags</option>
                {availableFilters?.flags.map(flag => (
                  <option key={flag.value} value={flag.value}>
                    {flag.value} ({flag.count})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Clear Filters Button */}
          {(fleetOnly || filters.vesselType !== 'all' || filters.owner !== 'all' || filters.operator !== 'all' || filters.flag !== 'all') && (
            <button
              onClick={() => {
                setFleetOnly(false)
                setFilters({
                  vesselType: 'all',
                  owner: 'all',
                  operator: 'all',
                  flag: 'all'
                })
              }}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          )}
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
            {!loading && vessels.length > 0 && (
              <VesselMap 
                key={`map-${vessels.length}`}
                vessels={vessels} 
                alerts={alerts}
                highlightedVesselId={highlightedVesselId}
                onBoundsChange={(b) => {
                  boundsRef.current = b
                  setBounds(b)
                  if (boundsDebounce.current) window.clearTimeout(boundsDebounce.current)
                  boundsDebounce.current = window.setTimeout(() => {
                    setSkip(0)
                    setHasMore(true)
                    fetchVessels({ reset: true })
                  }, 300)
                }}
              />
            )}
            {loading && (
              <div className="h-full flex items-center justify-center">
                <div className="text-slate-600">Loading map...</div>
              </div>
            )}
          </div>
        </WidgetCard>

        <div className="flex justify-center">
          <button
            onClick={() => hasMore && fetchVessels({ reset: false })}
            disabled={!hasMore}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
          >
            {hasMore ? 'Load more' : 'No more'}
          </button>
        </div>
        
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
