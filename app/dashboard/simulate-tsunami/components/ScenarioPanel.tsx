'use client'

import { Scenario } from '../types'
import { SCENARIOS } from '../scenarios'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

type ScenarioPanelProps = {
  selectedScenario: Scenario | null
  onSelectScenario: (scenario: Scenario) => void
  isSimulating: boolean
}

export function ScenarioPanel({ selectedScenario, onSelectScenario, isSimulating }: ScenarioPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <>
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute left-4 top-20 z-[1001] px-3 py-2 bg-gradient-to-r from-cyan-500/90 to-blue-500/90 backdrop-blur-xl border border-cyan-400/50 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 group"
        aria-label={isCollapsed ? 'Expand scenarios' : 'Collapse scenarios'}
        title={isCollapsed ? 'Show Scenarios' : 'Hide Scenarios'}
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <>
              <ChevronRight className="w-5 h-5 text-white" />
              <span className="text-xs font-semibold text-white">Scenarios</span>
            </>
          ) : (
            <ChevronLeft className="w-5 h-5 text-white" />
          )}
        </div>
      </button>

      {/* Panel */}
      <div
        className={`absolute left-4 top-36 z-[1000] w-64 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 ${
          isCollapsed ? '-translate-x-[280px]' : 'translate-x-0'
        }`}
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🗺️</span>
            <h3 className="text-lg font-semibold text-white">Scenarios</h3>
          </div>

          <div className="space-y-2">
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => onSelectScenario(scenario)}
                disabled={isSimulating}
                className={`w-full text-left p-4 rounded-xl transition-all border ${
                  selectedScenario?.id === scenario.id
                    ? 'bg-cyan-500/20 border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60 hover:border-white/10'
                } ${isSimulating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{scenario.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{scenario.name}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {scenario.epicenter.lat.toFixed(1)}°N, {Math.abs(scenario.epicenter.lon).toFixed(1)}°
                      {scenario.epicenter.lon >= 0 ? 'E' : 'W'}
                    </div>
                    <div className="text-xs text-cyan-400 mt-0.5">Mag {scenario.magnitude.toFixed(1)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedScenario && (
            <div className="mt-4 p-3 bg-slate-800/40 rounded-lg border border-white/5">
              <p className="text-xs text-slate-300">{selectedScenario.description}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
