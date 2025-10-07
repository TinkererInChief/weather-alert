'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, RefreshCw, Database, Bell, Globe, Shield, Loader2, Check, X } from 'lucide-react'

type SystemSettings = {
  alerting: {
    enabled: boolean
    autoDispatch: boolean
    minMagnitude: number
    maxContactsPerAlert: number
  }
  notifications: {
    smsEnabled: boolean
    emailEnabled: boolean
    whatsappEnabled: boolean
    voiceEnabled: boolean
  }
  dataSources: {
    usgsEnabled: boolean
    emscEnabled: boolean
    noaaEnabled: boolean
    ptwcEnabled: boolean
    jmaEnabled: boolean
  }
  system: {
    maintenanceMode: boolean
    apiRateLimit: number
    logRetentionDays: number
  }
}

const defaultSettings: SystemSettings = {
  alerting: {
    enabled: true,
    autoDispatch: true,
    minMagnitude: 5.0,
    maxContactsPerAlert: 1000
  },
  notifications: {
    smsEnabled: true,
    emailEnabled: true,
    whatsappEnabled: true,
    voiceEnabled: true
  },
  dataSources: {
    usgsEnabled: true,
    emscEnabled: true,
    noaaEnabled: true,
    ptwcEnabled: true,
    jmaEnabled: true
  },
  system: {
    maintenanceMode: false,
    apiRateLimit: 100,
    logRetentionDays: 90
  }
}

export default function SystemSettingsPanel() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings({ ...defaultSettings, ...data.settings })
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus('idle')
    
    try {
      const response = await fetch('/api/admin/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (category: keyof SystemSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Save Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">System Settings</h2>
          <p className="text-sm text-slate-600">Configure platform-wide settings and behavior</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saveStatus === 'success' ? (
            <Check className="h-4 w-4" />
          ) : saveStatus === 'error' ? (
            <X className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Error!' : 'Save Changes'}
        </button>
      </div>

      {/* Alerting Settings */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Alerting</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-slate-700">Alert System Enabled</label>
              <p className="text-sm text-slate-500">Enable or disable the entire alert system</p>
            </div>
            <input
              type="checkbox"
              checked={settings.alerting.enabled}
              onChange={(e) => updateSetting('alerting', 'enabled', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-slate-700">Auto-Dispatch Alerts</label>
              <p className="text-sm text-slate-500">Automatically send alerts for qualifying events</p>
            </div>
            <input
              type="checkbox"
              checked={settings.alerting.autoDispatch}
              onChange={(e) => updateSetting('alerting', 'autoDispatch', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-2">Minimum Magnitude Threshold</label>
            <input
              type="number"
              step="0.1"
              value={settings.alerting.minMagnitude}
              onChange={(e) => updateSetting('alerting', 'minMagnitude', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-slate-500 mt-1">Only send alerts for earthquakes above this magnitude</p>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-2">Max Contacts Per Alert</label>
            <input
              type="number"
              value={settings.alerting.maxContactsPerAlert}
              onChange={(e) => updateSetting('alerting', 'maxContactsPerAlert', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-slate-500 mt-1">Maximum number of contacts to notify per alert</p>
          </div>
        </div>
      </div>

      {/* Notification Channels */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Notification Channels</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <label className="font-medium text-slate-700">SMS</label>
            <input
              type="checkbox"
              checked={settings.notifications.smsEnabled}
              onChange={(e) => updateSetting('notifications', 'smsEnabled', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="font-medium text-slate-700">Email</label>
            <input
              type="checkbox"
              checked={settings.notifications.emailEnabled}
              onChange={(e) => updateSetting('notifications', 'emailEnabled', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="font-medium text-slate-700">WhatsApp</label>
            <input
              type="checkbox"
              checked={settings.notifications.whatsappEnabled}
              onChange={(e) => updateSetting('notifications', 'whatsappEnabled', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="font-medium text-slate-700">Voice</label>
            <input
              type="checkbox"
              checked={settings.notifications.voiceEnabled}
              onChange={(e) => updateSetting('notifications', 'voiceEnabled', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Data Sources</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <label className="font-medium text-slate-700">USGS</label>
            <input
              type="checkbox"
              checked={settings.dataSources.usgsEnabled}
              onChange={(e) => updateSetting('dataSources', 'usgsEnabled', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="font-medium text-slate-700">EMSC</label>
            <input
              type="checkbox"
              checked={settings.dataSources.emscEnabled}
              onChange={(e) => updateSetting('dataSources', 'emscEnabled', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="font-medium text-slate-700">NOAA</label>
            <input
              type="checkbox"
              checked={settings.dataSources.noaaEnabled}
              onChange={(e) => updateSetting('dataSources', 'noaaEnabled', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="font-medium text-slate-700">PTWC</label>
            <input
              type="checkbox"
              checked={settings.dataSources.ptwcEnabled}
              onChange={(e) => updateSetting('dataSources', 'ptwcEnabled', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="font-medium text-slate-700">JMA</label>
            <input
              type="checkbox"
              checked={settings.dataSources.jmaEnabled}
              onChange={(e) => updateSetting('dataSources', 'jmaEnabled', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">System</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-slate-700">Maintenance Mode</label>
              <p className="text-sm text-slate-500">Temporarily disable the platform for maintenance</p>
            </div>
            <input
              type="checkbox"
              checked={settings.system.maintenanceMode}
              onChange={(e) => updateSetting('system', 'maintenanceMode', e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-2">API Rate Limit (requests/min)</label>
            <input
              type="number"
              value={settings.system.apiRateLimit}
              onChange={(e) => updateSetting('system', 'apiRateLimit', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-2">Log Retention (days)</label>
            <input
              type="number"
              value={settings.system.logRetentionDays}
              onChange={(e) => updateSetting('system', 'logRetentionDays', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-slate-500 mt-1">Automatically delete logs older than this many days</p>
          </div>
        </div>
      </div>
    </div>
  )
}
