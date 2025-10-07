"use client"

import { Waves, Wind, Zap, Radio } from 'lucide-react'

type SeaStateData = {
  station: string
  waveHeight: number
  windSpeed: number
  waterTemp: number
  pressure: number
  distance: number
}

type TidalData = {
  station: string
  currentLevel: number
  trend: 'rising' | 'falling' | 'stable'
  nextHighTide: { time: string | Date; height: number }
  tsunamiAmplificationRisk: 'low' | 'medium' | 'high' | 'critical'
  nextLowTide: { time: string | Date; height: number }
  combinedWaveHeight?: number
}

type AftershockData = {
  probability24h: number
  probabilityWeek: number
  expectedMagnitude: number
  peakRiskTime: string
}

type SARData = {
  nearestResource: string
  distance: number
  eta: number
  resourceType: string
}

type EnvironmentalData = {
  seaState?: SeaStateData | null
  tidal?: TidalData | null
  aftershock?: AftershockData | null
  sar?: SARData | null
}

type EnvironmentalConditionsPanelProps = {
  data: EnvironmentalData
}

export default function EnvironmentalConditionsPanel({ data }: EnvironmentalConditionsPanelProps) {
  const hasAnyData = data.seaState || data.tidal || data.aftershock || data.sar

  if (!hasAnyData) {
    return null
  }

  const fmt1 = (v: unknown) => {
    const n = typeof v === 'number' ? v : Number.NaN
    return Number.isFinite(n) ? n.toFixed(1) : '—'
  }

  const fmt0 = (v: unknown) => {
    const n = typeof v === 'number' ? v : Number.NaN
    return Number.isFinite(n) ? n.toFixed(0) : '—'
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Waves className="h-4 w-4 text-blue-600" />
          Real-Time Environmental Conditions
        </h3>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-600 font-medium">Live</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Sea State */}
        {data.seaState && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center">
                  <Waves className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-bold text-blue-900">SEA STATE</span>
              </div>
              <span className="text-[10px] text-blue-600 font-medium">
                NOAA {data.seaState.station}
              </span>
            </div>
            
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Wave Height:</span>
                <span className={`font-bold ${
                  data.seaState.waveHeight > 4 ? 'text-orange-600' : 
                  data.seaState.waveHeight > 2 ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {fmt1(data.seaState.waveHeight)}m {data.seaState.waveHeight > 4 && '⚠️'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Wind Speed:</span>
                <span className="font-semibold text-slate-900">
                  {fmt1(data.seaState.windSpeed)} m/s
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Water Temp:</span>
                <span className="font-semibold text-slate-900">
                  {fmt1(data.seaState.waterTemp)}°C
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Pressure:</span>
                <span className="font-semibold text-slate-900">
                  {fmt0(data.seaState.pressure)} mb
                </span>
              </div>
              <div className="pt-1 border-t border-blue-100 text-[10px] text-slate-500">
                {data.seaState.distance}km from event
              </div>
            </div>
          </div>
        )}

        {/* Tidal Conditions */}
        {data.tidal && (
          <div className={`rounded-lg border p-3 space-y-2 ${
            data.tidal.tsunamiAmplificationRisk === 'critical' 
              ? 'border-red-200 bg-red-50/50' :
            data.tidal.tsunamiAmplificationRisk === 'high' 
              ? 'border-orange-200 bg-orange-50/50' :
            data.tidal.tsunamiAmplificationRisk === 'medium' 
              ? 'border-amber-200 bg-amber-50/50' :
            'border-cyan-100 bg-cyan-50/50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded-md flex items-center justify-center ${
                  data.tidal.tsunamiAmplificationRisk === 'critical' ? 'bg-red-600' :
                  data.tidal.tsunamiAmplificationRisk === 'high' ? 'bg-orange-600' :
                  data.tidal.tsunamiAmplificationRisk === 'medium' ? 'bg-amber-600' :
                  'bg-cyan-600'
                }`}>
                  <Wind className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-bold text-slate-900">TIDAL</span>
              </div>
              <span className="text-[10px] text-slate-600 font-medium">
                {data.tidal.station}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Current:</span>
                <span className="font-semibold text-slate-900">
                  {data.tidal.trend === 'rising' ? '↗️ Rising' : 
                   data.tidal.trend === 'falling' ? '↘️ Falling' : '→ Stable'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Level:</span>
                <span className="font-semibold text-slate-900">
                  {fmt1(data.tidal.currentLevel)}m
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Next High:</span>
                <span className="font-semibold text-slate-900 text-[11px]">
                  {new Date(data.tidal.nextHighTide.time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} ({fmt1(data.tidal.nextHighTide.height)}m)
                </span>
              </div>

              {data.tidal.tsunamiAmplificationRisk !== 'low' && (
                <div className="pt-2 border-t space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Tsunami Risk:</span>
                    <span className={`font-black uppercase text-[11px] ${
                      data.tidal.tsunamiAmplificationRisk === 'critical' ? 'text-red-600' :
                      data.tidal.tsunamiAmplificationRisk === 'high' ? 'text-orange-600' :
                      'text-amber-600'
                    }`}>
                      {data.tidal.tsunamiAmplificationRisk} ⚠️
                    </span>
                  </div>
                  {data.tidal.combinedWaveHeight && (
                    <div className="text-[10px] text-slate-600">
                      Potential combined height: <span className="font-bold text-red-600">
                        {fmt1(data.tidal.combinedWaveHeight)}m
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aftershock Forecast */}
        {data.aftershock && (
          <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-purple-600 flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-bold text-purple-900">AFTERSHOCKS</span>
              </div>
              <span className="text-[10px] text-purple-600 font-medium">USGS</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Next 24h:</span>
                <span className={`font-bold ${
                  data.aftershock.probability24h > 70 ? 'text-red-600' : 
                  data.aftershock.probability24h > 40 ? 'text-orange-600' : 'text-amber-600'
                }`}>
                  {data.aftershock.probability24h}% M{fmt1(data.aftershock.expectedMagnitude)}+
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Next 7 days:</span>
                <span className="font-semibold text-slate-900">
                  {data.aftershock.probabilityWeek}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Peak Risk:</span>
                <span className="font-semibold text-slate-900 text-[11px]">
                  {data.aftershock.peakRiskTime}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SAR Resources */}
        {data.sar && (
          <div className="rounded-lg border border-green-100 bg-green-50/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-green-600 flex items-center justify-center">
                  <Radio className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-bold text-green-900">SAR</span>
              </div>
              <span className="text-[10px] text-green-600 font-medium">Emergency</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="space-y-0.5">
                <div className="text-slate-600 text-[10px]">Nearest Resource:</div>
                <div className="font-semibold text-slate-900">{data.sar.nearestResource}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Distance:</span>
                <span className="font-semibold text-slate-900">{data.sar.distance}km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">ETA:</span>
                <span className="font-bold text-green-600">{data.sar.eta} min</span>
              </div>
              <div className="pt-1 border-t border-green-100 text-[10px] text-slate-500">
                Type: {data.sar.resourceType}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-200">
        <span>Data: NOAA NDBC, NOAA CO-OPS, USGS, SAR Database</span>
        <span className="text-slate-400">Phase 1 Sources</span>
      </div>
    </div>
  )
}
