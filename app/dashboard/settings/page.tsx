'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { Settings, Bell, Shield, Users, Database, MessageSquare, Save } from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('notifications')
  const [settings, setSettings] = useState({
    notifications: {
      smsEnabled: true,
      emailEnabled: true,
      whatsappEnabled: false,
      voiceEnabled: false,
      alertThreshold: 'medium'
    },
    security: {
      requireMFA: true,
      sessionTimeout: 30,
      passwordExpiry: 90
    },
    system: {
      alertRetryAttempts: 3,
      alertTimeout: 30,
      logLevel: 'info'
    }
  })

  const tabs = [
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'users', name: 'User Management', icon: Users },
    { id: 'system', name: 'System', icon: Database }
  ]

  const handleSave = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        // Show success message
        console.log('Settings saved successfully')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }))
  }

  return (
    <AuthGuard>
      <AppLayout 
        title="Settings"
        breadcrumbs={[
          { label: 'Settings' }
        ]}
      >
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Settings Navigation */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      {tab.name}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:w-3/4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              {/* Header */}
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  {tabs.find(tab => tab.id === activeTab)?.name} Settings
                </h3>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 mb-3">Notification Channels</h4>
                      <div className="space-y-3">
                        {['smsEnabled', 'emailEnabled', 'whatsappEnabled', 'voiceEnabled'].map((key) => (
                          <label key={key} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={settings.notifications[key as keyof typeof settings.notifications] as boolean}
                              onChange={(e) => updateSetting('notifications', key, e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-slate-700">
                              {key === 'smsEnabled' ? 'SMS Notifications' :
                               key === 'emailEnabled' ? 'Email Notifications' :
                               key === 'whatsappEnabled' ? 'WhatsApp Notifications' :
                               'Voice Call Notifications'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Alert Threshold</label>
                      <select
                        value={settings.notifications.alertThreshold}
                        onChange={(e) => updateSetting('notifications', 'alertThreshold', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Low - All Alerts</option>
                        <option value="medium">Medium - Important Alerts</option>
                        <option value="high">High - Critical Alerts Only</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.security.requireMFA}
                          onChange={(e) => updateSetting('security', 'requireMFA', e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-slate-700">Require Multi-Factor Authentication</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        value={settings.security.sessionTimeout}
                        onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Password Expiry (days)</label>
                      <input
                        type="number"
                        value={settings.security.passwordExpiry}
                        onChange={(e) => updateSetting('security', 'passwordExpiry', parseInt(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'users' && (
                  <div>
                    <p className="text-slate-600 mb-4">User management features coming soon.</p>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <MessageSquare className="h-8 w-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600">
                        This section will allow you to manage user accounts, roles, and permissions.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'system' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Alert Retry Attempts</label>
                      <input
                        type="number"
                        value={settings.system.alertRetryAttempts}
                        onChange={(e) => updateSetting('system', 'alertRetryAttempts', parseInt(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Alert Timeout (seconds)</label>
                      <input
                        type="number"
                        value={settings.system.alertTimeout}
                        onChange={(e) => updateSetting('system', 'alertTimeout', parseInt(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Log Level</label>
                      <select
                        value={settings.system.logLevel}
                        onChange={(e) => updateSetting('system', 'logLevel', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="error">Error</option>
                        <option value="warn">Warning</option>
                        <option value="info">Info</option>
                        <option value="debug">Debug</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  )
}
