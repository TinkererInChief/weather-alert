'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertTriangle, Waves, Ship, Radio, MapPin, Clock, Gauge, CheckCircle, Loader2, Zap, TrendingUp, Users, Globe } from 'lucide-react'

type SimulationResult = {
  success: boolean
  dryRun: boolean
  simulation: {
    epicenter: { lat: number; lon: number }
    magnitude: number
    tsunamiSpeed: number
    affectedVessels: Array<{
      vessel: {
        id: string
        name: string
        mmsi: string
        position: { lat: number; lon: number }
      }
      distance: number
      waveHeight: number
      eta: number
      severity: string
    }>
    alerts: Array<{
      alertId: string
      vessel: any
      distance: number
      waveHeight: number
      eta: number
      severity: string
      policy: any
      escalation: any
      contacts: any[]
    }>
    summary: {
      totalVessels: number
      affectedVessels: number
      alertsCreated: number
      notificationsSent: number
    }
    logs: string[]
  }
}

export default function TsunamiSimulation() {
  const router = useRouter()
  const [epicenterLat, setEpicenterLat] = useState('35.5')
  const [epicenterLon, setEpicenterLon] = useState('139.8')
  const [magnitude, setMagnitude] = useState('7.5')
  const [sendReal, setSendReal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [error, setError] = useState<string>('')
  const [simulationStep, setSimulationStep] = useState(0)

  const handleSimulate = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setSimulationStep(0)

    // Animate through simulation steps
    const steps = [
      'Detecting tsunami event...',
      'Calculating wave propagation...',
      'Scanning vessel positions...',
      'Assessing threat levels...',
      'Creating alerts...',
      'Triggering escalation...'
    ]

    let currentStep = 0
    const stepInterval = setInterval(() => {
      if (currentStep < steps.length) {
        setSimulationStep(currentStep)
        currentStep++
      } else {
        clearInterval(stepInterval)
      }
    }, 800)

    try {
      const response = await fetch('/api/test/simulate-tsunami', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epicenterLat: parseFloat(epicenterLat),
          epicenterLon: parseFloat(epicenterLon),
          magnitude: parseFloat(magnitude),
          sendNotifications: sendReal
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Simulation failed')
      }

      clearInterval(stepInterval)
      setSimulationStep(steps.length)
      setResult(data)
    } catch (err: any) {
      clearInterval(stepInterval)
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-300'
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-300'
      case 'moderate': return 'text-yellow-600 bg-yellow-100 border-yellow-300'
      default: return 'text-green-600 bg-green-100 border-green-300'
    }
  }

  const simulationSteps = [
    { icon: Waves, label: 'Detecting event', color: 'text-blue-600' },
    { icon: TrendingUp, label: 'Wave propagation', color: 'text-indigo-600' },
    { icon: Ship, label: 'Scanning vessels', color: 'text-cyan-600' },
    { icon: Gauge, label: 'Threat assessment', color: 'text-purple-600' },
    { icon: AlertTriangle, label: 'Creating alerts', color: 'text-orange-600' },
    { icon: Radio, label: 'Escalation', color: 'text-red-600' }
  ]

  return (
    <AppLayout title="Tsunami Simulation" breadcrumbs={[{ label: 'Tsunami Simulation' }]}>
      <div className="max-w-7xl mx-auto space-y-8 py-8">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 text-white shadow-2xl shadow-blue-500/50 mb-4">
            <Waves className="h-10 w-10" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            End-to-End Tsunami Simulation
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Realistic earthquake-generated tsunami scenario with automatic vessel detection, 
            threat assessment, and intelligent multi-channel escalation
          </p>
          
          {/* Interactive Map View Button */}
          <div className="flex justify-center mt-6">
            <Button
              onClick={() => router.push('/dashboard/simulate-tsunami-map')}
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold px-8 py-6 text-lg shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-all"
            >
              <Globe className="mr-2 h-6 w-6" />
              Launch Interactive World Map
            </Button>
          </div>
        </div>

        {/* Configuration Card */}
        <Card className="border-2 shadow-2xl bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Tsunami Event Parameters</CardTitle>
                <CardDescription className="text-base">
                  Configure the epicenter location and magnitude
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Latitude */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Epicenter Latitude
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={epicenterLat}
                  onChange={(e) => setEpicenterLat(e.target.value)}
                  className="w-full h-12 px-4 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg"
                  placeholder="35.5"
                />
                <p className="text-xs text-gray-500">Degrees North (-90 to 90)</p>
              </div>

              {/* Longitude */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                  Epicenter Longitude
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={epicenterLon}
                  onChange={(e) => setEpicenterLon(e.target.value)}
                  className="w-full h-12 px-4 border-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-lg"
                  placeholder="139.8"
                />
                <p className="text-xs text-gray-500">Degrees East (-180 to 180)</p>
              </div>

              {/* Magnitude */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-purple-600" />
                  Earthquake Magnitude
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="5"
                  max="9"
                  value={magnitude}
                  onChange={(e) => setMagnitude(e.target.value)}
                  className="w-full h-12 px-4 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-lg"
                  placeholder="7.5"
                />
                <p className="text-xs text-gray-500">Richter scale (5.0 - 9.0)</p>
              </div>
            </div>

            {/* Preset Scenarios */}
            <div className="border-t-2 pt-6">
              <label className="text-sm font-bold text-gray-700 mb-3 block">Quick Scenarios</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEpicenterLat('35.5')
                    setEpicenterLon('139.8')
                    setMagnitude('7.5')
                  }}
                  className="h-auto py-3 flex-col gap-1 hover:bg-blue-50 hover:border-blue-300"
                >
                  <span className="font-bold">🗾 Tokyo Bay</span>
                  <span className="text-xs text-gray-500">Mag 7.5</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEpicenterLat('38.3')
                    setEpicenterLon('142.4')
                    setMagnitude('9.0')
                  }}
                  className="h-auto py-3 flex-col gap-1 hover:bg-red-50 hover:border-red-300"
                >
                  <span className="font-bold">🌊 Tohoku</span>
                  <span className="text-xs text-gray-500">Mag 9.0</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEpicenterLat('-8.5')
                    setEpicenterLon('119.5')
                    setMagnitude('7.0')
                  }}
                  className="h-auto py-3 flex-col gap-1 hover:bg-orange-50 hover:border-orange-300"
                >
                  <span className="font-bold">🏝️ Indonesia</span>
                  <span className="text-xs text-gray-500">Mag 7.0</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEpicenterLat('36.1')
                    setEpicenterLon('-121.9')
                    setMagnitude('6.5')
                  }}
                  className="h-auto py-3 flex-col gap-1 hover:bg-yellow-50 hover:border-yellow-300"
                >
                  <span className="font-bold">🌉 California</span>
                  <span className="text-xs text-gray-500">Mag 6.5</span>
                </Button>
              </div>
            </div>

            {/* Send Real Toggle */}
            <div className={`relative overflow-hidden border-2 rounded-xl p-5 transition-all duration-300 ${
              sendReal 
                ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-300 shadow-lg shadow-orange-200/50' 
                : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
            }`}>
              <label className="relative flex items-start gap-4 cursor-pointer">
                <div className="flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={sendReal}
                    onChange={(e) => setSendReal(e.target.checked)}
                    className="w-5 h-5 text-orange-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-orange-500 cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <div className={`font-bold text-lg flex items-center gap-2 mb-1 ${sendReal ? 'text-orange-900' : 'text-gray-700'}`}>
                    {sendReal ? (
                      <>
                        <Radio className="h-5 w-5 animate-pulse" />
                        Live Mode: Send Real Notifications
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        Simulation Mode: Dry Run
                      </>
                    )}
                  </div>
                  <p className={`text-sm ${sendReal ? 'text-orange-800' : 'text-gray-600'}`}>
                    {sendReal ? 
                      '⚠️ Real SMS/Email/WhatsApp messages will be sent via Twilio & SendGrid' :
                      '✅ Safe simulation - no actual messages sent'
                    }
                  </p>
                </div>
              </label>
            </div>

            {/* Run Button */}
            <Button
              onClick={handleSimulate}
              disabled={loading || !epicenterLat || !epicenterLon || !magnitude}
              className={`w-full h-16 text-xl font-bold shadow-2xl transition-all duration-300 ${
                sendReal
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-orange-500/50'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-blue-500/50'
              } hover:shadow-2xl hover:scale-[1.02]`}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                  Running Simulation...
                </>
              ) : (
                <>
                  <Waves className="mr-3 h-7 w-7" />
                  {sendReal ? 'Run Live Simulation' : 'Run Tsunami Simulation'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Simulation Progress */}
        {loading && (
          <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl animate-in slide-in-from-top-4 duration-500">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Processing Simulation...
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {simulationSteps.map((step, idx) => {
                    const Icon = step.icon
                    const isActive = idx === simulationStep
                    const isComplete = idx < simulationStep

                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-500 ${
                          isActive
                            ? 'bg-white border-blue-500 shadow-lg scale-105'
                            : isComplete
                            ? 'bg-green-50 border-green-300'
                            : 'bg-gray-50 border-gray-200 opacity-50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isComplete
                            ? 'bg-green-500 text-white'
                            : isActive
                            ? `${step.color} bg-blue-100`
                            : 'bg-gray-200 text-gray-400'
                        }`}>
                          {isComplete ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Icon className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
                          )}
                        </div>
                        <span className={`text-sm font-semibold ${
                          isActive ? 'text-blue-900' : isComplete ? 'text-green-900' : 'text-gray-500'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="border-2 border-red-300 bg-gradient-to-br from-red-50 to-pink-50 shadow-lg animate-in slide-in-from-top-2 duration-500">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h4 className="font-bold text-red-900 mb-1">Simulation Error</h4>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && result.success && (
          <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Waves className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-blue-900">{result.simulation?.magnitude || 0}</div>
                    <div className="text-sm text-blue-700 font-semibold">Magnitude</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Ship className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-purple-900">{result.simulation?.affectedVessels?.length || 0}</div>
                    <div className="text-sm text-purple-700 font-semibold">Vessels at Risk</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-orange-900">{result.simulation?.summary?.alertsCreated || 0}</div>
                    <div className="text-sm text-orange-700 font-semibold">Alerts Created</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Radio className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-green-900">{result.simulation?.summary?.notificationsSent || 0}</div>
                    <div className="text-sm text-green-700 font-semibold">
                      {result.dryRun ? 'Simulated' : 'Sent'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Affected Vessels */}
            {result.simulation?.affectedVessels && result.simulation.affectedVessels.length > 0 && (
              <Card className="border-2 border-purple-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b-2">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Ship className="h-6 w-6 text-purple-600" />
                    Affected Vessels ({result.simulation.affectedVessels.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-4">
                    {result.simulation.affectedVessels.map((vessel, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-lg">
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-lg text-gray-900">{vessel.vessel.name}</h4>
                              <p className="text-sm text-gray-500 font-mono">{vessel.vessel.mmsi}</p>
                            </div>
                          </div>
                          <div className={`px-4 py-2 rounded-full border-2 font-bold text-sm ${getSeverityColor(vessel.severity)}`}>
                            {vessel.severity.toUpperCase()}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
                          <div>
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Distance</div>
                            <div className="text-lg font-bold text-gray-900">{vessel.distance} km</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Wave Height</div>
                            <div className="text-lg font-bold text-blue-600">{vessel.waveHeight} m</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">ETA</div>
                            <div className="text-lg font-bold text-orange-600 flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {vessel.eta} min
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Position</div>
                            <div className="text-xs font-mono text-gray-700">
                              {vessel.vessel?.position?.lat?.toFixed(2) || '0.00'}°N, {vessel.vessel?.position?.lon?.toFixed(2) || '0.00'}°E
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Simulation Logs */}
            {result.simulation?.logs && result.simulation.logs.length > 0 && (
              <Card className="border-2 border-gray-200 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b-2">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    Simulation Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <pre className="bg-gray-900 text-green-400 p-6 rounded-xl overflow-x-auto font-mono text-sm leading-relaxed shadow-inner">
                    {result.simulation.logs.join('\n')}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
