/**
 * Coordinate validation utilities for tsunami simulations
 * Uses GeoNames API to determine if coordinates are over water
 */

type CoordinateValidationResult = {
  isValid: boolean
  isOverWater: boolean
  locationName?: string
  warning?: string
  error?: string
}

/**
 * Check if coordinates are over water using GeoNames Ocean API
 * @param lat Latitude (-90 to 90)
 * @param lon Longitude (-180 to 180)
 * @returns Validation result with location details
 */
export async function validateTsunamiCoordinates(
  lat: number,
  lon: number
): Promise<CoordinateValidationResult> {
  // Basic coordinate range validation
  if (lat < -90 || lat > 90) {
    return {
      isValid: false,
      isOverWater: false,
      error: 'Latitude must be between -90 and 90 degrees'
    }
  }

  if (lon < -180 || lon > 180) {
    return {
      isValid: false,
      isOverWater: false,
      error: 'Longitude must be between -180 and 180 degrees'
    }
  }

  // Check if GeoNames is configured
  const geonamesUsername = process.env.GEONAMES_USERNAME
  if (!geonamesUsername) {
    console.warn('GEONAMES_USERNAME not configured, skipping water validation')
    return {
      isValid: true,
      isOverWater: true, // Assume valid if we can't check
      warning: 'Unable to verify if coordinates are over water'
    }
  }

  try {
    // Use GeoNames Ocean API to check if coordinates are in ocean
    const oceanResponse = await fetch(
      `http://api.geonames.org/oceanJSON?lat=${lat}&lng=${lon}&username=${geonamesUsername}`
    )

    if (!oceanResponse.ok) {
      throw new Error(`GeoNames API error: ${oceanResponse.status}`)
    }

    const oceanData = await oceanResponse.json()

    // If ocean name is present, coordinates are over water
    if (oceanData.ocean) {
      return {
        isValid: true,
        isOverWater: true,
        locationName: oceanData.ocean.name
      }
    }

    // Not over ocean, check if it's a sea/gulf/bay using nearby search
    const nearbyResponse = await fetch(
      `http://api.geonames.org/findNearbyJSON?lat=${lat}&lng=${lon}&username=${geonamesUsername}&radius=1&maxRows=1`
    )

    if (nearbyResponse.ok) {
      const nearbyData = await nearbyResponse.json()
      
      if (nearbyData.geonames && nearbyData.geonames.length > 0) {
        const location = nearbyData.geonames[0]
        const featureCode = location.fcode
        
        // Feature codes for water bodies: H.* (stream, lake, ocean, sea, etc.)
        if (featureCode && featureCode.startsWith('H.')) {
          return {
            isValid: true,
            isOverWater: true,
            locationName: location.name
          }
        }

        // Coordinates are over land
        return {
          isValid: false,
          isOverWater: false,
          locationName: location.name,
          warning: `Coordinates appear to be over land (${location.name}). Tsunamis require underwater earthquakes.`
        }
      }
    }

    // Couldn't determine - show warning but allow
    return {
      isValid: true,
      isOverWater: false,
      warning: 'Unable to verify if coordinates are over water. Proceed with caution.'
    }

  } catch (error) {
    console.error('Coordinate validation error:', error)
    
    // On error, allow but warn
    return {
      isValid: true,
      isOverWater: true, // Assume valid to not block users
      warning: 'Unable to verify coordinates. Ensure they are over water for realistic tsunami simulation.'
    }
  }
}

/**
 * Client-side lightweight check using approximate ocean boundaries
 * Used for instant feedback before API validation
 */
export function quickWaterCheck(lat: number, lon: number): boolean {
  // Major land masses to exclude (rough approximations)
  const landRegions = [
    // Continental interiors (far from coast)
    // North America interior
    { latMin: 35, latMax: 55, lonMin: -110, lonMax: -80 },
    // Europe interior
    { latMin: 45, latMax: 60, lonMin: 10, lonMax: 30 },
    // Asia interior
    { latMin: 30, latMax: 50, lonMin: 60, lonMax: 100 },
    // Africa interior
    { latMin: -20, latMax: 20, lonMin: 10, lonMax: 35 },
    // South America interior
    { latMin: -35, latMax: 5, lonMin: -70, lonMax: -45 },
    // Australia interior
    { latMin: -35, latMax: -15, lonMin: 125, lonMax: 145 },
  ]

  // Check if coordinates fall within any land region
  for (const region of landRegions) {
    if (
      lat >= region.latMin &&
      lat <= region.latMax &&
      lon >= region.lonMin &&
      lon <= region.lonMax
    ) {
      return false // Likely over land
    }
  }

  return true // Likely over water (or near coast)
}

/**
 * Get suggested nearby oceanic coordinates if current ones are on land
 */
export function suggestNearbyOceanCoordinates(lat: number, lon: number): { lat: number; lon: number } {
  // Simple heuristic: move towards nearest major ocean
  
  // Pacific Ocean (largest, central reference)
  if (lon > 100 || lon < -100) {
    return { lat, lon: lon > 0 ? lon + 5 : lon - 5 }
  }
  
  // Atlantic Ocean
  if (lon >= -100 && lon <= 0) {
    return { lat, lon: -30 }
  }
  
  // Indian Ocean
  if (lon > 0 && lon <= 100) {
    return { lat, lon: 70 }
  }

  return { lat, lon } // Fallback to original
}
