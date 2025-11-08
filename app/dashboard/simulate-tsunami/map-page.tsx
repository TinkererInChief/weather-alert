'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Scenario, VesselMarker, SimulationResult } from './types'
import { SCENARIOS } from './scenarios'
import CustomScenarioPanel from './components/CustomScenarioPanel'
import { SimulationLog } from './components/SimulationLog'
import { ControlBar } from './components/ControlBar'
import { ResultsSummary } from './components/ResultsSummary'
import { EscalationMatrixModal } from './components/EscalationMatrixModal'
import { EscalationSummaryWidget } from './components/EscalationSummaryWidget'
import { useAudio } from '@/lib/audio/use-audio'

// Dynamic import to avoid SSR issues with Leaflet
const TsunamiMapView = dynamic(
  () => import('./components/TsunamiMapView').then(mod => mod.TsunamiMapView),
  { ssr: false }
)

export default function TsunamiSimulationMapPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const audio = useAudio()
  
  // Detect recording mode
  const isRecording = searchParams.get('record') === '1'
  const autoStart = searchParams.get('autoStart') === '1'
  const scenarioIdParam = searchParams.get('scenarioId')
  
  // State
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [isDryRun, setIsDryRun] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [vessels, setVessels] = useState<VesselMarker[]>([])
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [showWaves, setShowWaves] = useState(false)
  const [waveRadius, setWaveRadius] = useState(0)
  const [showEscalationMatrix, setShowEscalationMatrix] = useState(false)

  // Recording mode setup - Set IMMEDIATELY on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as any
      
      // Always set recording ready flag if record param exists
      const urlParams = new URLSearchParams(window.location.search)
      const isRecordMode = urlParams.get('record') === '1'
      
      if (isRecordMode) {
        win.__RECORDING_READY__ = true
        win.__RECORDING_EVENTS__ = []
        console.log('📹 Recording mode enabled - Ready signal set')
      }
    }
  }, []) // Empty deps - run only once on mount

  // Load all vessels on mount
  useEffect(() => {
    loadAllVessels()
  }, [])

  // Auto-select scenario from URL parameter
  useEffect(() => {
    if (scenarioIdParam && !selectedScenario) {
      const scenario = SCENARIOS.find(s => s.id === scenarioIdParam)
      if (scenario) {
        console.log(`📍 Auto-selecting scenario: ${scenario.name}`)
        setSelectedScenario(scenario)
      } else {
        console.warn(`⚠️ Scenario not found: ${scenarioIdParam}`)
      }
    }
  }, [scenarioIdParam, selectedScenario])

  // Auto-start simulation in recording mode
  useEffect(() => {
    if (autoStart && selectedScenario && !isSimulating && vessels.length > 0) {
      console.log('🎬 Auto-starting simulation for recording...')
      setTimeout(() => {
        handleRunSimulation()
      }, 1000)
    }
  }, [autoStart, selectedScenario, isSimulating, vessels])

  // Track recording events by creating wrapper functions
  const recordAudioEvent = (event: string) => {
    if (isRecording && typeof window !== 'undefined') {
      const win = window as any
      win.__RECORDING_EVENTS__.push({
        timestamp: performance.now(),
        type: 'audio',
        event
      })
    }
  }

  const recordTTSEvent = (text: string, severity?: string) => {
    if (isRecording && typeof window !== 'undefined') {
      const win = window as any
      win.__RECORDING_EVENTS__.push({
        timestamp: performance.now(),
        type: 'tts',
        text,
        severity
      })
    }
  }

  const loadAllVessels = async () => {
    try {
      const response = await fetch('/api/test/vessels')
      if (response.ok) {
        const data = await response.json()
        console.log('📍 Raw vessels data:', data.vessels?.length || 0)
        const vesselMarkers: VesselMarker[] = data.vessels
          .filter((v: any) => v.position)
          .map((v: any) => ({
            id: v.id,
            name: v.name || v.mmsi,
            mmsi: v.mmsi,
            position: {
              lat: v.position.latitude,
              lon: v.position.longitude
            }
          }))
        console.log('🚢 Loaded vessels for map:', vesselMarkers.length, vesselMarkers)
        setVessels(vesselMarkers)
      }
    } catch (error) {
      console.error('Failed to load vessels:', error)
    }
  }

  const handleRunSimulation = async () => {
    if (!selectedScenario) return

    // Play simulation start sound
    recordAudioEvent('simulation:start')
    audio.play('simulation:start')

    setIsSimulating(true)
    setLogs([])
    setSimulationResult(null)
    setShowWaves(true)
    setWaveRadius(0)

    try {
      const response = await fetch('/api/test/simulate-tsunami', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epicenterLat: selectedScenario.epicenter.lat,
          epicenterLon: selectedScenario.epicenter.lon,
          magnitude: selectedScenario.magnitude,
          sendNotifications: !isDryRun,
          // Enhanced physics parameters
          depth: selectedScenario.depth,
          faultType: selectedScenario.faultType,
          faultStrike: selectedScenario.faultStrike,
          faultLength: selectedScenario.faultLength,
          faultWidth: selectedScenario.faultWidth
        })
      })

      if (!response.ok) {
        throw new Error('Simulation failed')
      }

      const result: SimulationResult = await response.json()
      
      // Run animations in parallel, with waves timed to finish after logs
      const animateWaves = async () => {
        if (selectedScenario && result.simulation?.logs) {
          const maxRadius = 1000 // km
          const logCount = result.simulation.logs.length
          const totalLogTime = logCount * 50 // 50ms per log
          const steps = 50
          const stepSize = maxRadius / steps
          const stepDelay = (totalLogTime + 500) / steps // Add 500ms buffer to finish after logs
          
          for (let i = 0; i <= steps; i++) {
            await new Promise(resolve => setTimeout(resolve, stepDelay))
            setWaveRadius(i * stepSize)
          }
        }
      }

      const animateLogs = async () => {
        if (result.simulation?.logs) {
          for (let i = 0; i < result.simulation.logs.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 50))
            setLogs(prev => [...prev, result.simulation!.logs[i]])
          }
        }
      }

      // Start both animations in parallel
      Promise.all([animateWaves(), animateLogs()])

      // Update vessel markers with severity
      if (result.simulation?.affectedVessels) {
        let firstAffected = false
        let hasCritical = false
        
        setVessels(prev => {
          const updatedVessels = [...prev]
          result.simulation!.affectedVessels.forEach((affected: any, idx: number) => {
            const index = updatedVessels.findIndex(v => v.id === affected.vessel.id)
            if (index !== -1 && affected.position) {
              updatedVessels[index] = {
                ...updatedVessels[index],
                distance: affected.distance,
                waveHeight: affected.waveHeight,
                eta: affected.eta,
                severity: affected.severity as any,
                position: {
                  lat: affected.position.latitude,
                  lon: affected.position.longitude
                }
              }
              
              // Track first affected vessel
              if (idx === 0) firstAffected = true
              
              // Track critical vessels
              if (affected.severity?.toLowerCase() === 'critical') {
                hasCritical = true
              }
            }
          })
          return updatedVessels
        })
        
        // Play audio cues
        if (firstAffected) {
          recordAudioEvent('vessel:first_affected')
          audio.play('vessel:first_affected')
        }
        
        if (hasCritical) {
          recordAudioEvent('severity:critical')
          audio.play('severity:critical')
          
          // TTS announcement for critical
          const criticalVessels = result.simulation.affectedVessels.filter((v: any) => 
            v.severity?.toLowerCase() === 'critical'
          )
          if (criticalVessels.length > 0) {
            const vessel = criticalVessels[0].vessel
            const eta = Math.round(criticalVessels[0].eta)
            const ttsText = `Critical alert for ${vessel.name || 'vessel ' + vessel.mmsi}. Estimated arrival time: ${eta} minutes.`
            recordTTSEvent(ttsText, 'critical')
            audio.speak(ttsText, { severity: 'critical' })
          }
        }
      }

      setSimulationResult(result)
      
      // Play completion sound
      recordAudioEvent('simulation:complete')
      audio.play('simulation:complete')

      // Signal recording complete
      if (isRecording && typeof window !== 'undefined') {
        const win = window as any
        win.__SIM_DONE__ = true
        console.log('✅ Simulation complete signal sent for recording')
      }
    } catch (error) {
      console.error('Simulation error:', error)
      setLogs(prev => [...prev, `❌ Simulation failed: ${error}`])
      recordAudioEvent('ui:error')
      audio.play('ui:error')
    } finally {
      setIsSimulating(false)
    }
  }

  const handleRunCustomScenario = async (customScenario: any) => {
    // Play simulation start sound
    recordAudioEvent('simulation:start')
    audio.play('simulation:start')

    setIsSimulating(true)
    setLogs([])
    setSimulationResult(null)
    setShowWaves(true)
    setWaveRadius(0)

    try {
      const response = await fetch('/api/test/simulate-tsunami', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epicenterLat: customScenario.epicenterLat,
          epicenterLon: customScenario.epicenterLon,
          magnitude: customScenario.magnitude,
          sendNotifications: !isDryRun,
          // Optional advanced params
          ...(customScenario.depth && { depth: customScenario.depth }),
          ...(customScenario.faultType && { faultType: customScenario.faultType }),
          ...(customScenario.faultStrike && { faultStrike: customScenario.faultStrike }),
          ...(customScenario.faultLength && { faultLength: customScenario.faultLength }),
          ...(customScenario.faultWidth && { faultWidth: customScenario.faultWidth }),
        })
      })

      if (!response.ok) {
        throw new Error('Simulation failed')
      }

      const result: SimulationResult = await response.json()
      
      // Create temporary scenario for display
      const tempScenario: Scenario = {
        id: 'custom',
        name: customScenario.name,
        emoji: '⚡',
        region: 'Custom Scenario',
        description: customScenario.description || 'User-defined scenario',
        epicenter: {
          lat: customScenario.epicenterLat,
          lon: customScenario.epicenterLon
        },
        magnitude: customScenario.magnitude,
        depth: customScenario.depth || 30,
        faultLength: customScenario.faultLength || 200,
        faultWidth: customScenario.faultWidth || 100,
        faultStrike: customScenario.faultStrike || 0,
        faultType: customScenario.faultType || 'thrust'
      }
      setSelectedScenario(tempScenario)
      
      // Run animations and update vessels (same as regular simulation)
      const animateWaves = async () => {
        const maxRadius = 1000
        const logCount = result.simulation?.logs?.length || 0
        const totalLogTime = logCount * 50
        const steps = 50
        const stepSize = maxRadius / steps
        const stepDelay = (totalLogTime + 500) / steps
        
        for (let i = 0; i <= steps; i++) {
          await new Promise(resolve => setTimeout(resolve, stepDelay))
          setWaveRadius(i * stepSize)
        }
      }

      const animateLogs = async () => {
        if (result.simulation?.logs) {
          for (let i = 0; i < result.simulation.logs.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 50))
            setLogs(prev => [...prev, result.simulation!.logs[i]])
          }
        }
      }

      Promise.all([animateWaves(), animateLogs()])

      // Update vessel markers with severity
      if (result.simulation?.affectedVessels) {
        let firstAffected = false
        let hasCritical = false
        
        setVessels(prev => {
          const updatedVessels = [...prev]
          result.simulation!.affectedVessels.forEach((affected: any, idx: number) => {
            const index = updatedVessels.findIndex(v => v.id === affected.vessel.id)
            if (index !== -1 && affected.position) {
              updatedVessels[index] = {
                ...updatedVessels[index],
                distance: affected.distance,
                waveHeight: affected.waveHeight,
                eta: affected.eta,
                severity: affected.severity as any,
                position: {
                  lat: affected.position.latitude,
                  lon: affected.position.longitude
                }
              }
              
              if (idx === 0) firstAffected = true
              if (affected.severity?.toLowerCase() === 'critical') {
                hasCritical = true
              }
            }
          })
          return updatedVessels
        })
        
        if (firstAffected) {
          recordAudioEvent('vessel:first_affected')
          audio.play('vessel:first_affected')
        }
        
        if (hasCritical) {
          recordAudioEvent('severity:critical')
          audio.play('severity:critical')
          
          const criticalVessels = result.simulation.affectedVessels.filter((v: any) => 
            v.severity?.toLowerCase() === 'critical'
          )
          if (criticalVessels.length > 0) {
            const vessel = criticalVessels[0].vessel
            const eta = Math.round(criticalVessels[0].eta)
            const ttsText = `Critical alert for ${vessel.name || 'vessel ' + vessel.mmsi}. Estimated arrival time: ${eta} minutes.`
            recordTTSEvent(ttsText, 'critical')
            audio.speak(ttsText, { severity: 'critical' })
          }
        }
      }

      setSimulationResult(result)
      
      recordAudioEvent('simulation:complete')
      audio.play('simulation:complete')

      if (isRecording && typeof window !== 'undefined') {
        const win = window as any
        win.__SIM_DONE__ = true
        console.log('✅ Custom simulation complete signal sent for recording')
      }
    } catch (error: any) {
      console.error('Custom scenario failed:', error)
      setLogs(prev => [...prev, `❌ Simulation failed: ${error.message}`])
      recordAudioEvent('ui:error')
      audio.play('ui:error')
    } finally {
      setIsSimulating(false)
    }
  }

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    }
    router.push('/dashboard/simulate-tsunami')
  }

  const handleViewDetails = () => {
    setShowEscalationMatrix(true)
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Control Bar */}
      <ControlBar
        selectedScenario={selectedScenario}
        isSimulating={isSimulating}
        isDryRun={isDryRun}
        isFullscreen={isFullscreen}
        onToggleDryRun={() => setIsDryRun(!isDryRun)}
        onToggleFullscreen={handleToggleFullscreen}
        onClose={handleClose}
        onRunSimulation={handleRunSimulation}
      />

      {/* Map View */}
      <div className="absolute inset-0 pt-20">
        <TsunamiMapView
          selectedScenario={selectedScenario}
          vessels={vessels}
          showWaves={showWaves}
          waveRadius={waveRadius}
        />
        
        {/* Vessel Count Indicator */}
        <div className="absolute bottom-4 right-4 z-[1000] px-3 py-2 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-lg text-xs text-slate-300">
          🚢 {vessels.length} vessel{vessels.length !== 1 ? 's' : ''} loaded
        </div>
      </div>

      {/* Custom Scenario Panel */}
      <div className="absolute left-4 top-24 z-[1000] w-96 max-h-[calc(100vh-120px)] overflow-y-auto">
        <CustomScenarioPanel
          onRunScenario={handleRunCustomScenario}
          disabled={isSimulating}
        />
      </div>

      {/* Simulation Log */}
      <SimulationLog
        logs={logs}
        isSimulating={isSimulating}
      />

      {/* Results Summary */}
      {simulationResult && !isSimulating && (
        <ResultsSummary
          result={simulationResult}
          isDryRun={isDryRun}
          onViewDetails={handleViewDetails}
          onRunAgain={selectedScenario ? handleRunSimulation : undefined}
          selectedScenarioId={selectedScenario?.id}
        />
      )}

      {/* Escalation Summary Widget */}
      {simulationResult && !isSimulating && simulationResult.simulation?.alerts && (
        <EscalationSummaryWidget
          alerts={simulationResult.simulation.alerts}
          isDryRun={isDryRun}
          onViewFull={handleViewDetails}
        />
      )}

      {/* Escalation Matrix Modal */}
      <EscalationMatrixModal
        isOpen={showEscalationMatrix}
        onClose={() => setShowEscalationMatrix(false)}
        alerts={simulationResult?.simulation?.alerts || []}
        isDryRun={isDryRun}
      />
    </div>
  )
}
