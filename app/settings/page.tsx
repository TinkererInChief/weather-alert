'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Bell, Shield, Globe, Phone, Mail, MessageSquare, MessageCircle, AlertTriangle } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'

interface SystemSettings {
  monitoring: {
    earthquakeMonitoring: boolean
    tsunamiMonitoring: boolean
    checkInterval: number
    magnitudeThreshold: number
  }
  notifications: {
    sms: { enabled: boolean, priority: number }
    email: { enabled: boolean, priority: number }
    whatsapp: { enabled: boolean, priority: number }
    voice: { enabled: boolean, priority: number }
  }
  alertLevels: {
    low: { magnitude: number, channels: string[] }
    medium: { magnitude: number, channels: string[] }
    high: { magnitude: number, channels: string[] }
    critical: { magnitude: number, channels: string[] }
  }
  system: {
    timezone: string
    language: string
    logLevel: 'error' | 'warn' | 'info' | 'debug'
    retentionDays: number
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Mock settings - in production, load from API
      const mockSettings: SystemSettings = {
        monitoring: {
          earthquakeMonitoring: true,
          tsunamiMonitoring: true,
          checkInterval: 60, // seconds
          magnitudeThreshold: 4.0
        },
        notifications: {
          sms: { enabled: true, priority: 1 },
          email: { enabled: true, priority: 3 },
          whatsapp: { enabled: true, priority: 2 },
          voice: { enabled: true, priority: 4 }
        },
        alertLevels: {
          low: { magnitude: 4.0, channels: ['sms', 'email'] },
          medium: { magnitude: 5.0, channels: ['sms', 'email', 'whatsapp'] },
          high: { magnitude: 6.0, channels: ['sms', 'email', 'whatsapp', 'voice'] },
          critical: { magnitude: 7.0, channels: ['sms', 'email', 'whatsapp', 'voice'] }
        },
        system: {
          timezone: 'Asia/Kolkata',
          language: 'en',
          logLevel: 'info',
          retentionDays: 90
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500))
      setSettings(mockSettings)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    setSaving(true)
    try {
      // Mock save - in production, send to API
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      setSaveMessage('Failed to save settings. Please try again.')
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (path: string[], value: any) => {
    if (!settings) return

    const newSettings = { ...settings }
    let current: any = newSettings

    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]]
    }
    current[path[path.length - 1]] = value

    setSettings(newSettings)
  }

  if (loading) {
    return (
      <AppLayout title="Settings">
        <div className="animate-pulse space-y-6">
          <div className="h-8 loading-shimmer rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 loading-shimmer rounded-xl"></div>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout 
      title="System Settings" 
      breadcrumbs={[{ label: 'Settings' }]}
    >
      <div className="space-y-8">
        {/* Save Actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-600">Configure system behavior and notification preferences</p>
          </div>
          <div className="flex items-center space-x-4">
            {saveMessage && (
              <div className={`px-3 py-1 rounded-lg text-sm ${
                saveMessage.includes('success') 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {saveMessage}
              </div>
            )}
            <button
              onClick={saveSettings}
              disabled={saving}
              className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monitoring Settings */}
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Monitoring Configuration
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-slate-900">Earthquake Monitoring</label>
                  <p className="text-sm text-slate-600">Monitor USGS earthquake feeds</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings?.monitoring.earthquakeMonitoring}
                  onChange={(e) => updateSettings(['monitoring', 'earthquakeMonitoring'], e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-slate-900">Tsunami Monitoring</label>
                  <p className="text-sm text-slate-600">Monitor tsunami warning centers</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings?.monitoring.tsunamiMonitoring}
                  onChange={(e) => updateSettings(['monitoring', 'tsunamiMonitoring'], e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-900 mb-2">Check Interval (seconds)</label>
                <input
                  type="number"
                  value={settings?.monitoring.checkInterval}
                  onChange={(e) => updateSettings(['monitoring', 'checkInterval'], parseInt(e.target.value))}
                  className="form-input w-full"
                  min="30"
                  max="3600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-900 mb-2">Magnitude Threshold</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings?.monitoring.magnitudeThreshold}
                  onChange={(e) => updateSettings(['monitoring', 'magnitudeThreshold'], parseFloat(e.target.value))}
                  className="form-input w-full"
                  min="1.0"
                  max="9.0"
                />
              </div>
            </div>
          </div>

          {/* Notification Channels */}
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Channels
            </h3>
            
            <div className="space-y-4">
              {settings && Object.entries(settings.notifications).map(([channel, config]) => (
                <div key={channel} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {channel === 'sms' && <MessageSquare className="h-5 w-5 text-green-500" />}
                    {channel === 'email' && <Mail className="h-5 w-5 text-blue-500" />}
                    {channel === 'whatsapp' && <MessageCircle className="h-5 w-5 text-green-600" />}
                    {channel === 'voice' && <Phone className="h-5 w-5 text-red-500" />}
                    <div>
                      <span className="font-medium text-slate-900 capitalize">{channel}</span>
                      <p className="text-sm text-slate-600">Priority: {config.priority}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => updateSettings(['notifications', channel, 'enabled'], e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Alert Levels */}
          <div className="card lg:col-span-2">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alert Level Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {settings && Object.entries(settings.alertLevels).map(([level, config]) => (
                <div key={level} className="p-4 border border-slate-200 rounded-lg">
                  <h4 className="font-medium text-slate-900 capitalize mb-2">{level} Alert</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm text-slate-600">Magnitude ≥</label>
                      <input
                        type="number"
                        step="0.1"
                        value={config.magnitude}
                        onChange={(e) => updateSettings(['alertLevels', level, 'magnitude'], parseFloat(e.target.value))}
                        className="form-input w-full mt-1"
                        min="1.0"
                        max="9.0"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Channels</label>
                      <div className="mt-1 space-y-1">
                        {['sms', 'email', 'whatsapp', 'voice'].map(channel => (
                          <label key={channel} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={config.channels.includes(channel)}
                              onChange={(e) => {
                                const newChannels = e.target.checked
                                  ? [...config.channels, channel]
                                  : config.channels.filter(c => c !== channel)
                                updateSettings(['alertLevels', level, 'channels'], newChannels)
                              }}
                              className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm capitalize">{channel}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Settings */}
          <div className="card lg:col-span-2">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Timezone</label>
                <select
                  value={settings?.system.timezone}
                  onChange={(e) => updateSettings(['system', 'timezone'], e.target.value)}
                  className="form-input w-full"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>

              <div>
                <label className="form-label">Language</label>
                <select
                  value={settings?.system.language}
                  onChange={(e) => updateSettings(['system', 'language'], e.target.value)}
                  className="form-input w-full"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="es">Spanish</option>
                </select>
              </div>

              <div>
                <label className="form-label">Log Level</label>
                <select
                  value={settings?.system.logLevel}
                  onChange={(e) => updateSettings(['system', 'logLevel'], e.target.value)}
                  className="form-input w-full"
                >
                  <option value="error">Error</option>
                  <option value="warn">Warning</option>
                  <option value="info">Info</option>
                  <option value="debug">Debug</option>
                </select>
              </div>

              <div>
                <label className="form-label">Data Retention (days)</label>
                <input
                  type="number"
                  value={settings?.system.retentionDays}
                  onChange={(e) => updateSettings(['system', 'retentionDays'], parseInt(e.target.value))}
                  className="form-input w-full"
                  min="7"
                  max="365"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
