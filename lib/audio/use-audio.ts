'use client'

import { useEffect, useState, useCallback } from 'react'
import { audioManager } from './audio-manager'
import type { AudioSettings, TTSConfig, AudioEvent } from './types'

export function useAudio() {
  const [settings, setSettings] = useState<AudioSettings>(audioManager.getSettings())
  const [ttsConfig, setTTSConfig] = useState<TTSConfig>(audioManager.getTTSConfig())
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    // Load voices
    const loadVoices = () => {
      setVoices(audioManager.getAvailableVoices())
    }

    loadVoices()

    // Voices may load asynchronously
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  const play = useCallback((event: AudioEvent, options?: { force?: boolean }) => {
    audioManager.play(event, options)
  }, [])

  const speak = useCallback((text: string, options?: { force?: boolean; severity?: 'critical' | 'high' | 'moderate' | 'low' }) => {
    audioManager.speak(text, options)
  }, [])

  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    audioManager.updateSettings(newSettings)
    setSettings(audioManager.getSettings())
  }, [])

  const updateTTSConfig = useCallback((newConfig: Partial<TTSConfig>) => {
    audioManager.updateTTSConfig(newConfig)
    setTTSConfig(audioManager.getTTSConfig())
  }, [])

  return {
    settings,
    ttsConfig,
    voices,
    play,
    speak,
    updateSettings,
    updateTTSConfig
  }
}
