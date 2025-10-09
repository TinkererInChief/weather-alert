/**
 * USGS PAGER (Prompt Assessment of Global Earthquakes for Response)
 * Robust integration using event detail GeoJSON and losspager product.
 */

type PAGERExposure = {
  level: string
  population: number
}

type PAGERCity = {
  name: string
  population: number
  mmi: number
  distance: number
}

type PAGERData = {
  alertlevel: string
  exposures: PAGERExposure[]
  cities: PAGERCity[]
  version: number
}

export type PopulationImpactResult = {
  strongShaking: number
  moderateShaking: number
  lightShaking: number
  totalAffected: number
  cities: Array<{
    name: string
    population: number
    intensity: 'Strong' | 'Moderate' | 'Light' | 'Weak'
    distance: number
  }>
  source: 'usgs-pager'
}

export class PAGERService {
  private detailUrl = (eventId: string) => `https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/${eventId}.geojson`

  async getImpactData(eventId: string): Promise<PopulationImpactResult | null> {
    const pagerData = await this.fetchPAGERData(eventId)
    if (!pagerData) return null
    return this.parsePopulationImpact(pagerData)
  }

  private async fetchPAGERData(eventId: string): Promise<PAGERData | null> {
    try {
      const detailResp = await fetch(this.detailUrl(eventId), {
        headers: { 'User-Agent': 'WeatherAlertSystem/1.0' }
      })

      if (!detailResp.ok) return null

      const detail = await detailResp.json() as any
      const products = detail?.properties?.products
      const pager = products?.losspager?.[0]
      if (!pager) return null

      const contents = pager.contents || {}
      const jsonEntry = contents['json'] || contents['pager.json'] || contents['alert.json'] || contents['exposure.json']
      if (!jsonEntry?.url) return null

      const pagerResp = await fetch(jsonEntry.url, { headers: { 'User-Agent': 'WeatherAlertSystem/1.0' } })
      if (!pagerResp.ok) return null

      const ct = pagerResp.headers.get('content-type') || ''
      if (!ct.includes('application/json')) return null

      const pagerJson = await pagerResp.json()
      return this.parsePAGERJsonFlexible(pagerJson)
    } catch {
      return null
    }
  }

  private mmiToIntensity(mmi: number): 'Strong' | 'Moderate' | 'Light' | 'Weak' {
    if (mmi >= 7) return 'Strong'
    if (mmi >= 5) return 'Moderate'
    if (mmi >= 3) return 'Light'
    return 'Weak'
  }

  private parsePopulationImpact(pagerData: PAGERData): PopulationImpactResult {
    let strongShaking = 0
    let moderateShaking = 0
    let lightShaking = 0

    for (const exposure of pagerData.exposures || []) {
      const mmi = this.extractMMIFromLevel(exposure.level)
      if (mmi >= 7) strongShaking += exposure.population
      else if (mmi >= 5) moderateShaking += exposure.population
      else if (mmi >= 3) lightShaking += exposure.population
    }

    const cities = (pagerData.cities || [])
      .map(c => ({
        name: c.name,
        population: c.population,
        intensity: this.mmiToIntensity(c.mmi),
        distance: c.distance
      }))
      .filter(c => c.intensity !== 'Weak')
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)

    return {
      strongShaking: Math.round(strongShaking),
      moderateShaking: Math.round(moderateShaking),
      lightShaking: Math.round(lightShaking),
      totalAffected: Math.round(strongShaking + moderateShaking + lightShaking),
      cities,
      source: 'usgs-pager'
    }
  }

  private extractMMIFromLevel(level: string): number {
    const match = level?.toString().match(/mmi(\d+)/i)
    if (match) return parseInt(match[1], 10)
    const lower = (level || '').toLowerCase()
    if (lower.includes('red')) return 8
    if (lower.includes('orange')) return 6
    if (lower.includes('yellow')) return 4
    if (lower.includes('green')) return 2
    return 0
  }

  private parsePAGERJsonFlexible(pagerJson: any): PAGERData | null {
    try {
      if (pagerJson?.exposures && Array.isArray(pagerJson.exposures)) {
        return pagerJson as PAGERData
      }

      const exposures = pagerJson?.data?.exposures || pagerJson?.properties?.exposures || pagerJson?.exposure || []
      const cities = pagerJson?.cities || pagerJson?.data?.cities || []
      if (!Array.isArray(exposures) || exposures.length === 0) return null

      const normalized: PAGERData = {
        alertlevel: pagerJson?.alertlevel || pagerJson?.properties?.alertlevel || 'unknown',
        exposures: exposures.map((e: any) => ({
          level: String(e.level ?? e.mmi ?? e.name ?? ''),
          population: Number(e.population ?? e.pop ?? 0)
        })),
        cities: (Array.isArray(cities) ? cities : []).map((c: any) => ({
          name: String(c.name ?? c.city ?? 'Unknown'),
          population: Number(c.population ?? c.pop ?? 0),
          mmi: Number(c.mmi ?? c.intensity ?? 0),
          distance: Number(c.distance ?? c.dist ?? 0)
        })),
        version: Number(pagerJson?.version ?? 1)
      }

      return normalized
    } catch {
      return null
    }
  }
}

export const pagerService = new PAGERService()
