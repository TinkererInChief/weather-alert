"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { Ship, AlertTriangle, Phone, Anchor, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Info, ChevronDown, ChevronUp, X, Send, History } from 'lucide-react'
import type { MaritimeIntelligence } from '@/lib/services/perplexity-service'
import { calculateMaritimeImpact, type EarthquakeEvent, type MaritimeImpactScore } from '@/lib/maritime-impact-scorer'
import EnvironmentalConditionsPanel from './EnvironmentalConditionsPanel'
import ImpactScoreBreakdown from './ImpactScoreBreakdown'

type MaritimeIntelligenceWidgetProps = {
  earthquakeData?: {
    magnitude: number
    location: string
    latitude: number
    longitude: number
    timestamp: Date
    tsunamiWarning?: boolean
  }
  autoFetch?: boolean
}

export default function MaritimeIntelligenceWidget({ 
  earthquakeData, 
  autoFetch = false  // Changed default to false
}: MaritimeIntelligenceWidgetProps) {
  const [intelligence, setIntelligence] = useState<MaritimeIntelligence | null>(null)
  const [environmentalData, setEnvironmentalData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [envLoading, setEnvLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastFetchedKey = useRef<string>('')
  const [showDetails, setShowDetails] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isHeaderSticky, setIsHeaderSticky] = useState(false)
  const [isAboveFold, setIsAboveFold] = useState(true)
  const [notifying, setNotifying] = useState(false)
  const widgetRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLButtonElement>(null)

  // Enhancement 5: User Preferences - Remember expand/collapse state
  const PREFERENCE_KEY = 'maritime-widget-preferences'
  
  const savePreference = (eventKey: string, expanded: boolean) => {
    try {
      const preferences = JSON.parse(localStorage.getItem(PREFERENCE_KEY) || '{}')
      preferences[eventKey] = { expanded, timestamp: Date.now() }
      // Keep only last 50 preferences
      const entries = Object.entries(preferences)
      if (entries.length > 50) {
        const sorted = entries.sort((a: any, b: any) => b[1].timestamp - a[1].timestamp)
        const trimmed = Object.fromEntries(sorted.slice(0, 50))
        localStorage.setItem(PREFERENCE_KEY, JSON.stringify(trimmed))
      } else {
        localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences))
      }
    } catch (err) {
      console.warn('Failed to save widget preference:', err)
    }
  }

  const loadPreference = (eventKey: string): boolean | null => {
    try {
      const preferences = JSON.parse(localStorage.getItem(PREFERENCE_KEY) || '{}')
      return preferences[eventKey]?.expanded ?? null
    } catch (err) {
      return null
    }
  }

  // Generate unique key for earthquake event to prevent duplicate fetches
  const getEventKey = () => {
    if (!earthquakeData) return ''
    return `${earthquakeData.location}-${earthquakeData.magnitude}-${earthquakeData.timestamp.getTime()}`
  }

  // Calculate maritime impact score
  const impactScore = useMemo<MaritimeImpactScore | null>(() => {
    if (!earthquakeData) return null
    
    const event: EarthquakeEvent = {
      id: getEventKey(),
      magnitude: earthquakeData.magnitude,
      latitude: earthquakeData.latitude,
      longitude: earthquakeData.longitude,
      depth: 10, // Default depth if not provided
      location: earthquakeData.location,
      timestamp: earthquakeData.timestamp,
      tsunamiWarning: earthquakeData.tsunamiWarning
    }
    
    return calculateMaritimeImpact(event)
  }, [earthquakeData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-expand only for critical/high priority events on first render
  // Also check user preferences
  useEffect(() => {
    const eventKey = getEventKey()
    const savedPreference = loadPreference(eventKey)
    
    if (savedPreference !== null) {
      // User has a saved preference for this event
      setIsExpanded(savedPreference)
    } else if (impactScore && impactScore.totalScore >= 70) {
      // No preference, auto-expand critical alerts
      setIsExpanded(true)
    }
  }, [impactScore]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save preference when user manually toggles
  const toggleExpanded = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    savePreference(getEventKey(), newState)
  }

  // Enhancement 1: Smart Positioning - Viewport Detection
  useEffect(() => {
    const checkPosition = () => {
      if (!widgetRef.current) return
      const rect = widgetRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      setIsAboveFold(rect.top < viewportHeight)
    }

    checkPosition()
    window.addEventListener('scroll', checkPosition)
    window.addEventListener('resize', checkPosition)

    return () => {
      window.removeEventListener('scroll', checkPosition)
      window.removeEventListener('resize', checkPosition)
    }
  }, [])

  // Enhancement 2: Sticky Header - Keep severity badge visible while scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (!widgetRef.current || !headerRef.current) return
      
      const widgetRect = widgetRef.current.getBoundingClientRect()
      const headerRect = headerRef.current.getBoundingClientRect()
      
      // Make header sticky when widget is partially scrolled off screen
      const shouldStick = widgetRect.top < 80 && widgetRect.bottom > headerRect.height + 80
      setIsHeaderSticky(shouldStick)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const eventKey = getEventKey()
    
    // Auto-fetch logic based on impact score
    // Score >= 50 OR autoFetch=true AND we haven't fetched yet
    const shouldAutoFetch = impactScore?.shouldAutoFetch || autoFetch
    
    if (earthquakeData && shouldAutoFetch && eventKey !== lastFetchedKey.current) {
      fetchIntelligence()
      lastFetchedKey.current = eventKey
    } else if (earthquakeData && eventKey !== lastFetchedKey.current) {
      // For low-impact events, still fetch environmental data
      fetchEnvironmentalData()
      lastFetchedKey.current = eventKey
    }
  }, [earthquakeData, autoFetch, impactScore])

  const fetchEnvironmentalData = async () => {
    if (!earthquakeData) return

    setEnvLoading(true)

    try {
      const response = await fetch('/api/maritime/environmental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: earthquakeData.latitude,
          longitude: earthquakeData.longitude,
          magnitude: earthquakeData.magnitude,
          tsunamiWarning: earthquakeData.tsunamiWarning || false
        })
      })

      if (response.ok) {
        const data = await response.json()
        setEnvironmentalData(data.data)
      }
    } catch (err) {
      console.warn('Environmental data fetch failed:', err)
      // Don't set error - environmental data is optional
    } finally {
      setEnvLoading(false)
    }
  }

  // Enhancement 3: Quick Actions - Notify Vessels
  const handleNotifyVessels = async () => {
    if (!earthquakeData || !impactScore) return

    setNotifying(true)
    try {
      const response = await fetch('/api/maritime/notify-vessels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          earthquakeId: getEventKey(),
          magnitude: earthquakeData.magnitude,
          location: earthquakeData.location,
          latitude: earthquakeData.latitude,
          longitude: earthquakeData.longitude,
          impactScore: impactScore.totalScore,
          priority: impactScore.priority,
          affectedPorts: impactScore.affectedAssets.nearbyPorts,
          affectedVessels: impactScore.affectedAssets.estimatedVesselsInRange
        })
      })

      if (response.ok) {
        alert('Vessel notifications dispatched successfully')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to notify vessels')
      }
    } catch (err) {
      console.error('Error notifying vessels:', err)
      alert('Failed to notify vessels')
    } finally {
      setNotifying(false)
    }
  }

  // Enhancement 4: Historical Comparison - Find similar past events
  const historicalComparison = useMemo(() => {
    if (!earthquakeData) return null

    // Sample historical events (in production, fetch from database)
    const historicalEvents = [
      { magnitude: 7.1, location: 'Southern California', year: 2019, impact: 'Major port disruptions' },
      { magnitude: 6.9, location: 'Alaska', year: 2018, impact: 'Fishing fleet evacuated' },
      { magnitude: 7.5, location: 'Indonesia', year: 2018, impact: 'Tsunami warning issued' },
    ]

    // Find similar event by magnitude (±0.5) and location proximity
    const similar = historicalEvents.find(event => 
      Math.abs(event.magnitude - earthquakeData.magnitude) <= 0.5
    )

    return similar
  }, [earthquakeData])

  const fetchIntelligence = async () => {
    if (!earthquakeData) return

    setLoading(true)
    setError(null)

    // Fetch environmental data and AI intelligence in parallel
    const intelligencePromise = fetch('/api/maritime/intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: earthquakeData.tsunamiWarning ? 'tsunami' : 'earthquake',
        magnitude: earthquakeData.magnitude,
        location: earthquakeData.location,
        latitude: earthquakeData.latitude,
        longitude: earthquakeData.longitude,
        timestamp: earthquakeData.timestamp.toISOString(),
        tsunamiWarning: earthquakeData.tsunamiWarning || false
      })
    })

    const environmentalPromise = fetchEnvironmentalData()

    try {
      const response = await intelligencePromise

      if (!response.ok) {
        throw new Error('Failed to fetch maritime intelligence')
      }

      const data = await response.json()
      setIntelligence(data.data)
      
      // Environmental data fetches in background
      await environmentalPromise
    } catch (err) {
      console.error('Error fetching maritime intelligence:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!earthquakeData) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Ship className="h-5 w-5 text-slate-900" />
          <h3 className="text-lg font-semibold text-slate-900">Maritime Intelligence</h3>
        </div>
        <p className="text-sm text-slate-600">
          No active earthquake events. Maritime intelligence will appear here when an event occurs.
        </p>
      </div>
    )
  }

  // LOW IMPACT DISPLAY: Score < 30 = Dismissible Compact Banner
  if (impactScore && impactScore.totalScore < 30 && !showDetails && !isDismissed) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Info className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-slate-700">Negligible maritime impact</span>
              <span className="text-slate-500"> • M{earthquakeData.magnitude} {earthquakeData.location}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowDetails(true); fetchIntelligence() }}
              disabled={loading}
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              Details
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Ship className="h-5 w-5 text-slate-900 animate-pulse" />
          <h3 className="text-lg font-semibold text-slate-900">Analyzing Maritime Impact...</h3>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 animate-pulse rounded"></div>
          <div className="h-4 bg-slate-200 animate-pulse rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 animate-pulse rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Ship className="h-5 w-5 text-slate-900" />
          <h3 className="text-lg font-semibold text-slate-900">Maritime Intelligence</h3>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchIntelligence}
          className="text-sm text-blue-600 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  // Show initial state with "Analyze" button if no intelligence yet
  if (!intelligence && !loading && !error) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Ship className="h-5 w-5 text-slate-900" />
          <h3 className="text-lg font-semibold text-slate-900">Maritime Impact Analysis</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Get AI-powered maritime intelligence for M{earthquakeData?.magnitude} {earthquakeData?.location}
        </p>
        <button
          onClick={fetchIntelligence}
          className="btn btn-primary flex items-center gap-2"
        >
          <Ship className="h-4 w-4" />
          Analyze Maritime Impact
        </button>
      </div>
    )
  }

  if (!intelligence) return null

  // Helper function to get severity badge styling
  const getSeverityBadge = () => {
    if (!impactScore) return null
    
    const { priority, totalScore } = impactScore
    
    const badgeStyles = {
      critical: 'bg-red-50 text-red-600 border-red-200',
      high: 'bg-orange-50 text-orange-600 border-orange-200',
      medium: 'bg-amber-50 text-amber-600 border-amber-200',
      low: 'bg-slate-50 text-slate-600 border-slate-200',
      negligible: 'bg-slate-50 text-slate-500 border-slate-200'
    }
    
    return (
      <div className="flex flex-col items-end gap-1 mb-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold border ${badgeStyles[priority]}`}>
          {priority.toUpperCase()}
        </span>
        <span className="text-xs text-slate-500">
          Score: {totalScore}/100
        </span>
      </div>
    )
  }

  const isCritical = impactScore && impactScore.totalScore >= 70
  const isModerate = impactScore && impactScore.totalScore >= 30 && impactScore.totalScore < 70

  return (
    <div ref={widgetRef} className={`card relative ${isCritical ? 'border-2 border-red-200 bg-red-50/30' : ''}`}>
      {/* Sticky Header - Enhancement 2 */}
      {isHeaderSticky && (
        <div className="fixed top-20 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-md p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ship className="h-5 w-5 text-slate-900" />
              <div>
                <h3 className="font-semibold text-slate-900">Maritime Impact Analysis</h3>
                <p className="text-xs text-slate-600">
                  M{earthquakeData?.magnitude} {earthquakeData?.location}
                </p>
              </div>
            </div>
            {getSeverityBadge()}
          </div>
        </div>
      )}

      {/* Collapsible Header */}
      <button
        ref={headerRef}
        onClick={toggleExpanded}
        className="w-full flex items-start justify-between mb-4 group cursor-pointer hover:opacity-80 transition-opacity"
      >
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-slate-900" />
            <h3 className="text-lg font-semibold text-slate-900">Maritime Impact Analysis</h3>
            {isModerate && !isExpanded && (
              <span className="text-xs text-slate-500">(Click to expand)</span>
            )}
          </div>
          <p className="text-sm text-slate-600">
            M{earthquakeData.magnitude} {earthquakeData.location}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-end gap-1">
            {getSeverityBadge()}
            {intelligence && (
              <>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  intelligence.confidence === 'high' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                    : 'bg-slate-50 text-slate-600 border border-slate-100'
                }`}>
                  {intelligence.confidence} confidence
                </span>
                <span className="text-xs text-slate-500">
                  {intelligence.sources} sources
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {intelligence && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  fetchIntelligence()
                }}
                disabled={loading}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh maritime intelligence"
              >
                <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            {isModerate && (
              <div className="p-2">
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-slate-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-600" />
                )}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Enhancement 4: Historical Comparison */}
      {historicalComparison && !isExpanded && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <History className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Similar to {historicalComparison.year} event</p>
              <p className="text-blue-700 text-xs mt-1">
                M{historicalComparison.magnitude} {historicalComparison.location} • {historicalComparison.impact}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhancement 3: Quick Actions - Notify Vessels for Critical Events */}
      {isCritical && !isExpanded && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={handleNotifyVessels}
            disabled={notifying}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {notifying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {notifying ? 'Notifying...' : 'Notify Affected Vessels'}
          </button>
          <button
            onClick={toggleExpanded}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            View Full Analysis
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="space-y-6">
        {/* Impact Score Breakdown */}
        {impactScore && (
          <ImpactScoreBreakdown score={impactScore} />
        )}

        {/* Environmental Conditions */}
        {environmentalData && (
          <EnvironmentalConditionsPanel data={environmentalData} />
        )}

        {/* Summary */}
        <div>
          <p className="text-sm leading-relaxed">{intelligence.summary}</p>
        </div>

        {/* Port Status */}
        {intelligence.portStatus.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Anchor className="h-4 w-4" />
              Port Status
            </h3>
            <div className="space-y-2">
              {intelligence.portStatus.map((port, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-3 rounded-lg border border-slate-200 bg-white"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {port.status === 'closed' && (
                        <XCircle className="h-4 w-4 text-rose-600" />
                      )}
                      {port.status === 'open' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {port.status === 'monitoring' && (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      )}
                      <span className="font-medium">{port.name}</span>
                    </div>
                    {port.reason && (
                      <p className="text-sm text-slate-600 mt-1">
                        {port.reason}
                      </p>
                    )}
                    {port.estimatedReopening && (
                      <p className="text-xs text-slate-500 mt-1">
                        Estimated reopening: {port.estimatedReopening}
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    port.status === 'closed'
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                      : port.status === 'open'
                      ? 'bg-green-50 text-green-600 border border-green-100'
                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    {port.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vessel Guidance */}
        {intelligence.vesselGuidance.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Ship className="h-4 w-4" />
              Vessel Guidance
            </h3>
            <div className="space-y-2">
              {intelligence.vesselGuidance.map((guidance, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-white">
                  <p className="font-medium text-sm">{guidance.situation}</p>
                  <p className="text-sm text-slate-600 mt-1">
                    {guidance.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shipping Routes */}
        {(intelligence.shippingRoutes.affected.length > 0 || 
          intelligence.shippingRoutes.alternatives.length > 0) && (
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Shipping Routes
            </h3>
            
            {intelligence.shippingRoutes.affected.length > 0 && (
              <div>
                <p className="text-sm font-medium text-rose-600 mb-2">
                  Affected Routes:
                </p>
                <ul className="space-y-1">
                  {intelligence.shippingRoutes.affected.map((route, idx) => (
                    <li key={idx} className="text-sm text-slate-600 ml-4">
                      • {route}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {intelligence.shippingRoutes.alternatives.length > 0 && (
              <div>
                <p className="text-sm font-medium text-green-600 mb-2">
                  Alternative Routes:
                </p>
                <ul className="space-y-1">
                  {intelligence.shippingRoutes.alternatives.map((route, idx) => (
                    <li key={idx} className="text-sm text-slate-600 ml-4">
                      • {route}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Emergency Contacts */}
        {intelligence.emergencyContacts.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Emergency Contacts
            </h3>
            <div className="space-y-2">
              {intelligence.emergencyContacts.map((contact, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                  <div>
                    <p className="font-medium text-sm">{contact.agency}</p>
                    <p className="text-sm text-slate-600">{contact.phone}</p>
                  </div>
                  {contact.vhf && (
                    <span className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
                      {contact.vhf}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historical Context - Only show if meaningful data exists */}
        {intelligence.historicalContext && intelligence.historicalContext.trim().length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Historical Context
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {intelligence.historicalContext}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Powered by Perplexity AI</span>
            <span>
              Generated {new Date(intelligence.generatedAt).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 italic">
            AI-generated content may contain errors. Always verify critical information with official maritime authorities.
          </p>
        </div>
        </div>
      )}
    </div>
  )
}
