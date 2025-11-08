'use client'

import { useState } from 'react'
import { Settings, Volume2, VolumeX, MessageSquare, MousePointer } from 'lucide-react'
import { useAudio } from '@/lib/audio/use-audio'

export function AudioSettingsPopover() {
  const [isOpen, setIsOpen] = useState(false)
  const { settings, ttsConfig, voices, updateSettings, updateTTSConfig } = useAudio()

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors relative"
        aria-label="Audio Settings"
      >
        <Settings className="w-5 h-5 text-slate-300" />
        {!settings.enabled && (
          <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[1500]"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-12 z-[1501] w-80 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-800/60 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Audio Settings
              </h3>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Master Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.enabled ? (
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-sm font-medium text-white">Audio Enabled</span>
                </div>
                <button
                  onClick={() => updateSettings({ enabled: !settings.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.enabled ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Master Volume */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Master Volume</span>
                  <span className="text-white font-medium">{Math.round(settings.masterVolume * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.masterVolume * 100}
                  onChange={(e) => updateSettings({ masterVolume: parseInt(e.target.value) / 100 })}
                  disabled={!settings.enabled}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: settings.enabled 
                      ? `linear-gradient(to right, rgb(34 211 238) 0%, rgb(34 211 238) ${settings.masterVolume * 100}%, rgb(51 65 85) ${settings.masterVolume * 100}%, rgb(51 65 85) 100%)`
                      : undefined
                  }}
                />
              </div>

              <div className="border-t border-white/10 my-3" />

              {/* Alert Sounds */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-white">Alert Sounds</span>
                </div>
                <button
                  onClick={() => updateSettings({ alerts: !settings.alerts })}
                  disabled={!settings.enabled}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    settings.alerts ? 'bg-orange-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.alerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* TTS Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-white">Voice Announcements</span>
                </div>
                <button
                  onClick={() => updateSettings({ tts: !settings.tts })}
                  disabled={!settings.enabled}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    settings.tts ? 'bg-purple-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.tts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* TTS Critical Only */}
              {settings.tts && (
                <div className="ml-6 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Critical Events Only</span>
                  <button
                    onClick={() => updateSettings({ ttsCriticalOnly: !settings.ttsCriticalOnly })}
                    disabled={!settings.enabled}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      settings.ttsCriticalOnly ? 'bg-red-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        settings.ttsCriticalOnly ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* UI Sounds */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-white">UI Sounds</span>
                </div>
                <button
                  onClick={() => updateSettings({ uiSounds: !settings.uiSounds })}
                  disabled={!settings.enabled}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    settings.uiSounds ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.uiSounds ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* TTS Voice Selection */}
              {settings.tts && voices.length > 0 && (
                <>
                  <div className="border-t border-white/10 my-3" />
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Voice</label>
                    <select
                      value={ttsConfig.voice || ''}
                      onChange={(e) => updateTTSConfig({ voice: e.target.value })}
                      disabled={!settings.enabled}
                      className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Default</option>
                      {voices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* TTS Speed */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 flex items-center justify-between">
                      <span>Speech Rate</span>
                      <span className="text-white font-medium">{ttsConfig.rate.toFixed(1)}x</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={ttsConfig.rate}
                      onChange={(e) => updateTTSConfig({ rate: parseFloat(e.target.value) })}
                      disabled={!settings.enabled}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-800/60 border-t border-white/10">
              <p className="text-xs text-slate-400">
                Settings are saved automatically
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
