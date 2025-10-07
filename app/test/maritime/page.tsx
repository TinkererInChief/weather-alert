"use client"

import { useState } from 'react'
import MaritimeIntelligenceWidget from '@/components/dashboard/MaritimeIntelligenceWidget'
import { Ship, RefreshCw } from 'lucide-react'

// This is a test page - don't statically generate it
export const dynamic = 'force-dynamic'

/**
 * Test page for Maritime Intelligence Widget
 * This demonstrates the widget with sample earthquake data
 */
export default function MaritimeIntelligenceTestPage() {
  const [selectedScenario, setSelectedScenario] = useState<number>(1)
  const [refreshKey, setRefreshKey] = useState(0)

  // Sample earthquake scenarios
  const scenarios = [
    {
      id: 1,
      name: 'San Francisco Bay M7.2',
      magnitude: 7.2,
      location: 'San Francisco Bay Area, California',
      latitude: 37.7749,
      longitude: -122.4194,
      timestamp: new Date(),
      tsunamiWarning: true
    },
    {
      id: 2,
      name: 'Los Angeles M6.8',
      magnitude: 6.8,
      location: 'Los Angeles, California',
      latitude: 34.0522,
      longitude: -118.2437,
      timestamp: new Date(),
      tsunamiWarning: false
    },
    {
      id: 3,
      name: 'Seattle M7.5 + Tsunami',
      magnitude: 7.5,
      location: 'Puget Sound, Washington',
      latitude: 47.6062,
      longitude: -122.3321,
      timestamp: new Date(),
      tsunamiWarning: true
    },
    {
      id: 4,
      name: 'Tokyo Bay M7.0',
      magnitude: 7.0,
      location: 'Tokyo Bay, Japan',
      latitude: 35.6762,
      longitude: 139.6503,
      timestamp: new Date(),
      tsunamiWarning: true
    },
    {
      id: 5,
      name: 'Vancouver M6.5',
      magnitude: 6.5,
      location: 'Vancouver, British Columbia',
      latitude: 49.2827,
      longitude: -123.1207,
      timestamp: new Date(),
      tsunamiWarning: false
    }
  ]

  const currentScenario = scenarios.find(s => s.id === selectedScenario)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Ship className="h-8 w-8 text-blue-600" />
              Maritime Intelligence Widget Demo
            </h1>
            <p className="text-slate-600 mt-2">
              AI-powered maritime impact analysis using Perplexity AI
            </p>
          </div>
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Scenario Selector */}
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Earthquake Scenario</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => setSelectedScenario(scenario.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedScenario === scenario.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-semibold text-sm">{scenario.name}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    M{scenario.magnitude}
                  </div>
                  {scenario.tsunamiWarning && (
                    <div className="text-xs text-red-600 mt-1 font-medium">
                      ⚠️ Tsunami Warning
                    </div>
                  )}
                </button>
              ))}
          </div>
        </div>

        {/* Current Scenario Info */}
        {currentScenario && (
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Scenario Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-slate-600">Magnitude</div>
                  <div className="text-lg font-bold">M{currentScenario.magnitude}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">Location</div>
                  <div className="text-sm font-semibold">{currentScenario.location}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">Coordinates</div>
                  <div className="text-sm">
                    {currentScenario.latitude.toFixed(4)}°, {currentScenario.longitude.toFixed(4)}°
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">Tsunami Warning</div>
                  <div className={`text-sm font-semibold ${currentScenario.tsunamiWarning ? 'text-red-600' : 'text-green-600'}`}>
                    {currentScenario.tsunamiWarning ? 'YES' : 'NO'}
                  </div>
                </div>
              </div>
          </div>
        )}

        {/* Maritime Intelligence Widget */}
        <div key={refreshKey}>
          {currentScenario && (
            <MaritimeIntelligenceWidget
              earthquakeData={currentScenario}
              autoFetch={true}
            />
          )}
        </div>

        {/* Instructions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">How It Works</h3>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2">1. Real-Time AI Analysis</h3>
              <p className="text-sm text-slate-600">
                When an earthquake occurs, the widget queries Perplexity AI with the event details
                to get up-to-date maritime intelligence.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">2. Port Status Intelligence</h3>
              <p className="text-sm text-slate-600">
                AI analyzes which ports are likely affected, closed, or under tsunami warning,
                with estimated reopening times based on historical data.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">3. Vessel Guidance</h3>
              <p className="text-sm text-slate-600">
                Provides specific recommendations for vessels in different situations: in port,
                approaching port, coastal waters, or deep ocean.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">4. Emergency Contacts</h3>
              <p className="text-sm text-slate-600">
                Displays Coast Guard stations, port authorities, and VHF emergency channels
                for the affected region.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">5. Historical Context</h3>
              <p className="text-sm text-slate-600">
                Compares to similar past events to provide context on expected port closure
                duration and operational impact.
              </p>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold text-sm mb-2">API Configuration</h3>
              <p className="text-sm text-slate-600">
                This widget uses Perplexity AI's Sonar Large model with online search.
                Make sure <code className="bg-slate-100 px-1 py-0.5 rounded">PERPLEXITY_API_KEY</code> is set in your environment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
