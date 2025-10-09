/**
 * GeoNames API Service
 * Fetches real city data near earthquake locations
 * 
 * API Docs: http://www.geonames.org/export/web-services.html
 * Note: Requires GEONAMES_USERNAME in environment variables
 */

interface GeoNamesCity {
  name: string
  population: number
  lat: number
  lng: number
  distance: number
  countryCode: string
  adminName1: string // State/Province
}

interface NearbyCityResult {
  name: string
  population: number
  distance: number
  intensity: 'Strong' | 'Moderate' | 'Light' | 'Weak'
  coordinates: {
    lat: number
    lng: number
  }
}

export class GeoNamesService {
  private baseUrl = 'http://api.geonames.org'
  private username: string

  constructor() {
    this.username = process.env.GEONAMES_USERNAME || 'demo'
    if (this.username === 'demo') {
      console.error('⚠️ CRITICAL: Using demo GeoNames account (rate limited). Register at http://www.geonames.org/login and set GEONAMES_USERNAME in .env')
    }
  }

  /**
   * Find nearby cities within a given radius
   */
  async findNearbyCities(
    latitude: number,
    longitude: number,
    radiusKm: number,
    maxResults: number = 10
  ): Promise<GeoNamesCity[]> {
    try {
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lng: longitude.toString(),
        radius: radiusKm.toString(),
        maxRows: maxResults.toString(),
        username: this.username,
        cities: 'cities5000', // Cities with population > 5000
        style: 'FULL'
      })

      const url = `${this.baseUrl}/findNearbyPlaceNameJSON?${params}`
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WeatherAlertSystem/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`GeoNames API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.status) {
        const errorMsg = data.status.message || 'Unknown error'
        
        // Provide helpful error messages for common issues
        if (errorMsg.includes('demo') && errorMsg.includes('exceeded')) {
          console.error('❌ GeoNames demo account limit exceeded. Create account at http://www.geonames.org/login')
          console.error('   Then set GEONAMES_USERNAME=your_username in .env.local')
        }
        
        throw new Error(`GeoNames API error: ${errorMsg}`)
      }

      if (!data.geonames || data.geonames.length === 0) {
        return []
      }

      return data.geonames.map((city: any) => ({
        name: city.name,
        population: city.population || 0,
        lat: parseFloat(city.lat),
        lng: parseFloat(city.lng),
        distance: parseFloat(city.distance) || 0,
        countryCode: city.countryCode,
        adminName1: city.adminName1 || ''
      }))

    } catch (error) {
      console.error('❌ Error fetching nearby cities from GeoNames:', error)
      return []
    }
  }

  /**
   * Calculate earthquake intensity at a city based on distance and magnitude
   */
  calculateIntensity(
    magnitude: number,
    distanceKm: number,
    depth: number
  ): 'Strong' | 'Moderate' | 'Light' | 'Weak' {
    // Simplified attenuation model
    // Real implementation would use proper GMPE (Ground Motion Prediction Equation)
    
    const surfaceMagnitude = magnitude - depth / 100
    const baseRadius = Math.pow(10, 0.5 * surfaceMagnitude)
    
    const strongRadius = baseRadius * 10
    const moderateRadius = baseRadius * 30
    const lightRadius = baseRadius * 80
    
    if (distanceKm <= strongRadius) return 'Strong'
    if (distanceKm <= moderateRadius) return 'Moderate'
    if (distanceKm <= lightRadius) return 'Light'
    return 'Weak'
  }

  /**
   * Get nearby cities with intensity calculations
   */
  async getNearbyCitiesWithIntensity(
    latitude: number,
    longitude: number,
    magnitude: number,
    depth: number,
    maxRadius: number = 500
  ): Promise<NearbyCityResult[]> {
    const cities = await this.findNearbyCities(latitude, longitude, maxRadius, 10)

    return cities
      .map(city => ({
        name: `${city.name}${city.adminName1 ? `, ${city.adminName1}` : ''}`,
        population: city.population,
        distance: city.distance,
        intensity: this.calculateIntensity(magnitude, city.distance, depth),
        coordinates: {
          lat: city.lat,
          lng: city.lng
        }
      }))
      .filter(city => city.intensity !== 'Weak') // Only show cities with meaningful impact
      .sort((a, b) => a.distance - b.distance) // Sort by proximity
      .slice(0, 5) // Limit to top 5 closest cities
  }
}

export const geonamesService = new GeoNamesService()
