export interface EarthquakeFeature {
  type: 'Feature'
  properties: {
    mag: number
    place: string
    time: number
    updated: number
    tz: number | null
    url: string
    detail: string
    felt: number | null
    cdi: number | null
    mmi: number | null
    alert: string | null
    status: string
    tsunami: number
    sig: number
    net: string
    code: string
    ids: string
    sources: string
    types: string
    nst: number | null
    dmin: number | null
    rms: number
    gap: number | null
    magType: string
    type: string
    title: string
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number, number] // [longitude, latitude, depth]
  }
  id: string
}

export interface EarthquakeResponse {
  type: 'FeatureCollection'
  metadata: {
    generated: number
    url: string
    title: string
    status: number
    api: string
    count: number
  }
  features: EarthquakeFeature[]
}

export interface Contact {
  id: string
  name: string
  phone: string
  active: boolean
  createdAt: Date
}

export interface AlertLog {
  id: string
  earthquakeId: string
  magnitude: number
  location: string
  latitude?: number
  longitude?: number
  depth?: number
  timestamp: Date
  contactsNotified: number
  success: boolean
  errorMessage?: string
}
