"use client"

import { useState, useEffect, useRef } from 'react'
import { Ship, AlertTriangle, Phone, Anchor, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import type { MaritimeIntelligence } from '@/lib/services/perplexity-service'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastFetchedKey = useRef<string>('')

  // Generate unique key for earthquake event to prevent duplicate fetches
  const getEventKey = () => {
    if (!earthquakeData) return ''
    return `${earthquakeData.location}-${earthquakeData.magnitude}-${earthquakeData.timestamp.getTime()}`
  }

  useEffect(() => {
    const eventKey = getEventKey()
    
    // Only fetch if autoFetch is true AND we haven't fetched this event yet
    if (earthquakeData && autoFetch && eventKey !== lastFetchedKey.current) {
      fetchIntelligence()
      lastFetchedKey.current = eventKey
    }
  }, [earthquakeData, autoFetch])

  const fetchIntelligence = async () => {
    if (!earthquakeData) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/maritime/intelligence', {
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

      if (!response.ok) {
        throw new Error('Failed to fetch maritime intelligence')
      }

      const data = await response.json()
      setIntelligence(data.data)
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

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-slate-900" />
            <h3 className="text-lg font-semibold text-slate-900">Maritime Impact Analysis</h3>
          </div>
          <p className="text-sm text-slate-600">
            M{earthquakeData.magnitude} {earthquakeData.location}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-end gap-1">
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
          </div>
          <button
            onClick={fetchIntelligence}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh maritime intelligence"
          >
            <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
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

        {/* Historical Context */}
        {intelligence.historicalContext && (
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
        <div className="pt-4 border-t border-slate-200 text-xs text-slate-500">
          <div className="flex items-center justify-between">
            <span>Powered by Perplexity AI</span>
            <span>
              Generated {new Date(intelligence.generatedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
