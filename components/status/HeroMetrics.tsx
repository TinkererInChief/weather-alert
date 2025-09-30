'use client'

import { TrendingUp, Clock, CheckCircle, Zap } from 'lucide-react'

type HeroMetricsProps = {
  uptimePercent: number
  mttrMinutes: number
  incidentsResolved: number
  avgResponseTimeMs: number
}

export default function HeroMetrics({
  uptimePercent,
  mttrMinutes,
  incidentsResolved,
  avgResponseTimeMs,
}: HeroMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Uptime */}
      <div 
        className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
        role="article"
        aria-label="System uptime metric"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-700 mb-1">Uptime</p>
            <p className="text-3xl font-bold text-green-900">{uptimePercent.toFixed(2)}%</p>
            <p className="text-xs text-green-600 mt-1">Last 30 days</p>
          </div>
          <div className="p-3 bg-green-200 rounded-lg">
            <TrendingUp className="h-6 w-6 text-green-700" />
          </div>
        </div>
      </div>

      {/* MTTR */}
      <div 
        className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
        role="article"
        aria-label="Mean time to recovery metric"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700 mb-1">MTTR</p>
            <p className="text-3xl font-bold text-blue-900">
              {mttrMinutes < 1 ? '<1' : Math.round(mttrMinutes)}
              <span className="text-lg">min</span>
            </p>
            <p className="text-xs text-blue-600 mt-1">Mean time to recovery</p>
          </div>
          <div className="p-3 bg-blue-200 rounded-lg">
            <Clock className="h-6 w-6 text-blue-700" />
          </div>
        </div>
      </div>

      {/* Incidents Resolved */}
      <div 
        className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
        role="article"
        aria-label="Incidents resolved metric"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-700 mb-1">Incidents</p>
            <p className="text-3xl font-bold text-purple-900">{incidentsResolved}</p>
            <p className="text-xs text-purple-600 mt-1">Resolved (30 days)</p>
          </div>
          <div className="p-3 bg-purple-200 rounded-lg">
            <CheckCircle className="h-6 w-6 text-purple-700" />
          </div>
        </div>
      </div>

      {/* Avg Response Time */}
      <div 
        className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
        role="article"
        aria-label="Average response time metric"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-orange-700 mb-1">Response Time</p>
            <p className="text-3xl font-bold text-orange-900">
              {avgResponseTimeMs}
              <span className="text-lg">ms</span>
            </p>
            <p className="text-xs text-orange-600 mt-1">Average across services</p>
          </div>
          <div className="p-3 bg-orange-200 rounded-lg">
            <Zap className="h-6 w-6 text-orange-700" />
          </div>
        </div>
      </div>
    </div>
  )
}
