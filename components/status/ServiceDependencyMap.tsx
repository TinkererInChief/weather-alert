'use client'

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

export default function ServiceDependencyMap({ services }: ServiceDependencyMapProps) {
  // Define your service topology
  const nodes: ServiceNode[] = [
    // Layer 0: External data sources
    { id: 'usgs', name: 'USGS API', icon: Globe, status: services.usgs?.status as any || 'unknown', layer: 0, dependencies: [] },
    { id: 'noaa', name: 'NOAA', icon: Wifi, status: services.noaa?.status as any || 'unknown', layer: 0, dependencies: [] },
    
    // Layer 2: Infrastructure (depends on nothing)
    { id: 'database', name: 'Database', icon: Database, status: services.database?.status as any || 'unknown', layer: 2, dependencies: [] },
    { id: 'redis', name: 'Redis', icon: Activity, status: services.redis?.status as any || 'unknown', layer: 2, dependencies: [] },
    
    // Layer 1: Core services (depend on infrastructure)
    { id: 'core', name: 'Alert Engine', icon: AlertCircle, status: 'healthy', layer: 1, dependencies: ['database', 'redis', 'usgs', 'noaa'] },
    
    // Layer 3: Notification channels (depend on core)
    { id: 'sms', name: 'SMS', icon: MessageSquare, status: services.sms?.status as any || 'unknown', layer: 3, dependencies: ['core', 'database'] },
    { id: 'email', name: 'Email', icon: Mail, status: services.email?.status as any || 'unknown', layer: 3, dependencies: ['core', 'database'] },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, status: services.whatsapp?.status as any || 'unknown', layer: 3, dependencies: ['core', 'database'] },
    { id: 'voice', name: 'Voice', icon: Phone, status: services.voice?.status as any || 'unknown', layer: 3, dependencies: ['core', 'database'] },
  ]

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

  return (
    <div className="relative p-8 bg-slate-50 rounded-xl border border-slate-200 overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Layer labels */}
        <div className="flex justify-around mb-8 text-xs font-medium text-slate-500">
          <span>External Sources</span>
          <span>Core Engine</span>
          <span>Infrastructure</span>
          <span>Notification Channels</span>
        </div>

        {/* Service nodes in layers */}
        <div className="flex justify-around items-start gap-8">
          {layers.map((layerNodes, layerIdx) => (
            <div key={layerIdx} className="flex flex-col gap-4 items-center">
              {layerNodes.map((node) => {
                const Icon = node.icon
                return (
                  <div
                    key={node.id}
                    className={`relative group px-4 py-3 rounded-lg border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${getStatusColor(node.status)}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.name} - ${node.status}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium whitespace-nowrap">{node.name}</span>
                      <div className={`w-2 h-2 rounded-full ${getStatusDot(node.status)}`} />
                    </div>
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      <div className="font-semibold">{node.name}</div>
                      <div className="text-slate-300">Status: {node.status}</div>
                      {node.dependencies.length > 0 && (
                        <div className="text-slate-400 text-xs mt-1">
                          Depends on: {node.dependencies.join(', ')}
                        </div>
                      )}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Connection lines (simplified - you can make these more sophisticated with SVG) */}
        <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          {/* Draw dependency arrows here if needed */}
        </svg>

        {/* Legend */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-600">Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-slate-600">Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-slate-600">Critical</span>
          </div>
        </div>

        {/* Impact Analysis */}
        {nodes.some(n => n.status === 'critical' || n.status === 'warning') && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Impact Analysis</h4>
            <ul className="text-xs text-yellow-800 space-y-1">
              {nodes
                .filter(n => n.status === 'critical')
                .map(n => {
                  const affected = nodes.filter(other => 
                    other.dependencies.includes(n.id)
                  )
                  return (
                    <li key={n.id}>
                      <strong>{n.name}</strong> is down → May affect: {
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
