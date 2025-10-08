'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Database, Activity, MessageSquare, Mail, Globe, MessageCircle, Phone, Wifi, AlertCircle } from 'lucide-react'

type ServiceNode = {
  id: string
  name: string
  icon: any
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  layer: number // 0 = external, 1 = core, 2 = infrastructure, 3 = external
  dependencies: string[] // IDs of services this depends on
}

type ServiceDependencyMapProps = {
  services: Record<string, { status: string }>
}

type NodePosition = {
  x: number
  y: number
  width: number
  height: number
}

export default function ServiceDependencyMap({ services }: ServiceDependencyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({})
  // Define your service topology
  const nodes: ServiceNode[] = useMemo(() => [
    // Layer 0: External data sources
    { id: 'usgs', name: 'USGS', icon: Globe, status: services.usgs?.status as any || 'unknown', layer: 0, dependencies: [] },
    { id: 'emsc', name: 'EMSC', icon: Globe, status: services.emsc?.status as any || 'unknown', layer: 0, dependencies: [] },
    { id: 'jma', name: 'JMA', icon: Globe, status: services.jma?.status as any || 'unknown', layer: 0, dependencies: [] },
    { id: 'noaa', name: 'NOAA', icon: Wifi, status: services.noaa?.status as any || 'unknown', layer: 0, dependencies: [] },
    { id: 'ptwc', name: 'PTWC', icon: Wifi, status: services.ptwc?.status as any || 'unknown', layer: 0, dependencies: [] },
    { id: 'iris', name: 'IRIS', icon: Globe, status: services.iris?.status as any || 'unknown', layer: 0, dependencies: [] },
    
    // Layer 2: Infrastructure (depends on nothing)
    { id: 'database', name: 'Database', icon: Database, status: services.database?.status as any || 'unknown', layer: 2, dependencies: [] },
    { id: 'redis', name: 'Redis', icon: Activity, status: services.redis?.status as any || 'unknown', layer: 2, dependencies: [] },
    
    // Layer 1: Core services (depend on infrastructure and external sources)
    { id: 'core', name: 'Alert Engine', icon: AlertCircle, status: 'healthy', layer: 1, dependencies: ['database', 'redis', 'usgs', 'emsc', 'jma', 'noaa', 'ptwc', 'iris'] },
    
    // Layer 3: Notification channels (depend on core)
    { id: 'sms', name: 'SMS', icon: MessageSquare, status: services.sms?.status as any || 'unknown', layer: 3, dependencies: ['core', 'database'] },
    { id: 'email', name: 'Email', icon: Mail, status: services.email?.status as any || 'unknown', layer: 3, dependencies: ['core', 'database'] },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, status: services.whatsapp?.status as any || 'unknown', layer: 3, dependencies: ['core', 'database'] },
    { id: 'voice', name: 'Voice', icon: Phone, status: services.voice?.status as any || 'unknown', layer: 3, dependencies: ['core', 'database'] },
  ], [services])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'border-green-500 bg-green-50 text-green-900'
      case 'warning': return 'border-yellow-500 bg-yellow-50 text-yellow-900'
      case 'critical': return 'border-red-500 bg-red-50 text-red-900'
      default: return 'border-slate-300 bg-slate-50 text-slate-900'
    }
  }

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'critical': return 'bg-red-500'
      default: return 'bg-slate-400'
    }
  }

  // Group nodes by layer
  const layers = [
    nodes.filter(n => n.layer === 0),
    nodes.filter(n => n.layer === 1),
    nodes.filter(n => n.layer === 2),
    nodes.filter(n => n.layer === 3),
  ]

  // Calculate node positions after render
  useEffect(() => {
    if (!containerRef.current) return
    
    const positions: Record<string, NodePosition> = {}
    const nodeElements = containerRef.current.querySelectorAll('[data-node-id]')
    
    nodeElements.forEach((el) => {
      const nodeId = el.getAttribute('data-node-id')
      if (nodeId) {
        const rect = el.getBoundingClientRect()
        const containerRect = containerRef.current!.getBoundingClientRect()
        positions[nodeId] = {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
        }
      }
    })
    
    setNodePositions(positions)
  }, [nodes])

  const getConnectionPath = (fromId: string, toId: string) => {
    const from = nodePositions[fromId]
    const to = nodePositions[toId]
    
    if (!from || !to) return ''
    
    // Calculate control points for curved arrow
    const midX = (from.x + to.x) / 2
    const curveOffset = 20
    
    return `M ${from.x} ${from.y} Q ${midX} ${from.y + curveOffset}, ${to.x} ${to.y}`
  }

  const getArrowColor = (node: ServiceNode) => {
    switch (node.status) {
      case 'healthy': return '#22c55e'
      case 'warning': return '#eab308'
      case 'critical': return '#ef4444'
      default: return '#94a3b8'
    }
  }

  return (
    <div ref={containerRef} className="relative p-3 sm:p-4 md:p-8 bg-slate-50 rounded-xl border border-slate-200 overflow-x-auto">
      <div className="min-w-[280px] sm:min-w-[320px] md:min-w-[900px] lg:min-w-[1100px] relative">
        {/* Layer labels - hide on mobile, show on desktop */}
        <div className="hidden lg:flex justify-around mb-8 text-xs font-medium text-slate-500">
          <span>External Sources</span>
          <span>Core Engine</span>
          <span>Infrastructure</span>
          <span>Notification Channels</span>
        </div>

        {/* SVG for connection lines - render behind nodes (desktop only for clarity) */}
        <svg 
          className="hidden lg:block absolute inset-0 pointer-events-none" 
          style={{ zIndex: 0 }}
          width="100%" 
          height="100%"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
            </marker>
            {nodes.map((node) => (
              <marker
                key={node.id}
                id={`arrowhead-${node.id}`}
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill={getArrowColor(node)} />
              </marker>
            ))}
          </defs>
          
          {/* Draw dependency arrows */}
          {nodes.map((node) => 
            node.dependencies.map((depId) => {
              const path = getConnectionPath(depId, node.id)
              if (!path) return null
              
              return (
                <g key={`${depId}-${node.id}`}>
                  <path
                    d={path}
                    fill="none"
                    stroke={getArrowColor(node)}
                    strokeWidth="2"
                    strokeOpacity="0.4"
                    markerEnd={`url(#arrowhead-${node.id})`}
                  />
                </g>
              )
            })
          )}
        </svg>

        {/* Service nodes in layers */}
        <div className="flex flex-col lg:flex-row lg:justify-around items-start gap-3 sm:gap-4 lg:gap-6 relative z-10">
          {layers.map((layerNodes, layerIdx) => (
            <div key={layerIdx} className="flex flex-col gap-2 sm:gap-3 items-stretch lg:items-center w-full lg:w-auto">
              {/* Mobile/Tablet layer label */}
              <div className="lg:hidden text-xs font-semibold text-slate-600 mb-1 px-1">
                {layerIdx === 0 && '📡 External Sources'}
                {layerIdx === 1 && '⚙️ Core Engine'}
                {layerIdx === 2 && '🗄️ Infrastructure'}
                {layerIdx === 3 && '📨 Notification Channels'}
              </div>
              
              {/* For external sources layer (0), use grid on mobile/tablet */}
              <div className={layerIdx === 0 ? 'grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-col gap-2 sm:gap-3' : 'flex flex-col gap-2 sm:gap-3'}>
                {layerNodes.map((node) => {
                  const Icon = node.icon
                  return (
                    <div
                      key={node.id}
                      data-node-id={node.id}
                      className={`relative group px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-3 rounded-lg border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${getStatusColor(node.status)}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${node.name} - ${node.status}`}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 justify-center lg:justify-start">
                        <Icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium truncate">{node.name}</span>
                        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${getStatusDot(node.status)}`} />
                      </div>
                      
                      {/* Tooltip on hover - desktop only */}
                      <div className="hidden lg:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                        <div className="font-semibold">{node.name}</div>
                        <div className="text-slate-300">Status: {node.status}</div>
                        {node.dependencies.length > 0 && (
                          <div className="text-slate-400 text-xs mt-1">
                            Depends on: {node.dependencies.slice(0, 3).join(', ')}{node.dependencies.length > 3 ? '...' : ''}
                          </div>
                        )}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs px-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 flex-shrink-0"></div>
            <span className="text-slate-600">Healthy</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500 flex-shrink-0"></div>
            <span className="text-slate-600">Warning</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 flex-shrink-0"></div>
            <span className="text-slate-600">Critical</span>
          </div>
        </div>

        {/* Impact Analysis */}
        {nodes.some(n => n.status === 'critical' || n.status === 'warning') && (
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-xs sm:text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-1">
              <span>⚠️</span>
              <span>Impact Analysis</span>
            </h4>
            <ul className="text-xs text-yellow-800 space-y-1.5 sm:space-y-2">
              {nodes
                .filter(n => n.status === 'critical')
                .map(n => {
                  const affected = nodes.filter(other => 
                    other.dependencies.includes(n.id)
                  )
                  return (
                    <li key={n.id} className="leading-relaxed">
                      <strong className="font-semibold">{n.name}</strong> is down → May affect: {
                        affected.length > 0 
                          ? affected.map(a => a.name).join(', ')
                          : 'No downstream services'
                      }
                    </li>
                  )
                })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
