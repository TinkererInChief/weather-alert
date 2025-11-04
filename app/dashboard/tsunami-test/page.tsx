'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { WaveConfirmationBadge, ConfidenceScoreBar, MultiWaveTimeline } from '@/components/tsunami'
import { Waves, Clock, MapPin } from 'lucide-react'

export default function TsunamiTestPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMockData = async () => {
      try {
        const response = await fetch('/api/tsunami/mock')
        const data = await response.json()
        if (data.success) {
          setAlerts(data.data.alerts)
        }
      } catch (error) {
        console.error('Failed to fetch mock data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMockData()
  }, [])

  if (loading) {
    return (
      <AuthGuard>
        <AppLayout title="DART Features Test">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </AppLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <AppLayout 
        title="DART Features Test Page"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tsunami Test' }
        ]}
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">🧪 Test Page - DART Features Demo</h2>
            <p className="text-sm text-blue-700">
              This page displays mock tsunami alerts with DART enrichment data so you can see all the new features in action.
            </p>
          </div>

          <div className="space-y-6">
            {alerts.map((alert, index) => (
              <div key={alert.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                {/* Alert Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Waves className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-slate-900">{alert.title}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {alert.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(alert.issuedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{alert.description}</p>
                  </div>
                  <div className={`px-3 py-1 text-sm font-medium rounded-full ${
                    alert.severity >= 4 ? 'bg-red-100 text-red-800' :
                    alert.severity >= 3 ? 'bg-orange-100 text-orange-800' :
                    alert.severity >= 2 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.category}
                  </div>
                </div>

                {/* DART Wave Confirmation Badge */}
                {alert.dartConfirmation && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-slate-600 mb-2">✨ DART FEATURE #1: Wave Confirmation Badge</div>
                    <WaveConfirmationBadge 
                      confirmation={alert.dartConfirmation}
                      variant="full"
                    />
                  </div>
                )}

                {/* Confidence Score */}
                {alert.confidence && alert.sources && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-slate-600 mb-2">✨ DART FEATURE #2: Confidence Score Bar</div>
                    <ConfidenceScoreBar 
                      score={alert.confidence}
                      sources={alert.sources}
                      showDetails={true}
                    />
                  </div>
                )}

                {/* Multi-Wave Timeline */}
                {alert.waveTrains && alert.waveTrains.length > 1 && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-slate-600 mb-2">✨ DART FEATURE #3: Multi-Wave Timeline</div>
                    <MultiWaveTimeline waves={alert.waveTrains} />
                  </div>
                )}

                {/* Instructions */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-700">Instructions:</p>
                  <p className="text-sm text-slate-600">{alert.instructions}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-green-900 mb-2">✅ Features Demonstrated</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• <strong>Green Badge</strong> - DART physical wave confirmation with buoy details</li>
              <li>• <strong>Confidence Score</strong> - 0-100% scoring with color coding and multi-source attribution</li>
              <li>• <strong>Multi-Wave Timeline</strong> - Shows all detected waves with ETAs and safety warnings</li>
            </ul>
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  )
}
