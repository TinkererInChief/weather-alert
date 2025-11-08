'use client'

import { Maximize2, Minimize2, X, Waves } from 'lucide-react'
import { Scenario } from '../types'
import { AudioSettingsPopover } from './AudioSettingsPopover'

type ControlBarProps = {
  selectedScenario: Scenario | null
  isSimulating: boolean
  isDryRun: boolean
  isFullscreen: boolean
  onToggleDryRun: () => void
  onToggleFullscreen: () => void
  onClose: () => void
  onRunSimulation: () => void
}

export function ControlBar({
  selectedScenario,
  isSimulating,
  isDryRun,
  isFullscreen,
  onToggleDryRun,
  onToggleFullscreen,
  onClose,
  onRunSimulation
}: ControlBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-[1001] bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Title */}
        <div className="flex items-center gap-3">
          <Waves className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl font-bold text-white">Tsunami Simulation</h1>
        </div>

        {/* Center: Run Button (when scenario selected) */}
        {selectedScenario && !isSimulating && (
          <button
            onClick={onRunSimulation}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all hover:shadow-cyan-500/50 flex items-center gap-2"
          >
            <Waves className="w-4 h-4" />
            Run Simulation
          </button>
        )}

        {isSimulating && (
          <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-cyan-400">Simulation Running...</span>
          </div>
        )}

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Dry Run Toggle */}
          <button
            onClick={onToggleDryRun}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              isDryRun
                ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                : 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
            }`}
          >
            {isDryRun ? '✓ Dry Run' : '⚠️ Live Mode'}
          </button>

          {/* Audio Settings */}
          <AudioSettingsPopover />

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-slate-400" />
            ) : (
              <Maximize2 className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors text-slate-400"
            aria-label="Close simulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
