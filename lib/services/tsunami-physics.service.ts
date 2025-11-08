/**
 * Enhanced Tsunami Physics Model
 * Based on scientific literature and NOAA tsunami modeling
 */

export type TsunamiParameters = {
  magnitude: number
  depth: number // Earthquake focal depth (km)
  faultType: 'thrust' | 'strike-slip' | 'normal'
  faultLength?: number // km
  faultWidth?: number // km
  faultStrike?: number // Azimuth angle (0-360°)
}

export type VesselThreat = {
  distance: number // km
  waveHeight: number // meters
  eta: number // minutes
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'minimal'
  tsunamiSpeed: number // km/h at vessel location
  azimuth: number // Direction from epicenter to vessel (degrees)
}

/**
 * Calculate great circle distance using Haversine formula
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180

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

/**
 * Calculate azimuth (bearing) from point 1 to point 2
 */
function calculateAzimuth(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const toDeg = (rad: number) => (rad * 180) / Math.PI

  const dLon = toRad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
  const bearing = toDeg(Math.atan2(y, x))

  return (bearing + 360) % 360 // Normalize to 0-360
}

/**
 * Estimate ocean depth based on distance from coast
 * Simplified model - in production, use real bathymetry data
 */
function estimateOceanDepth(lat: number, lon: number): number {
  // Very simplified: Pacific Ocean average ~4000m, shallower near coasts
  // Real implementation should use GEBCO or ETOPO bathymetry data
  
  // Approximate distance from nearest land (very rough)
  // For Pacific: deeper in center, shallower near continents
  const pacificCenterLat = 0
  const pacificCenterLon = -160
  
  const distFromCenter = haversineDistance(lat, lon, pacificCenterLat, pacificCenterLon)
  
  // Depth profile: 4000m in deep ocean, 200m near coasts
  const maxDepth = 4000
  const minDepth = 200
  const transitionDistance = 2000 // km
  
  if (distFromCenter > transitionDistance) {
    return minDepth + (distFromCenter - transitionDistance) * 0.5
  }
  
  const depthFactor = Math.min(distFromCenter / transitionDistance, 1)
  return minDepth + (maxDepth - minDepth) * depthFactor
}

/**
 * Calculate tsunami wave speed based on water depth (shallow water wave equation)
 * v = √(g × h) where g = 9.81 m/s² and h = water depth in meters
 */
function calculateTsunamiSpeed(depthMeters: number): number {
  const g = 9.81 // m/s²
  const speedMs = Math.sqrt(g * depthMeters)
  const speedKmh = speedMs * 3.6 // Convert m/s to km/h
  return speedKmh
}

/**
 * Calculate initial tsunami amplitude based on earthquake parameters
 * Based on Okada model for co-seismic seafloor displacement
 */
function calculateInitialAmplitude(params: TsunamiParameters): number {
  const { magnitude, depth, faultType } = params

  // Moment magnitude to seismic moment
  // M₀ = 10^(1.5M + 9.1) Newton-meters
  const M0 = Math.pow(10, 1.5 * magnitude + 9.1)

  // Fault dimensions scaling (Wells & Coppersmith, 1994)
  const faultLength = params.faultLength || Math.pow(10, 0.5 * magnitude - 1.8) // km
  const faultWidth = params.faultWidth || Math.pow(10, 0.25 * magnitude - 0.8) // km

  // Average slip (m)
  const shearModulus = 3e10 // Pa (typical for crust)
  const faultAreaM2 = faultLength * faultWidth * 1e6 // Convert km² to m²
  const slip = M0 / (shearModulus * faultAreaM2)

  // Vertical seafloor displacement depends on fault type
  let verticalDisplacement: number
  
  switch (faultType) {
    case 'thrust':
      // Thrust faults (subduction zones) produce maximum vertical displacement
      // Dip angle typically 10-30° for megathrust events
      const dipAngle = 15 * (Math.PI / 180)
      verticalDisplacement = slip * Math.sin(dipAngle)
      break
    
    case 'normal':
      // Normal faults produce moderate vertical displacement
      const normalDip = 60 * (Math.PI / 180)
      verticalDisplacement = slip * Math.sin(normalDip) * 0.5
      break
    
    case 'strike-slip':
      // Strike-slip faults produce minimal vertical displacement
      verticalDisplacement = slip * 0.1 // Only ~10% vertical component
      break
  }

  // Initial wave amplitude is approximately equal to seafloor displacement
  // Depth factor: deeper earthquakes produce less efficient tsunami generation
  const depthFactor = Math.exp(-depth / 50) // Exponential decay with depth
  
  return verticalDisplacement * depthFactor
}

/**
 * Calculate wave height at distance considering:
 * - Energy conservation (cylindrical spreading)
 * - Directivity pattern based on fault orientation
 * - Depth effects
 */
function calculateWaveHeight(
  initialAmplitude: number,
  distance: number,
  azimuth: number,
  params: TsunamiParameters
): number {
  if (distance < 1) distance = 1 // Avoid division by zero

  // 1. Geometric spreading (cylindrical for tsunamis)
  // Energy per unit length ∝ 1/√r for cylindrical spreading
  const geometricAttenuation = 1 / Math.sqrt(distance / 100 + 1)

  // 2. Directivity pattern based on fault orientation
  let directivityFactor = 1.0
  
  if (params.faultStrike !== undefined) {
    // Tsunamis are strongest perpendicular to fault strike
    const faultStrike = params.faultStrike
    const angleFromStrike = Math.abs(azimuth - faultStrike)
    const normalizedAngle = Math.min(angleFromStrike, 360 - angleFromStrike)
    
    // Maximum amplitude perpendicular to fault (90°)
    // Minimum amplitude parallel to fault (0° or 180°)
    const radAngle = (normalizedAngle * Math.PI) / 180
    directivityFactor = 0.3 + 0.7 * Math.abs(Math.sin(radAngle))
  }

  // 3. Thrust fault earthquakes have stronger tsunami generation
  const faultTypeMultiplier = params.faultType === 'thrust' ? 1.5 : 
                              params.faultType === 'normal' ? 0.8 : 0.3

  // 4. Shoaling effect (wave amplification in shallow water)
  // For now, simplified - real model would use Green's Law
  const shoalingFactor = 1.0 // Would increase near coasts

  // Combined wave height
  const waveHeight = 
    initialAmplitude *
    geometricAttenuation *
    directivityFactor *
    faultTypeMultiplier *
    shoalingFactor

  return Math.max(waveHeight, 0.01) // Minimum 1cm
}

/**
 * Determine threat severity based on wave height and distance
 */
function determineSeverity(
  waveHeight: number,
  distance: number
): 'critical' | 'high' | 'moderate' | 'low' | 'minimal' {
  // Critical: >5m waves OR very close (<100km)
  if (waveHeight > 5 || distance < 100) {
    return 'critical'
  }
  
  // High: 2-5m waves OR close (100-300km)
  if (waveHeight > 2 || distance < 300) {
    return 'high'
  }
  
  // Moderate: 0.5-2m waves OR moderate distance (300-500km)
  if (waveHeight > 0.5 || distance < 500) {
    return 'moderate'
  }
  
  // Low: 0.1-0.5m waves OR distant (500-1000km)
  if (waveHeight > 0.1 || distance < 1000) {
    return 'low'
  }
  
  return 'minimal'
}

/**
 * Main function to calculate tsunami threat for a vessel
 */
export function calculateTsunamiThreat(
  epicenterLat: number,
  epicenterLon: number,
  vesselLat: number,
  vesselLon: number,
  params: TsunamiParameters
): VesselThreat {
  // 1. Calculate distance and bearing
  const distance = haversineDistance(epicenterLat, epicenterLon, vesselLat, vesselLon)
  const azimuth = calculateAzimuth(epicenterLat, epicenterLon, vesselLat, vesselLon)

  // 2. Estimate ocean depth at vessel location
  const vesselDepth = estimateOceanDepth(vesselLat, vesselLon)

  // 3. Calculate tsunami speed based on depth
  const tsunamiSpeed = calculateTsunamiSpeed(vesselDepth)

  // 4. Calculate initial tsunami amplitude
  const initialAmplitude = calculateInitialAmplitude(params)

  // 5. Calculate wave height at vessel location
  const waveHeight = calculateWaveHeight(initialAmplitude, distance, azimuth, params)

  // 6. Calculate ETA
  const eta = Math.round((distance / tsunamiSpeed) * 60) // minutes

  // 7. Determine severity
  const severity = determineSeverity(waveHeight, distance)

  return {
    distance: Math.round(distance * 10) / 10, // Round to 1 decimal
    waveHeight: Math.round(waveHeight * 100) / 100, // Round to 2 decimals
    eta,
    severity,
    tsunamiSpeed: Math.round(tsunamiSpeed),
    azimuth: Math.round(azimuth)
  }
}

/**
 * Legacy simple calculation for backward compatibility
 * (Less accurate but faster)
 */
export function calculateTsunamiThreatSimple(
  epicenterLat: number,
  epicenterLon: number,
  vesselLat: number,
  vesselLon: number,
  magnitude: number
): VesselThreat {
  const distance = haversineDistance(epicenterLat, epicenterLon, vesselLat, vesselLon)
  const azimuth = calculateAzimuth(epicenterLat, epicenterLon, vesselLat, vesselLon)
  
  // Simplified wave height calculation
  const baseHeight = Math.pow(10, magnitude - 5)
  const waveHeight = baseHeight / Math.sqrt(distance + 1)
  
  // Fixed speed (open ocean average)
  const tsunamiSpeed = 800
  const eta = Math.round((distance / tsunamiSpeed) * 60)
  
  // Simplified severity
  let severity: 'critical' | 'high' | 'moderate' | 'low' | 'minimal'
  if (distance < 100) severity = 'critical'
  else if (distance < 300) severity = 'high'
  else if (distance < 500) severity = 'moderate'
  else if (distance < 1000) severity = 'low'
  else severity = 'minimal'
  
  return {
    distance: Math.round(distance * 10) / 10,
    waveHeight: Math.round(waveHeight * 100) / 100,
    eta,
    severity,
    tsunamiSpeed,
    azimuth: Math.round(azimuth)
  }
}
