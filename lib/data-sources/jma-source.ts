import { EarthquakeFeature } from '@/types/earthquake'
import { BaseDataSource, FetchOptions, TsunamiAlert } from './base-source'

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
  private readonly tsunamiUrl = 'https://www.jma.go.jp/bosai/tsunami/data/list.json'
  private readonly userAgent = process.env.EXTERNAL_REQUEST_USER_AGENT || 'EmergencyAlertSystem/1.0'
  
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
            'User-Agent': this.userAgent
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
          'User-Agent': this.userAgent,
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

  /**
   * Fetch tsunami alerts from JMA
   * Uses dedicated tsunami list API for comprehensive coverage
   */
  async fetchTsunamiAlerts(): Promise<TsunamiAlert[]> {
    const fetchStartTime = Date.now()
    
    try {
      const lookbackMinutes = parseInt(process.env.JMA_LOOKBACK_MINUTES || '1440')

      const response = await fetch(this.tsunamiUrl, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'Accept': 'application/json',
          'User-Agent': this.userAgent,
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        this.recordFailure(new Error(`JMA tsunami fetch failed: ${response.status}`))
        return []
      }

      const tsunamiList = await response.json()
      const alerts: TsunamiAlert[] = []
      const now = Date.now()
      const cutoffTime = now - (lookbackMinutes * 60 * 1000)
      const seenEventIds = new Set<string>()

      for (const item of (Array.isArray(tsunamiList) ? tsunamiList : [])) {
        try {
          const timeIso = item.at || item.rdt
          if (!timeIso) continue

          const eventTime = Date.parse(timeIso)
          if (!isFinite(eventTime) || eventTime < cutoffTime) continue

          const eventId = item.eid || `${eventTime}_${item.cod}`
          if (seenEventIds.has(eventId)) continue
          seenEventIds.add(eventId)

          const kinds = item.kind || []
          if (kinds.length === 0) continue

          const { lon, lat } = this.parseCod(item.cod || '')
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

          const magnitude = parseFloat(item.mag || '0')
          const place = item.en_anm || item.anm || 'Japan region'

          let category = 'INFORMATION'
          let severity = 1
          let instructions = ''

          const maxCode = Math.max(...kinds.map((k: any) => parseInt(k.code || '0')))

          if (maxCode >= 300) {
            category = 'WARNING'
            severity = 5
            instructions = 'MAJOR TSUNAMI WARNING: Evacuate immediately to high ground. Tsunami waves of 3m or higher expected.'
          } else if (maxCode >= 220) {
            category = 'WARNING'
            severity = 4
            instructions = 'TSUNAMI WARNING: Evacuate coastal areas immediately. Tsunami waves of 1-3m expected.'
          } else if (maxCode >= 200) {
            category = 'ADVISORY'
            severity = 3
            instructions = 'TSUNAMI ADVISORY: Stay away from beaches and harbors. Waves up to 1m expected.'
          } else if (maxCode >= 100) {
            category = 'WATCH'
            severity = 2
            instructions = 'Tsunami forecast: Minor sea level changes expected. Monitor updates.'
          }

          const alert: TsunamiAlert = {
            id: `jma_tsunami_${eventId}`,
            source: 'JMA',
            title: `Tsunami ${category} - ${place}`,
            category,
            severity,
            latitude: lat,
            longitude: lon,
            affectedRegions: [place],
            issuedAt: new Date(eventTime),
            expiresAt: new Date(eventTime + 24 * 60 * 60 * 1000),
            description: `Magnitude ${magnitude.toFixed(1)} earthquake near ${place}. ${item.en_ttl || item.ttl || 'Tsunami information'}. ${instructions}`,
            instructions,
            rawData: { item, kinds }
          }

          alerts.push(alert)
        } catch (err) {
          continue
        }
      }

      console.log(`✅ JMA: ${alerts.length} tsunami alerts found from dedicated tsunami API`)

      this.recordSuccess()
      this.recordResponseTime(Date.now() - fetchStartTime)
      return alerts

    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error('Unknown error'))
      return []
    }
  }
}
