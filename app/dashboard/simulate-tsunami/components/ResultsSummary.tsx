'use client'

import { useState, useRef, useEffect } from 'react'
import { Ship, Bell, Send, ArrowRight, RotateCcw, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { SimulationResult } from '../types'
import { RecordingPanel } from './RecordingPanel'

type ResultsSummaryProps = {
  result: SimulationResult
  isDryRun: boolean
  onViewDetails: () => void
  onRunAgain?: () => void
  selectedScenarioId?: string
}

export function ResultsSummary({ result, isDryRun, onViewDetails, onRunAgain, selectedScenarioId }: ResultsSummaryProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const widgetRef = useRef<HTMLDivElement>(null)
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x
        const newY = e.clientY - dragStart.y
        
        // Constrain to viewport
        const maxX = window.innerWidth - (widgetRef.current?.offsetWidth || 0)
        const maxY = window.innerHeight - (widgetRef.current?.offsetHeight || 0)
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        })
      }
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])
  
  // Early return after all hooks
  if (!result.success || !result.simulation) {
    return null
  }

  const { affectedVessels, summary } = result.simulation
  const alertsCreated = summary?.alertsCreated || 0
  const notificationsSent = summary?.notificationsSent || 0

  return (
    <div 
      ref={widgetRef}
      className="absolute z-[999] transition-all"
      style={{
        bottom: position.y === 0 ? 0 : 'auto',
        left: position.x === 0 ? 0 : position.x,
        right: position.x === 0 ? 0 : 'auto',
        top: position.y !== 0 ? position.y : 'auto',
        cursor: isDragging ? 'grabbing' : 'default',
        maxWidth: position.x !== 0 || position.y !== 0 ? '600px' : '100%'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="bg-gradient-to-r from-slate-900/95 via-blue-900/95 to-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-t-lg">
        {/* Header with drag handle and collapse button */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="drag-handle cursor-grab active:cursor-grabbing" title="Drag to move">
              <GripVertical className="w-5 h-5 text-slate-400 hover:text-slate-200" />
            </div>
            <span className="text-sm font-semibold text-white">Simulation Results</span>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>
        </div>
        
        {/* Collapsible Content */}
        {!isCollapsed && (
          <>
            {/* Recording Panel */}
            <div className="px-6 pt-4">
              <RecordingPanel simulationResult={result} scenarioId={selectedScenarioId} />
            </div>
        
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Stats */}
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <Ship className="w-5 h-5 text-purple-400" />
                    <div>
                      <div className="text-2xl font-bold text-white">{affectedVessels.length}</div>
                      <div className="text-xs text-slate-400">Vessels at Risk</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="text-2xl font-bold text-white">{alertsCreated || 0}</div>
                      <div className="text-xs text-slate-400">Alerts Created</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Send className="w-5 h-5 text-green-400" />
                    <div>
                      <div className="text-2xl font-bold text-white">{notificationsSent || 0}</div>
                      <div className="text-xs text-slate-400">
                        Notifications {isDryRun ? 'Simulated' : 'Sent'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  {onRunAgain && (
                    <button
                      onClick={onRunAgain}
                      className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-500/30 flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Run Again
                    </button>
                  )}
                  <button
                    onClick={onViewDetails}
                    className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                  >
                    View Detailed Report
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
