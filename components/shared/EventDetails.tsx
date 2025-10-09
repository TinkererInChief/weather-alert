'use client'

import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { 
  MapPin, 
  Clock, 
  Layers, 
  Activity, 
  AlertTriangle, 
  Users, 
  Waves,
  TrendingUp,
  Info,
  ArrowRight
} from 'lucide-react'
import { EarthquakeEvent, TsunamiEvent, PopulationImpact, TsunamiETAData } from '@/types/event-hover'
import { 
  getMagnitudeColor, 
  getDepthColor, 
  getDepthClassification, 
  formatNumber 
} from '@/lib/event-calculations'

type EventDetailsProps = {
  event: EarthquakeEvent | TsunamiEvent
  type: 'earthquake' | 'tsunami'
  populationImpact?: PopulationImpact
  tsunamiETA?: TsunamiETAData
}

export default function EventDetails({ 
  event, 
  type, 
  populationImpact,
  tsunamiETA 
}: EventDetailsProps) {
  const eventTime = new Date(event.time)

  const isEarthquake = (e: any): e is EarthquakeEvent => {
    return 'magnitude' in e && 'depth' in e
  }

  const isTsunami = (e: any): e is TsunamiEvent => {
    return 'threatLevel' in e
  }

  return (
    <div className="p-4 space-y-4">
      {/* Event Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {type === 'earthquake' && isEarthquake(event) && (
                <>
                  <span 
                    className="inline-block px-2 py-0.5 text-white rounded font-bold text-sm"
                    style={{ backgroundColor: getMagnitudeColor(event.magnitude) }}
                  >
                    M{event.magnitude.toFixed(1)}
                  </span>
                  Earthquake
                </>
              )}
              {type === 'tsunami' && (
                <>
                  <Waves className="h-5 w-5 text-blue-500" />
                  Tsunami Alert
                </>
              )}
            </h3>
            <p className="text-sm text-slate-600 mt-1">{event.location}</p>
          </div>
        </div>
      </div>

      {/* Tsunami ETA Warning (if applicable) */}
      {tsunamiETA && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 animate-pulse">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-900">
                ⚠️ ETA: {tsunamiETA.countdown} minutes
              </div>
              <div className="text-sm text-red-700 mt-1">
                <div>Distance: {formatNumber(tsunamiETA.distance)} km</div>
                <div>Wave Speed: ~{tsunamiETA.waveSpeed} km/h</div>
                <div>Estimated Arrival: {format(tsunamiETA.eta, 'h:mm a')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Core Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Coordinates */}
        {event.latitude !== undefined && event.longitude !== undefined && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-slate-500">Location</div>
              <div className="text-sm font-medium text-slate-900">
                {event.latitude.toFixed(2)}°N, {Math.abs(event.longitude).toFixed(2)}°
                {event.longitude >= 0 ? 'E' : 'W'}
              </div>
            </div>
          </div>
        )}

        {/* Time */}
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs text-slate-500">Time</div>
            <div className="text-sm font-medium text-slate-900">
              {format(eventTime, 'MMM d, h:mm a')}
            </div>
            <div className="text-xs text-slate-500">
              {formatDistanceToNow(eventTime, { addSuffix: true })}
            </div>
          </div>
        </div>

        {/* Depth (Earthquake only) */}
        {isEarthquake(event) && (
          <div className="flex items-start gap-2">
            <Layers className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-slate-500">Depth</div>
              <div className="text-sm font-medium text-slate-900 flex items-center gap-1">
                <span 
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: getDepthColor(event.depth) }}
                />
                {event.depth.toFixed(1)} km
                <span className="text-xs text-slate-500">
                  ({getDepthClassification(event.depth)})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Magnitude (if available for tsunami) */}
        {isEarthquake(event) && (
          <div className="flex items-start gap-2">
            <Activity className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-slate-500">Magnitude</div>
              <div className="text-sm font-medium text-slate-900">
                {event.magnitude.toFixed(1)} {getMagnitudeType(event.magnitude)}
              </div>
            </div>
          </div>
        )}

        {/* Tsunami Threat Level */}
        {isTsunami(event) && (
          <>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-slate-500">Threat Level</div>
                <div className={`text-sm font-bold capitalize ${getThreatColor(event.threatLevel)}`}>
                  {event.threatLevel}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Waves className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-slate-500">Ocean</div>
                <div className="text-sm font-medium text-slate-900">
                  {event.ocean}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Population Impact (Earthquake only) */}
      {populationImpact && isEarthquake(event) && (
        <div className="border-t border-slate-200 pt-3 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-semibold text-slate-900">Estimated Impact</span>
          </div>
          
          {populationImpact.message ? (
            // Empty state for remote areas
            <div className="text-xs text-slate-500 text-center py-2 bg-slate-50 rounded">
              {populationImpact.message}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-red-50 rounded p-2">
                  <div className="text-red-700 font-semibold">Strong</div>
                  <div className="text-red-900 font-bold mt-1">
                    {formatNumber(populationImpact.strongShaking || 0)}
                  </div>
                  <div className="text-red-600">people</div>
                </div>
                <div className="bg-orange-50 rounded p-2">
                  <div className="text-orange-700 font-semibold">Moderate</div>
                  <div className="text-orange-900 font-bold mt-1">
                    {formatNumber(populationImpact.moderateShaking || 0)}
                  </div>
                  <div className="text-orange-600">people</div>
                </div>
                <div className="bg-yellow-50 rounded p-2">
                  <div className="text-yellow-700 font-semibold">Light</div>
                  <div className="text-yellow-900 font-bold mt-1">
                    {formatNumber(populationImpact.lightShaking || 0)}
                  </div>
                  <div className="text-yellow-600">people</div>
                </div>
              </div>

              {/* Affected Cities */}
              {populationImpact.cities && populationImpact.cities.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-600">Nearby Cities:</div>
                  {populationImpact.cities.map((city, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-slate-700">
                        {city.name} ({formatNumber(city.population)})
                      </span>
                      <span className={`font-medium ${getIntensityColor(city.intensity)}`}>
                        {city.intensity} • {city.distance.toFixed(0)}km
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Data source attribution */}
              {(populationImpact as any).source && (
                <div className="text-xs text-slate-400 pt-1">
                  Data: {(populationImpact as any).source === 'usgs-pager' ? 'USGS PAGER' : 'GeoNames'}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Additional Info */}
      {isEarthquake(event) && event.significance && (
        <div className="border-t border-slate-200 pt-3">
          <div className="flex items-start gap-2 text-xs">
            <Info className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-slate-600">
              <span className="font-semibold">Significance:</span> {event.significance}
              {event.felt && <span className="ml-2">• {formatNumber(event.felt)} felt reports</span>}
            </div>
          </div>
        </div>
      )}

      {/* View Details Button */}
      <div className="border-t border-slate-200 pt-3">
        <Link
          href={type === 'earthquake' ? '/dashboard/alerts' : '/dashboard/tsunami'}
          className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          View Full Details
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

// Helper functions
const getMagnitudeType = (magnitude: number): string => {
  if (magnitude >= 8.0) return 'Great'
  if (magnitude >= 7.0) return 'Major'
  if (magnitude >= 6.0) return 'Strong'
  if (magnitude >= 5.0) return 'Moderate'
  return 'Light'
}

const getThreatColor = (level: string): string => {
  switch (level) {
    case 'warning':
      return 'text-red-600'
    case 'watch':
      return 'text-orange-600'
    case 'advisory':
      return 'text-yellow-600'
    default:
      return 'text-blue-600'
  }
}

const getIntensityColor = (intensity: string): string => {
  switch (intensity) {
    case 'Strong':
      return 'text-red-600'
    case 'Moderate':
      return 'text-orange-600'
    case 'Light':
      return 'text-yellow-600'
    default:
      return 'text-green-600'
  }
}
