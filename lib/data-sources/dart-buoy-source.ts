import { BaseDataSource, TsunamiAlert } from './base-source'

/**
 * DART (Deep-ocean Assessment and Reporting of Tsunamis) Buoy System
 * NOAA's network of bottom pressure recorders for tsunami detection
 * Coverage: Pacific, Atlantic, Indian Ocean (60+ buoys)
 * Update frequency: Real-time (15-second intervals during events)
 * 
 * Data License: US Public Domain (NOAA)
 * Attribution: Recommended - "Data from NOAA National Data Buoy Center"
 */
export class DARTBuoySource extends BaseDataSource {
  readonly name = 'DART'
  readonly coverage = ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Global']
  readonly updateFrequency = 300 // 5 minutes for non-event conditions

  private readonly baseUrl = 'https://www.ndbc.noaa.gov/data/realtime2/'
  
  // Active DART stations (subset - can be expanded)
  private readonly dartStations = [
    // Pacific Northwest
    { id: '46404', name: 'DART 46404', lat: 50.871, lon: -135.977, region: 'Northeast Pacific' },
    { id: '46407', name: 'DART 46407', lat: 52.649, lon: -150.006, region: 'Gulf of Alaska' },
    { id: '46409', name: 'DART 46409', lat: 45.863, lon: -128.768, region: 'Northeast Pacific' },
    
    // Eastern Pacific
    { id: '51407', name: 'DART 51407', lat: 19.614, lon: -156.517, region: 'Hawaii' },
    { id: '51425', name: 'DART 51425', lat: 23.482, lon: -162.085, region: 'Central Pacific' },
    
    // Western Pacific
    { id: '21413', name: 'DART 21413', lat: 30.516, lon: 152.117, region: 'Western Pacific' },
    { id: '21415', name: 'DART 21415', lat: 28.790, lon: 143.479, region: 'Western Pacific' },
    { id: '21418', name: 'DART 21418', lat: 49.292, lon: 171.849, region: 'Western Pacific' },
    
    // South Pacific
    { id: '55012', name: 'DART 55012', lat: -8.480, lon: -125.020, region: 'Southeast Pacific' },
    { id: '55015', name: 'DART 55015', lat: -19.621, lon: -85.813, region: 'Southeast Pacific' },
    
    // Indian Ocean
    { id: '23227', name: 'DART 23227', lat: 6.024, lon: 89.658, region: 'Indian Ocean' },
    { id: '23401', name: 'DART 23401', lat: -12.359, lon: 96.832, region: 'Indian Ocean' },
    
    // Atlantic
    { id: '41421', name: 'DART 41421', lat: 16.013, lon: -58.164, region: 'Caribbean' },
  ]

  protected async healthCheck(): Promise<void> {
    // Check if NDBC is accessible
    const response = await fetch('https://www.ndbc.noaa.gov/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      throw new Error(`DART health check failed: ${response.status}`)
    }
  }

  /**
   * Fetch tsunami detection data from DART buoys
   * Returns alerts when anomalous pressure changes detected
   */
  async fetchTsunamiAlerts(): Promise<TsunamiAlert[]> {
    const fetchStartTime = Date.now()
    const alerts: TsunamiAlert[] = []

    try {
      // Fetch data from multiple buoys in parallel
      const results = await Promise.allSettled(
        this.dartStations.map(station => this.fetchStationData(station))
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          alerts.push(result.value)
        }
      }

      this.recordSuccess()
      this.recordResponseTime(Date.now() - fetchStartTime)
      return alerts

    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error('Unknown error'))
      return []
    }
  }

  private async fetchStationData(station: typeof this.dartStations[0]): Promise<TsunamiAlert | null> {
    try {
      // DART buoys use .dart or .txt files
      // Format: https://www.ndbc.noaa.gov/data/realtime2/{station_id}.dart
      const url = `${this.baseUrl}${station.id}.dart`
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: {
          'User-Agent': 'EmergencyAlertSystem/1.0 (+https://weather-alert.app)'
        }
      })

      if (!response.ok) {
        // Try .txt fallback
        const txtUrl = `${this.baseUrl}${station.id}.txt`
        const txtResponse = await fetch(txtUrl, {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'EmergencyAlertSystem/1.0' }
        })
        
        if (!txtResponse.ok) return null
        
        const data = await txtResponse.text()
        return this.parseDARTData(data, station)
      }

      const data = await response.text()
      return this.parseDARTData(data, station)

    } catch (error) {
      // Individual station failures are expected (not all have .dart files)
      return null
    }
  }

  private parseDARTData(data: string, station: typeof this.dartStations[0]): TsunamiAlert | null {
    try {
      // DART data format (simplified):
      // Line 1: header info
      // Line 2: column headers
      // Data lines: timestamp, pressure readings
      
      const lines = data.trim().split('\n').filter(line => line.trim())
      if (lines.length < 3) return null

      // Parse most recent readings (last few lines)
      const recentLines = lines.slice(-10) // Last 10 readings
      const pressureValues: number[] = []
      const timestamps: Date[] = []

      for (const line of recentLines) {
        // Skip header lines (start with #)
        if (line.startsWith('#')) continue
        
        const parts = line.trim().split(/\s+/)
        if (parts.length < 5) continue

        // Typical format: YY MM DD hh mm pressure
        // Or: YYYY MM DD hh mm pressure
        try {
          const year = parts[0].length === 2 ? 2000 + parseInt(parts[0]) : parseInt(parts[0])
          const month = parseInt(parts[1]) - 1
          const day = parseInt(parts[2])
          const hour = parseInt(parts[3])
          const minute = parseInt(parts[4])
          
          const timestamp = new Date(Date.UTC(year, month, day, hour, minute))
          
          // Pressure value (usually in last column, could be column 5 or later)
          const pressureStr = parts[parts.length - 1]
          const pressure = parseFloat(pressureStr)
          
          if (!isNaN(pressure) && pressure > 0 && pressure < 20000) {
            pressureValues.push(pressure)
            timestamps.push(timestamp)
          }
        } catch {
          continue
        }
      }

      if (pressureValues.length < 3) return null

      // Detect tsunami signature: rapid pressure change
      const anomaly = this.detectTsunamiAnomaly(pressureValues, timestamps)
      
      if (anomaly.detected) {
        const latestTime = timestamps[timestamps.length - 1]
        const ageMinutes = (Date.now() - latestTime.getTime()) / 60000
        
        // Only alert if data is recent (within 30 minutes)
        if (ageMinutes > 30) return null

        return {
          id: `dart_${station.id}_${latestTime.getTime()}`,
          source: 'DART',
          title: `Tsunami Wave Detected - ${station.name}`,
          category: anomaly.category,
          severity: anomaly.severity,
          latitude: station.lat,
          longitude: station.lon,
          affectedRegions: [station.region],
          issuedAt: latestTime,
          expiresAt: new Date(latestTime.getTime() + 3 * 60 * 60 * 1000), // 3 hours
          description: `DART buoy ${station.name} has detected ${anomaly.description}. This is a direct measurement of tsunami wave activity in the open ocean.`,
          instructions: anomaly.instructions,
          rawData: {
            station: station.id,
            pressureChange: anomaly.change,
            readings: pressureValues.slice(-5)
          }
        }
      }

      return null

    } catch (error) {
      return null
    }
  }

  private detectTsunamiAnomaly(pressures: number[], timestamps: Date[]): {
    detected: boolean
    category: string
    severity: number
    change: number
    description: string
    instructions: string
  } {
    // Calculate pressure change rate
    // Tsunami signature: rapid change in bottom pressure (several cm of water)
    // Normal tides: ~1cm/min, Tsunami: 5-30cm in minutes
    
    if (pressures.length < 3) {
      return { detected: false, category: 'INFORMATION', severity: 1, change: 0, description: '', instructions: '' }
    }

    // Calculate max change over last readings
    const recent = pressures.slice(-5)
    const min = Math.min(...recent)
    const max = Math.max(...recent)
    const change = max - min // cm of water column

    // Time span
    const timeSpan = (timestamps[timestamps.length - 1].getTime() - timestamps[timestamps.length - 5].getTime()) / 60000 // minutes

    let detected = false
    let category = 'INFORMATION'
    let severity = 1
    let description = ''
    let instructions = ''

    // Thresholds (in cm of pressure change)
    if (change > 50 && timeSpan < 15) {
      // Major tsunami wave (>50cm change in <15 min)
      detected = true
      category = 'WARNING'
      severity = 5
      description = 'a major tsunami wave with pressure change exceeding 50cm'
      instructions = 'IMMEDIATE EVACUATION: Large tsunami wave confirmed in open ocean. Coastal areas in wave path should evacuate immediately to high ground.'
    } else if (change > 20 && timeSpan < 20) {
      // Significant tsunami wave
      detected = true
      category = 'WARNING'
      severity = 4
      description = 'a significant tsunami wave with pressure change exceeding 20cm'
      instructions = 'TSUNAMI CONFIRMED: Ocean bottom pressure sensors confirm tsunami wave. Evacuate coastal areas along wave trajectory.'
    } else if (change > 10 && timeSpan < 30) {
      // Moderate tsunami wave
      detected = true
      category = 'ADVISORY'
      severity = 3
      description = 'a moderate tsunami wave with measurable pressure changes'
      instructions = 'Tsunami wave detected. Stay away from beaches, harbors, and low-lying coastal areas. Follow local emergency instructions.'
    } else if (change > 5 && timeSpan < 30) {
      // Minor anomaly
      detected = true
      category = 'WATCH'
      severity = 2
      description = 'minor pressure anomalies that may indicate tsunami activity'
      instructions = 'Possible tsunami activity detected. Monitor updates and be prepared to move to higher ground if advised.'
    }

    return { detected, category, severity, change, description, instructions }
  }
}
