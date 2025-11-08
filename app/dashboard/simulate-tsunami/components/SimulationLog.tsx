'use client'

import { useEffect, useRef, useState } from 'react'
import { Minimize2, Maximize2, Terminal } from 'lucide-react'

type SimulationLogProps = {
  logs: string[]
  isSimulating: boolean
}

export function SimulationLog({ logs, isSimulating }: SimulationLogProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [height, setHeight] = useState(400)
  const logEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logEndRef.current && !isMinimized) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isMinimized])

  const formatLogLine = (line: string) => {
    // Color coding based on content
    if (line.startsWith('🌊') || line.startsWith('✅')) {
      return <span className="text-green-400">{line}</span>
    }
    if (line.startsWith('⚠️') || line.startsWith('🚢')) {
      return <span className="text-yellow-400">{line}</span>
    }
    if (line.startsWith('❌') || line.includes('CRITICAL')) {
      return <span className="text-red-400">{line}</span>
    }
    if (line.startsWith('📍') || line.startsWith('📊')) {
      return <span className="text-cyan-400">{line}</span>
    }
    if (line.startsWith('   ')) {
      return <span className="text-slate-400 ml-4">{line.trim()}</span>
    }
    return <span className="text-slate-300">{line}</span>
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-[1000] px-4 py-2 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-lg hover:bg-slate-800/80 transition-all flex items-center gap-2"
      >
        <Terminal className="w-4 h-4 text-cyan-400" />
        <span className="text-sm text-white">Show Log</span>
        {isSimulating && (
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        )}
      </button>
    )
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 right-4 z-[1000] bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      style={{ width: '480px', height: `${height}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Simulation Log</span>
          {isSimulating && (
            <span className="flex items-center gap-1.5 text-xs text-cyan-400">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              Running
            </span>
          )}
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="p-1 hover:bg-slate-700/50 rounded transition-colors"
          aria-label="Minimize log"
        >
          <Minimize2 className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Log Content */}
      <div className="overflow-y-auto overflow-x-hidden p-4 font-mono text-xs" style={{ height: `${height - 40}px` }}>
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Select a scenario and run simulation</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="leading-relaxed">
                {formatLogLine(log)}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
