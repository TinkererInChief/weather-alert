'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import {
  WaveConfirmationBadgeV2,
  ConfidenceScoreBarV2,
  WaveHeightComparison,
  LiveWaveTimeline,
  RadialConfidenceDisplay,
  TsunamiPropagationMap,
  DartStationGlobe
} from '@/components/tsunami'
import { DART_STATIONS, getNetworkStats } from '@/lib/data/dart-stations'
import { Sparkles, CheckCircle } from 'lucide-react'

export default function TsunamiShowcasePage() {
  const [activeDemo, setActiveDemo] = useState<string>('all')
  
  // Real DART network data - all 71 stations!
  const dartStations = DART_STATIONS.map(station => ({
    ...station,
    lastPing: station.status !== 'offline' ? new Date() : undefined
  }))
  
  const networkStats = getNetworkStats()
  
  // Mock data for alert demonstrations
  const mockDartConfirmation = {
    stationId: '21413',
    stationName: 'DART 21413 - Off Japan Coast',
    height: 2.3,
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    region: 'Western Pacific'
  }
  
  const mockWaves = [
    {
      number: 1,
      height: 1.2,
      eta: new Date(Date.now() + 15 * 60 * 1000),
      isStrongest: false
    },
    {
      number: 2,
      height: 2.8,
      eta: new Date(Date.now() + 30 * 60 * 1000),
      isStrongest: true
    },
    {
      number: 3,
      height: 1.5,
      eta: new Date(Date.now() + 45 * 60 * 1000),
      isStrongest: false
    }
  ]

  const demos = [
    { id: 'all', name: 'All Features', icon: Sparkles },
    { id: 'badges', name: 'Confirmation Badges' },
    { id: 'confidence', name: 'Confidence Scoring' },
    { id: 'height', name: 'Wave Height' },
    { id: 'timeline', name: 'Wave Timeline' },
    { id: 'map', name: 'Propagation Map' },
    { id: 'globe', name: '3D Globe' }
  ]

  return (
    <AuthGuard>
      <AppLayout
        title="DART Features Showcase"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tsunami', href: '/dashboard/tsunami' },
          { label: 'Showcase' }
        ]}
      >
        <div className="space-y-6">
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 rounded-xl p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 to-transparent"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="h-8 w-8" />
                <h1 className="text-3xl font-bold">DART Enhanced Visualizations</h1>
              </div>
              <p className="text-blue-100 text-lg mb-4">
                Interactive showcase of all Phase 1, Phase 2, and 3D Globe features
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-2xl font-bold">{networkStats.total}</div>
                  <div className="text-xs text-blue-200">DART Buoys</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-300">{networkStats.online}</div>
                  <div className="text-xs text-blue-200">Online</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-2xl font-bold">7</div>
                  <div className="text-xs text-blue-200">New Components</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-2xl font-bold">{networkStats.regions}</div>
                  <div className="text-xs text-blue-200">Global Regions</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Demo Selector */}
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex flex-wrap gap-2">
              {demos.map(demo => (
                <button
                  key={demo.id}
                  onClick={() => setActiveDemo(demo.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeDemo === demo.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {demo.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Phase 1 Features */}
          {(activeDemo === 'all' || activeDemo === 'badges') && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Phase 1: Wave Confirmation Badges</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-3">Compact Variant</h3>
                  <WaveConfirmationBadgeV2 confirmation={mockDartConfirmation} variant="compact" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-3">Full Variant with Animation</h3>
                  <WaveConfirmationBadgeV2 confirmation={mockDartConfirmation} variant="full" />
                </div>
              </div>
            </div>
          )}
          
          {(activeDemo === 'all' || activeDemo === 'confidence') && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Phase 1: Confidence Scoring</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-600 mb-4">Animated Bar (95%)</h3>
                  <ConfidenceScoreBarV2 
                    score={95} 
                    sources={['PTWC', 'JMA', 'DART']}
                    showDetails={true}
                  />
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <h3 className="text-sm font-medium text-slate-600 mb-4">Radial Display (85%)</h3>
                  <RadialConfidenceDisplay 
                    score={85} 
                    sources={['GeoNet', 'DART']}
                    size="md"
                  />
                </div>
              </div>
            </div>
          )}
          
          {(activeDemo === 'all' || activeDemo === 'height') && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Phase 1: Wave Height Comparison</h2>
              <WaveHeightComparison height={2.3} showComparisons={true} />
            </div>
          )}
          
          {(activeDemo === 'all' || activeDemo === 'timeline') && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Phase 2: Live Wave Timeline</h2>
              <LiveWaveTimeline waves={mockWaves} targetLocation="Hawaii" />
            </div>
          )}
          
          {(activeDemo === 'all' || activeDemo === 'map') && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Phase 2: Tsunami Propagation Map</h2>
              <TsunamiPropagationMap
                epicenter={{ lat: 38.2, lon: 142.8 }}
                magnitude={8.2}
                waveSpeed={800}
                timeElapsed={30}
                dartStations={dartStations.slice(0, 10)}
              />
            </div>
          )}
          
          {(activeDemo === 'all' || activeDemo === 'globe') && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Phase 3: 3D DART Station Globe</h2>
              <p className="text-slate-600 mb-4">
                Interactive 3D visualization of all <strong>{networkStats.total} DART buoys</strong> deployed globally. 
                <span className="text-green-600 font-medium ml-2">{networkStats.online} Online</span>
                {networkStats.detecting > 0 && <span className="text-green-500 font-medium ml-2">• {networkStats.detecting} Detecting</span>}
                {networkStats.offline > 0 && <span className="text-slate-500 font-medium ml-2">• {networkStats.offline} Offline</span>}
              </p>
              <DartStationGlobe stations={dartStations} height={600} />
            </div>
          )}
          
          {/* Feature Summary */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">✨ Implemented Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold text-green-800">Phase 1 (Quick Wins)</h4>
                <ul className="space-y-1 text-green-700">
                  <li>✅ Animated confidence builder with segments</li>
                  <li>✅ Wave height visual comparison</li>
                  <li>✅ Framer Motion micro-animations</li>
                  <li>✅ Glow effects on DART badges</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-green-800">Phase 2 (Core Features)</h4>
                <ul className="space-y-1 text-green-700">
                  <li>✅ Live propagation map with animation</li>
                  <li>✅ ETA countdown with moving dots</li>
                  <li>✅ Radial confidence display</li>
                  <li>✅ Real-time wave timeline</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-green-800">Phase 3 (Advanced)</h4>
                <ul className="space-y-1 text-green-700">
                  <li>✅ 3D DART station globe (react-globe.gl)</li>
                  <li>✅ Interactive station selection</li>
                  <li>✅ Real-time detection pulses</li>
                  <li>✅ Auto-rotating Earth view</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-green-800">Tech Stack</h4>
                <ul className="space-y-1 text-green-700">
                  <li>🎨 Framer Motion (animations)</li>
                  <li>🌍 React Globe.gl (3D globe)</li>
                  <li>🔢 React CountUp (number animations)</li>
                  <li>🎯 TypeScript (type safety)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  )
}
