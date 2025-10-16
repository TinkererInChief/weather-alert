import { EarthquakeFeature } from '@/types/earthquake'
import { BaseDataSource, FetchOptions } from './base-source'

/**
 * JMA (Japan Meteorological Agency) earthquake data source
 * Coverage: Japan, Western Pacific
 * Update frequency: Real-time (critical for tsunami detection)
 * 
 * Note: JMA provides data in Japanese format. We use their English API endpoint.
 */
export class JMASource extends BaseDataSource {
  readonly name = 'JMA'
  readonly coverage = ['Japan', 'Western Pacific', 'East Asia']
  readonly updateFrequency = 60 // seconds
  
  private readonly baseUrl = 'https://www.data.jma.go.jp/multi/quake/'
  private readonly bosaiUrl = 'https://www.jma.go.jp/bosai/quake/data/list.json'
  
  protected async healthCheck(): Promise<void> {
    // Simple health check - try to fetch the main page
    const response = await fetch('https://www.data.jma.go.jp/multi/quake/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      throw new Error(`JMA health check failed: ${response.status}`)
    }
  }
  
  async fetchEarthquakes(options?: FetchOptions): Promise<EarthquakeFeature[]> {
    const fetchStartTime = Date.now()
    
    try {
      const parserEnabled = process.env.JMA_PARSER_ENABLED === 'true'
      if (!parserEnabled) {
        const response = await fetch(this.baseUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(8000),
          headers: {
            'User-Agent': 'EmergencyAlertSystem/1.0'
          }
        })
        if (response.ok) {
          this.recordSuccess()
          this.recordResponseTime(Date.now() - fetchStartTime)
        } else {
          this.recordFailure(new Error(`JMA HEAD failed: ${response.status}`))
        }
        return []
      }

      const response = await fetch(this.bosaiUrl, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EmergencyAlertSystem/1.0',
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        this.recordFailure(new Error(`JMA bosai fetch failed: ${response.status}`))
        return []
      }

      const data = await response.json()
      this.recordSuccess()
      this.recordResponseTime(Date.now() - fetchStartTime)

      const earthquakes = this.convertBosaiToStandard(data, options)
      return earthquakes

    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error('Unknown error'))
      return []
    }
  }
  
  private convertBosaiToStandard(data: any, options?: FetchOptions): EarthquakeFeature[] {
    const arr: any[] = Array.isArray(data) ? data : []
    const out: EarthquakeFeature[] = []
    const minMag = options?.minMagnitude || 0

    for (const item of arr) {
      try {
        const mag = parseFloat(item.mag || item.magnitude || '0')
        if (!isFinite(mag) || mag < minMag) continue

        const { lon, lat, depthKm } = this.parseCod(item.cod || '')
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

        const timeIso: string = item.at || item.rdt || null
        const timeMs = timeIso ? Date.parse(timeIso) : Date.now()
        if (!isFinite(timeMs)) continue

        const place: string = item.en_anm || item.anm || 'Japan region'
        const id: string = String(item.eid || item.ctt || `${timeMs}_${lat}_${lon}`)
        const detailRel: string | undefined = item.json
        const detailUrl = detailRel ? `https://www.jma.go.jp/bosai/quake/data/${detailRel}` : 'https://www.jma.go.jp/bosai/quake/'

        const eq: EarthquakeFeature = {
          type: 'Feature',
          id: `jma_${id}`,
          properties: {
            mag,
            place,
            time: timeMs,
            updated: timeMs,
            tz: 540,
            url: 'https://www.jma.go.jp/bosai/quake/',
            detail: detailUrl,
            felt: null,
            cdi: null,
            mmi: null,
            alert: null,
            status: 'reviewed',
            tsunami: 0,
            sig: Math.round(mag * 100),
            net: 'jma',
            code: String(item.eid || ''),
            ids: `jma${item.eid || ''}`,
            sources: 'jma',
            types: 'origin,magnitude',
            nst: null,
            dmin: null,
            rms: 0,
            gap: null,
            magType: 'M',
            type: 'earthquake',
            title: `M ${mag.toFixed(1)} - ${place}`
          },
          geometry: {
            type: 'Point',
            coordinates: [lon, lat, depthKm]
          }
        }

        out.push(eq)
      } catch {
        continue
      }
    }

    return out
  }

  private parseCod(cod: string): { lon: number; lat: number; depthKm: number } {
    const m = cod && typeof cod === 'string' ? cod.match(/([+-]\d+\.?\d*)([+-]\d+\.?\d*)([+-]\d+)(?:\/)?/) : null
    if (m) {
      const lat = parseFloat(m[1])
      const lon = parseFloat(m[2])
      const depthMeters = Math.abs(parseFloat(m[3]))
      const depthKm = isFinite(depthMeters) ? depthMeters / 1000 : 10
      return { lon, lat, depthKm }
    }
    return { lon: Number.NaN, lat: Number.NaN, depthKm: 10 }
  }

  private convertJMAToStandard(data: any, options?: FetchOptions): EarthquakeFeature[] {
    // JMA data structure varies - this is a generic parser
    const earthquakes: EarthquakeFeature[] = []
    
    if (!data || !Array.isArray(data)) {
      return earthquakes
    }
    
    const minMag = options?.minMagnitude || 0
    
    for (const item of data) {
      try {
        // JMA typically provides: magnitude, epicenter, depth, time
        const magnitude = this.parseMagnitude(item)
        const coordinates = this.parseCoordinates(item)
        const time = this.parseTime(item)
        const location = this.parseLocation(item)
        const depth = this.parseDepth(item)

        if (magnitude < minMag) continue
        if (!Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) continue
        
        const earthquake: EarthquakeFeature = {
          type: 'Feature',
          id: `jma_${item.id || `${time}_${coordinates[0]}_${coordinates[1]}`}`,
          properties: {
            mag: magnitude,
            place: location,
            time: time,
            updated: time,
            tz: 540, // JST is UTC+9
            url: `https://www.data.jma.go.jp/multi/quake/`,
            detail: '',
            felt: null,
            cdi: null,
            mmi: null,
            alert: null,
            status: 'reviewed', // JMA data is typically reviewed
            tsunami: item.tsunami || 0,
            sig: Math.round(magnitude * 100),
            net: 'jma',
            code: String(item.id || ''),
            ids: `jma${item.id || ''}`,
            sources: 'jma',
            types: 'origin,magnitude',
            nst: null,
            dmin: null,
            rms: 0,
            gap: null,
            magType: 'M',
            type: 'earthquake',
            title: `M ${magnitude.toFixed(1)} - ${location}`
          },
          geometry: {
            type: 'Point',
            coordinates: [coordinates[0], coordinates[1], depth]
          }
        }
        
        earthquakes.push(earthquake)
      } catch (err) {
        console.warn('Failed to parse JMA earthquake:', err)
        continue
      }
    }
    
    return earthquakes
  }
  
  private parseMagnitude(item: any): number {
    return parseFloat(item.magnitude || item.mag || item.M || 0)
  }
  
  private parseCoordinates(item: any): [number, number] {
    // JMA might provide coordinates in various formats
    if (item.longitude && item.latitude) {
      return [parseFloat(item.longitude), parseFloat(item.latitude)]
    }
    if (item.lon && item.lat) {
      return [parseFloat(item.lon), parseFloat(item.lat)]
    }
    if (item.coordinates && Array.isArray(item.coordinates)) {
      return [item.coordinates[0], item.coordinates[1]]
    }
    return [Number.NaN, Number.NaN]
  }
  
  private parseTime(item: any): number {
    if (item.time) {
      return new Date(item.time).getTime()
    }
    if (item.timestamp) {
      return new Date(item.timestamp).getTime()
    }
    if (item.datetime) {
      return new Date(item.datetime).getTime()
    }
    return Date.now()
  }
  
  private parseLocation(item: any): string {
    return item.location || item.place || item.region || item.epicenter || 'Japan region'
  }
  
  private parseDepth(item: any): number {
    const depth = parseFloat(item.depth || item.dep || 10)
    return isNaN(depth) ? 10 : depth
  }
}
