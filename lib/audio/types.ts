export type AudioEvent = 
  | 'simulation:start'
  | 'simulation:complete'
  | 'vessel:first_affected'
  | 'severity:critical'
  | 'severity:high'
  | 'escalation:step_started'
  | 'notification:sent:sms'
  | 'notification:sent:whatsapp'
  | 'notification:sent:voice'
  | 'notification:sent:email'
  | 'ui:click'
  | 'ui:error'

export type AudioSettings = {
  enabled: boolean
  masterVolume: number // 0-1
  alerts: boolean
  tts: boolean
  ttsCriticalOnly: boolean
  uiSounds: boolean
}

export const defaultAudioSettings: AudioSettings = {
  enabled: true,
  masterVolume: 0.7,
  alerts: true,
  tts: true,
  ttsCriticalOnly: true,
  uiSounds: true
}

export type TTSConfig = {
  rate: number // 0.1-10
  pitch: number // 0-2
  volume: number // 0-1
  voice?: string
}

export const defaultTTSConfig: TTSConfig = {
  rate: 1.0,
  pitch: 1.0,
  volume: 0.9
}
