/**
 * Search and Rescue (SAR) Resources Service
 * Provides information about nearby emergency response capabilities
 */

import sarData from '@/lib/data/sar-resources.json'

export type SARResource = {
  type: 'coast_guard' | 'salvage_tug' | 'shelter' | 'international'
  id: string
  name: string
  location: string
  coordinates: [number, number]
  distance: number              // km from event
  estimatedResponseTime: number // minutes
  contact: {
    phone: string
    vhf?: string
    email?: string
    emergency?: string
  }
  capabilities?: string[]
  details: any                  // Full resource object
}

export type SARSummary = {
  nearestCoastGuard: SARResource | null
  nearestSalvageTug: SARResource | null
  nearestShelter: SARResource | null
  allResourcesWithin500km: SARResource[]
  recommendedContacts: SARResource[]
  overallResponseCapability: 'excellent' | 'good' | 'fair' | 'limited'
}

/**
 * Calculate distance between two coordinates
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Check if coordinates are within coverage area
 */
function isInCoverage(
  lat: number,
  lon: number,
  coverage: { latitude: [number, number]; longitude: [number, number] }
): boolean {
  return (
    lat >= coverage.latitude[0] &&
    lat <= coverage.latitude[1] &&
    lon >= coverage.longitude[0] &&
    lon <= coverage.longitude[1]
  )
}

/**
 * Estimate response time based on distance
 * Assumptions:
 * - Helicopter: 200 km/h average speed
 * - Fast response boat: 40 knots (74 km/h)
 * - Salvage tug: 12 knots (22 km/h)
 */
function estimateResponseTime(distance: number, resourceType: string, baseTime: number): number {
  let speed = 200 // default helicopter speed km/h
  
  if (resourceType.includes('tug') || resourceType.includes('salvage')) {
    speed = 22 // slow tug
  } else if (resourceType.includes('boat')) {
    speed = 74 // fast boat
  }
  
  const travelTime = (distance / speed) * 60 // minutes
  return Math.round(baseTime + travelTime)
}

/**
 * Find nearest Coast Guard station
 */
function findNearestCoastGuard(latitude: number, longitude: number): SARResource | null {
  let nearest: SARResource | null = null
  let minDistance = Infinity

  for (const station of sarData.coastGuardStations) {
    const distance = calculateDistance(
      latitude,
      longitude,
      station.rcc.coordinates[0],
      station.rcc.coordinates[1]
    )

    if (distance < minDistance) {
      minDistance = distance
      nearest = {
        type: 'coast_guard',
        id: station.id,
        name: station.name,
        location: station.rcc.location,
        coordinates: [station.rcc.coordinates[0], station.rcc.coordinates[1]],
        distance,
        estimatedResponseTime: estimateResponseTime(distance, 'coast_guard', station.responseTime),
        contact: station.contact,
        capabilities: station.capabilities,
        details: station
      }
    }
  }

  return nearest
}

/**
 * Find nearest salvage tug
 */
function findNearestSalvageTug(latitude: number, longitude: number): SARResource | null {
  let nearest: SARResource | null = null
  let minDistance = Infinity

  for (const tug of sarData.salvageTugs) {
    const distance = calculateDistance(
      latitude,
      longitude,
      tug.coordinates[0],
      tug.coordinates[1]
    )

    if (distance < minDistance) {
      minDistance = distance
      nearest = {
        type: 'salvage_tug',
        id: tug.id,
        name: tug.name,
        location: tug.location,
        coordinates: [tug.coordinates[0], tug.coordinates[1]],
        distance,
        estimatedResponseTime: estimateResponseTime(distance, 'salvage_tug', tug.responseTime),
        contact: tug.contact,
        details: tug
      }
    }
  }

  return nearest
}

/**
 * Find nearest emergency shelter
 */
function findNearestShelter(latitude: number, longitude: number): SARResource | null {
  let nearest: SARResource | null = null
  let minDistance = Infinity

  for (const shelter of sarData.emergencyShelters) {
    const distance = calculateDistance(
      latitude,
      longitude,
      shelter.coordinates[0],
      shelter.coordinates[1]
    )

    if (distance < minDistance) {
      minDistance = distance
      nearest = {
        type: 'shelter',
        id: shelter.id,
        name: shelter.name,
        location: shelter.location,
        coordinates: [shelter.coordinates[0], shelter.coordinates[1]],
        distance,
        estimatedResponseTime: Math.round(distance / 50 * 60), // Assume 50km/h travel
        contact: shelter.contact,
        details: shelter
      }
    }
  }

  return nearest
}

/**
 * Find all SAR resources within specified radius
 */
export function findSARResources(
  latitude: number,
  longitude: number,
  maxDistanceKm: number = 500
): SARSummary {
  const nearestCoastGuard = findNearestCoastGuard(latitude, longitude)
  const nearestSalvageTug = findNearestSalvageTug(latitude, longitude)
  const nearestShelter = findNearestShelter(latitude, longitude)

  // Collect all resources within range
  const allResources: SARResource[] = []

  // Add coast guard stations
  for (const station of sarData.coastGuardStations) {
    const distance = calculateDistance(
      latitude,
      longitude,
      station.rcc.coordinates[0],
      station.rcc.coordinates[1]
    )
    if (distance <= maxDistanceKm) {
      allResources.push({
        type: 'coast_guard',
        id: station.id,
        name: station.name,
        location: station.rcc.location,
        coordinates: [station.rcc.coordinates[0], station.rcc.coordinates[1]],
        distance,
        estimatedResponseTime: estimateResponseTime(distance, 'coast_guard', station.responseTime),
        contact: station.contact,
        capabilities: station.capabilities,
        details: station
      })
    }
  }

  // Add salvage tugs
  for (const tug of sarData.salvageTugs) {
    const distance = calculateDistance(
      latitude,
      longitude,
      tug.coordinates[0],
      tug.coordinates[1]
    )
    if (distance <= maxDistanceKm) {
      allResources.push({
        type: 'salvage_tug',
        id: tug.id,
        name: tug.name,
        location: tug.location,
        coordinates: [tug.coordinates[0], tug.coordinates[1]],
        distance,
        estimatedResponseTime: estimateResponseTime(distance, 'salvage_tug', tug.responseTime),
        contact: tug.contact,
        details: tug
      })
    }
  }

  // Add shelters
  for (const shelter of sarData.emergencyShelters) {
    const distance = calculateDistance(
      latitude,
      longitude,
      shelter.coordinates[0],
      shelter.coordinates[1]
    )
    if (distance <= maxDistanceKm) {
      allResources.push({
        type: 'shelter',
        id: shelter.id,
        name: shelter.name,
        location: shelter.location,
        coordinates: [shelter.coordinates[0], shelter.coordinates[1]],
        distance,
        estimatedResponseTime: Math.round(distance / 50 * 60),
        contact: shelter.contact,
        details: shelter
      })
    }
  }

  // Sort by distance
  allResources.sort((a, b) => a.distance - b.distance)

  // Recommended contacts (closest 3-5 most relevant)
  const recommendedContacts = allResources
    .filter(r => r.type === 'coast_guard' || r.distance < 200)
    .slice(0, 5)

  // Assess overall capability
  let overallCapability: SARSummary['overallResponseCapability'] = 'limited'
  if (nearestCoastGuard && nearestCoastGuard.distance < 100) {
    overallCapability = 'excellent'
  } else if (nearestCoastGuard && nearestCoastGuard.distance < 300) {
    overallCapability = 'good'
  } else if (allResources.length > 0) {
    overallCapability = 'fair'
  }

  return {
    nearestCoastGuard,
    nearestSalvageTug,
    nearestShelter,
    allResourcesWithin500km: allResources,
    recommendedContacts,
    overallResponseCapability: overallCapability
  }
}

/**
 * Get SAR summary text
 */
export function getSARSummary(sarData: SARSummary): string {
  if (!sarData.nearestCoastGuard) {
    return 'No SAR resources identified within 500km. Contact international maritime authorities.'
  }

  const cg = sarData.nearestCoastGuard
  const eta = Math.round(cg.estimatedResponseTime)

  let summary = `Nearest SAR: ${cg.name} (${Math.round(cg.distance)}km, ETA ${eta} min). `
  
  if (sarData.nearestSalvageTug && sarData.nearestSalvageTug.distance < 200) {
    summary += `Salvage available: ${sarData.nearestSalvageTug.name}. `
  }

  summary += `Response capability: ${sarData.overallResponseCapability.toUpperCase()}.`

  return summary
}

/**
 * Get priority contact for emergency
 */
export function getPriorityContact(sarData: SARSummary): SARResource | null {
  return sarData.nearestCoastGuard || sarData.allResourcesWithin500km[0] || null
}
