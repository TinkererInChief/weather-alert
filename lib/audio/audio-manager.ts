import { Howl } from 'howler'
import type { AudioEvent, AudioSettings, TTSConfig } from './types'
import { defaultAudioSettings, defaultTTSConfig } from './types'

type SoundRegistry = Record<AudioEvent, Howl | null>

class AudioManager {
  private settings: AudioSettings
  private ttsConfig: TTSConfig
  private sounds: Partial<SoundRegistry> = {}
  private lastTTSTime = 0
  private readonly TTS_MIN_INTERVAL = 5000 // 5 seconds

  constructor() {
    this.settings = this.loadSettings()
    this.ttsConfig = this.loadTTSConfig()
    this.initializeSounds()
  }

  private loadSettings(): AudioSettings {
    if (typeof window === 'undefined') return defaultAudioSettings
    
    try {
      const stored = localStorage.getItem('audio_settings')
      if (stored) {
        return { ...defaultAudioSettings, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.warn('Failed to load audio settings:', error)
    }
    return defaultAudioSettings
  }

  private loadTTSConfig(): TTSConfig {
    if (typeof window === 'undefined') return defaultTTSConfig
    
    try {
      const stored = localStorage.getItem('tts_config')
      if (stored) {
        return { ...defaultTTSConfig, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.warn('Failed to load TTS config:', error)
    }
    return defaultTTSConfig
  }

  private initializeSounds() {
    if (typeof window === 'undefined') return
    
    // Map audio events to earcon files
    const soundMap: Partial<Record<AudioEvent, string>> = {
      'simulation:start': '/audio/earcons/start.mp3',
      'simulation:complete': '/audio/earcons/complete.mp3',
      'vessel:first_affected': '/audio/earcons/alert.mp3',
      'severity:critical': '/audio/earcons/critical.mp3',
      'severity:high': '/audio/earcons/high.mp3',
      'escalation:step_started': '/audio/earcons/step.mp3',
      'notification:sent:sms': '/audio/earcons/notification.mp3',
      'notification:sent:whatsapp': '/audio/earcons/notification.mp3',
      'notification:sent:voice': '/audio/earcons/notification.mp3',
      'notification:sent:email': '/audio/earcons/notification.mp3',
      'ui:click': '/audio/earcons/click.mp3',
      'ui:error': '/audio/earcons/error.mp3'
    }

    console.log('🔊 Initializing audio manager...')
    
    Object.entries(soundMap).forEach(([event, src]) => {
      try {
        const sound = new Howl({
          src: [src],
          volume: this.settings.masterVolume,
          preload: true,
          html5: false, // Use Web Audio API for better performance
          onload: () => {
            console.log(`✓ Loaded: ${event}`)
          },
          onloaderror: (id, error) => {
            console.error(`✗ Failed to load ${event} (${src}):`, error)
          }
        })
        this.sounds[event as AudioEvent] = sound
      } catch (error) {
        console.warn(`Failed to create Howl for ${event}:`, error)
      }
    })
    
    console.log(`✓ Audio manager initialized with ${Object.keys(this.sounds).length} sounds`)
  }

  play(event: AudioEvent, options?: { force?: boolean }) {
    if (!this.settings.enabled && !options?.force) {
      console.log(`🔇 Audio disabled, skipping: ${event}`)
      return
    }

    // Check category permissions
    const isAlert = event.startsWith('vessel:') || event.startsWith('severity:') || event.startsWith('escalation:')
    const isNotification = event.startsWith('notification:')
    const isUI = event.startsWith('ui:')

    if (isAlert && !this.settings.alerts) {
      console.log(`🔇 Alerts disabled, skipping: ${event}`)
      return
    }
    if (isUI && !this.settings.uiSounds) {
      console.log(`🔇 UI sounds disabled, skipping: ${event}`)
      return
    }
    if (isNotification && !this.settings.alerts) {
      console.log(`🔇 Alerts disabled, skipping: ${event}`)
      return
    }

    const sound = this.sounds[event]
    if (sound) {
      console.log(`🔊 Playing: ${event}`)
      sound.volume(this.settings.masterVolume)
      sound.play()
    } else {
      console.warn(`⚠️ Sound not found: ${event}`)
    }
  }

  speak(text: string, options?: { force?: boolean; severity?: 'critical' | 'high' | 'moderate' | 'low' }) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('⚠️ Speech synthesis not available')
      return
    }
    
    if (!this.settings.enabled && !options?.force) {
      console.log(`🔇 Audio disabled, skipping TTS: "${text.substring(0, 30)}..."`)
      return
    }
    
    if (!this.settings.tts) {
      console.log(`🔇 TTS disabled, skipping: "${text.substring(0, 30)}..."`)
      return
    }

    // Check if we should speak based on severity
    if (this.settings.ttsCriticalOnly && options?.severity !== 'critical') {
      console.log(`🔇 TTS Critical-only mode, skipping ${options?.severity}: "${text.substring(0, 30)}..."`)
      return
    }

    // Rate limiting
    const now = Date.now()
    if (now - this.lastTTSTime < this.TTS_MIN_INTERVAL && !options?.force) {
      console.log(`🔇 TTS rate limited (${Math.round((now - this.lastTTSTime) / 1000)}s since last)`)
      return
    }

    this.lastTTSTime = now

    console.log(`🗣️ Speaking (${options?.severity || 'default'}): "${text}"`)

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = this.ttsConfig.rate
    utterance.pitch = this.ttsConfig.pitch
    utterance.volume = this.ttsConfig.volume * this.settings.masterVolume

    if (this.ttsConfig.voice) {
      const voices = window.speechSynthesis.getVoices()
      const voice = voices.find(v => v.name === this.ttsConfig.voice)
      if (voice) utterance.voice = voice
    }

    utterance.onstart = () => {
      console.log('✓ TTS started')
    }
    
    utterance.onend = () => {
      console.log('✓ TTS completed')
    }
    
    utterance.onerror = (event) => {
      console.error('✗ TTS error:', event)
    }

    window.speechSynthesis.speak(utterance)
  }

  updateSettings(settings: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...settings }
    
    // Update all sound volumes
    Object.values(this.sounds).forEach(sound => {
      if (sound) sound.volume(this.settings.masterVolume)
    })

    // Persist
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('audio_settings', JSON.stringify(this.settings))
      } catch (error) {
        console.warn('Failed to save audio settings:', error)
      }
    }
  }

  updateTTSConfig(config: Partial<TTSConfig>) {
    this.ttsConfig = { ...this.ttsConfig, ...config }
    
    // Persist
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tts_config', JSON.stringify(this.ttsConfig))
      } catch (error) {
        console.warn('Failed to save TTS config:', error)
      }
    }
  }

  getSettings(): AudioSettings {
    return { ...this.settings }
  }

  getTTSConfig(): TTSConfig {
    return { ...this.ttsConfig }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !window.speechSynthesis) return []
    return window.speechSynthesis.getVoices()
  }
}

// Singleton instance
export const audioManager = new AudioManager()
