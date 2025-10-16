export type EventType = 'earthquake' | 'tsunami'

export type EarthquakeEvent = {
  id: string
  magnitude: number
  location: string
  latitude: number
  longitude: number
  depth: number // km
  time: string | Date
  place?: string
  significance?: number
  alert?: string
  tsunami?: number
  felt?: number
  cdi?: number
  mmi?: number
  source?: string
}

export type TsunamiEvent = {
  id: string
  location: string
  latitude?: number
  longitude?: number
  magnitude?: number
  time: string | Date
  threatLevel: 'advisory' | 'watch' | 'warning' | 'information' | 'info'
  ocean: string
  type?: string
  eventId?: string
  source?: string
}

export type EventHoverData = EarthquakeEvent | TsunamiEvent

export type PopulationImpact = {
  strongShaking: number
  moderateShaking: number
  lightShaking: number
  totalAffected?: number
  cities: Array<{
    name: string
    population: number
    intensity: 'Strong' | 'Moderate' | 'Light' | 'Weak'
    distance: number // km from epicenter
  }>
  source?: 'usgs-pager' | 'geonames-estimated' | 'no-data' | 'error'
  message?: string // For empty/error states
  dataSource?: string // Attribution text
}

export type ShakingRadius = {
  strong: number // km
  moderate: number // km
  light: number // km
  weak: number // km
}

export type TsunamiETAData = {
  targetLocation: string
  distance: number // km
  eta: Date
  countdown: number // minutes
  waveSpeed: number // km/h
}
