import { ShakingRadius, TsunamiETAData, PopulationImpact } from '@/types/event-hover'

/**
 * Calculate haversine distance between two coordinates
 */
export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const toRad = (degrees: number): number => {
  return (degrees * Math.PI) / 180
}

/**
 * Calculate shaking radius based on magnitude and depth
 * Uses simplified GMPE (Ground Motion Prediction Equation)
 */
export const calculateShakingRadius = (
  magnitude: number,
  depth: number
): ShakingRadius => {
  // Adjust magnitude for depth (deeper = less surface impact)
  const surfaceMagnitude = magnitude - depth / 100

  // Base radius calculation (simplified exponential model)
  const baseRadius = Math.pow(10, 0.5 * surfaceMagnitude)

  return {
    strong: Math.round(baseRadius * 10), // Strong shaking (MMI VII-IX)
    moderate: Math.round(baseRadius * 30), // Moderate shaking (MMI V-VI)
    light: Math.round(baseRadius * 80), // Light shaking (MMI III-IV)
    weak: Math.round(baseRadius * 150), // Weak shaking (MMI I-II)
  }
}

/**
 * Get magnitude-based color
 */
export const getMagnitudeColor = (magnitude: number): string => {
  if (magnitude >= 7.0) return '#dc2626' // red-600
  if (magnitude >= 6.0) return '#ea580c' // orange-600
  if (magnitude >= 5.0) return '#f59e0b' // amber-500
  if (magnitude >= 4.0) return '#eab308' // yellow-500
  return '#22c55e' // green-500
}

/**
 * Get depth-based color
 */
export const getDepthColor = (depth: number): string => {
  if (depth >= 300) return '#dc2626' // Deep: red
  if (depth >= 70) return '#f59e0b' // Intermediate: orange
  return '#22c55e' // Shallow: green
}

/**
 * Get depth classification
 */
export const getDepthClassification = (depth: number): string => {
  if (depth >= 300) return 'Deep'
  if (depth >= 70) return 'Intermediate'
  return 'Shallow'
}

/**
 * Calculate tsunami ETA
 */
export const calculateTsunamiETA = (
  sourceLat: number,
  sourceLon: number,
  targetLat: number,
  targetLon: number,
  eventTime: Date
): TsunamiETAData => {
  const distance = haversineDistance(sourceLat, sourceLon, targetLat, targetLon)
  
  // Average tsunami wave speed in deep ocean: ~750 km/h (simplified)
  const waveSpeed = 750
  const travelTimeHours = distance / waveSpeed
  const travelTimeMinutes = Math.round(travelTimeHours * 60)
  
  const eta = new Date(eventTime.getTime() + travelTimeMinutes * 60000)
  
  return {
    targetLocation: 'Your Location',
    distance: Math.round(distance),
    eta,
    countdown: travelTimeMinutes,
    waveSpeed,
  }
}

/**
 * REMOVED: estimateAffectedPopulation() and generateMockCities()
 * 
 * Population impact is now fetched from real APIs:
 * 1. USGS PAGER (primary) - Official earthquake impact data
 * 2. GeoNames (fallback) - Real city data with calculated intensity
 * 
 * See: /app/api/impact/route.ts for implementation
 */

/**
 * Format large numbers with commas
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString()
}

/**
 * Get zoom level based on magnitude
 */
export const getZoomLevel = (magnitude: number): number => {
  if (magnitude >= 8.0) return 5
  if (magnitude >= 7.0) return 6
  if (magnitude >= 6.0) return 7
  if (magnitude >= 5.0) return 8
  return 9
}
