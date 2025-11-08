export type RecordingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type RecordingEvent = {
  timestamp: number // milliseconds from start
  type: 'audio' | 'tts'
  event?: string // for audio events
  text?: string // for TTS
  severity?: 'critical' | 'high' | 'moderate' | 'low'
}

export type RecordingOptions = {
  scenarioId: string
  viewport?: {
    width: number
    height: number
  }
  maxDuration?: number // seconds
  outputPath?: string
}

export type RecordingJob = {
  id: string
  status: RecordingStatus
  progress: number // 0-100
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
  downloadUrl?: string
  metadata?: {
    scenarioId: string
    duration?: number
    resolution?: string
    vesselsAffected?: number
    criticalVessels?: number
  }
}

export type RecordingResult = {
  success: boolean
  path?: string
  error?: string
  duration?: number
  events?: RecordingEvent[]
}
