'use client'

import { useState } from 'react'
import { Ship, Waves, AlertCircle, CheckCircle2 } from 'lucide-react'
import WidgetCard from './WidgetCard'

type TestLocation = 'san-francisco' | 'seattle' | 'socal' | 'hawaii' | 'alaska'

const TEST_LOCATIONS: Record<TestLocation, {
  name: string
  description: string
  expectedPanels: number
}> = {
  'san-francisco': {
    name: 'San Francisco Bay',
    description: 'M6.5 - All 4 panels available',
    expectedPanels: 4
  },
  'seattle': {
    name: 'Puget Sound',
    description: 'M6.2 - All 4 panels available',
    expectedPanels: 4
  },
  'socal': {
    name: 'Southern California',
    description: 'M6.8 - All 4 panels available',
    expectedPanels: 4
  },
  'hawaii': {
    name: 'Hawaiian Islands',
    description: 'M7.0 - Pacific data sources',
    expectedPanels: 4
  },
  'alaska': {
    name: 'Gulf of Alaska',
    description: 'M6.5 - Arctic/Pacific data',
    expectedPanels: 4
  }
}

export default function MaritimeTestingControls() {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runMaritimeTest = async (location: TestLocation) => {
    setTesting(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch('/api/test/maritime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location })
      })

      const data = await response.json()

      if (data.success) {
        setResult(`✅ ${data.message}\n📍 ${data.data.location}\n🔢 M${data.data.magnitude} at ${data.data.depth}km depth\n\n${data.data.note}`)
        
        // Reload page after 2 seconds to show new data
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setError(`❌ ${data.error}`)
      }
    } catch (err) {
      setError(`❌ Network error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <WidgetCard
      title="Maritime Intelligence Testing"
      icon={Ship}
      iconColor="cyan"
      subtitle="Generate coastal earthquakes to test environmental data"
    >

      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(TEST_LOCATIONS).map(([key, config]) => (
            <button
              key={key}
              onClick={() => runMaritimeTest(key as TestLocation)}
              disabled={testing}
              className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <Waves className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-900">{config.name}</div>
                <div className="text-xs text-slate-600">{config.description}</div>
                <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <span className="font-medium">{config.expectedPanels} panels</span>
                  <span className="text-slate-400">• Sea/Tidal/Aftershock/SAR</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {result && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="text-sm text-green-900 whitespace-pre-line">{result}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="text-sm text-red-900">{error}</div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Expected panels:</span>
              <span>🌊 Sea State • 🌀 Tidal • ⚡ Aftershocks • 🚁 SAR</span>
            </div>
            <div className="text-slate-400">
              Page will auto-reload after creating test data. Maritime Intelligence Widget appears for M6.0+ events.
            </div>
          </div>
        </div>
      </div>
    </WidgetCard>
  )
}
