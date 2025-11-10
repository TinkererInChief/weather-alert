import { geonamesService } from '@/lib/services/geonames-service'

type CacheEntry = { value: string; expiresAt: number }

const cache = new Map<string, CacheEntry>()

const ttlMs = parseInt(process.env.REVGEOCODE_TTL_MS || '1800000', 10)

const roundKey = (lat: number, lon: number) => `${Math.round(lat * 1000) / 1000},${Math.round(lon * 1000) / 1000}`

class ReverseGeocodeService {
  async getDisplayLocation(lat: number | null | undefined, lon: number | null | undefined) {
    if (typeof lat !== 'number' || typeof lon !== 'number' || !isFinite(lat) || !isFinite(lon)) return ''

    const k = roundKey(lat, lon)
    const now = Date.now()
    const hit = cache.get(k)
    if (hit && hit.expiresAt > now) return hit.value

    const cities = await geonamesService.findNearbyCities(lat, lon, 150, 5)

    let label = ''
    if (cities.length) {
      const best = [...cities].sort((a, b) => (a.distance - b.distance) || (b.population - a.population))[0]
      const parts = [best.name, best.adminName1].filter(Boolean)
      const name = parts.join(', ')
      label = name ? `Off the Coast of ${name}` : ''
    }

    cache.set(k, { value: label, expiresAt: now + ttlMs })
    return label
  }
}

export const reverseGeocodeService = new ReverseGeocodeService()
