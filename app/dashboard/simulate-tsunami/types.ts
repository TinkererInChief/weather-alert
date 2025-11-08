export type Scenario = {
  id: string
  name: string
  emoji: string
  epicenter: {
    lat: number
    lon: number
  }
  magnitude: number
  region: string
  description: string
  // Enhanced physics parameters
  depth?: number // Earthquake focal depth (km)
  faultType?: 'thrust' | 'strike-slip' | 'normal'
  faultStrike?: number // Fault orientation (0-360°)
  faultLength?: number // km
  faultWidth?: number // km
}

export type VesselMarker = {
  id: string
  name: string
  mmsi: string
  position: {
    lat: number
    lon: number
  }
  distance?: number
  waveHeight?: number
  eta?: number
  severity?: 'critical' | 'high' | 'moderate' | 'low'
}

export type EscalationContact = {
  name: string
  role: string
  priority: number
  phone?: string | null
  email?: string | null
}

export type NotificationChannel = 'SMS' | 'WHATSAPP' | 'VOICE_CALL' | 'EMAIL'

export type EscalationStep = {
  stepNumber: number
  waitMinutes: number
  notifyRoles: string[]
  channels: NotificationChannel[]
  contacts: EscalationContact[]
  status?: 'pending' | 'executing' | 'completed' | 'failed'
  notificationsSent?: number
}

export type VesselAlert = {
  alertId: string
  vessel: {
    id: string
    name: string
    mmsi: string
  }
  distance: number
  waveHeight: number
  eta: number
  severity: string
  policy: {
    id: string
    name: string
    steps: any
  }
  escalation: {
    success: boolean
    notificationsSent: number
    steps?: EscalationStep[]
  }
  contacts: EscalationContact[]
}

export type SimulationResult = {
  success: boolean
  dryRun?: boolean
  simulation?: {
    epicenter: { lat: number; lon: number }
    magnitude: number
    tsunamiSpeed: number
    affectedVessels: Array<{
      vessel: {
        id: string
        name: string
        mmsi: string
        position?: {
          lat: number
          lon: number
        }
      }
      distance: number
      waveHeight: number
      eta: number
      severity: string
      position?: {
        latitude: number
        longitude: number
      }
    }>
    summary: {
      totalVessels: number
      affectedVessels: number
      alertsCreated: number
      notificationsSent: number
    }
    alerts?: VesselAlert[]
    logs: string[]
  }
}
