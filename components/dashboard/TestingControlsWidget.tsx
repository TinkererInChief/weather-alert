'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Play, Square, MessageSquare, Mail, Phone, MessageCircle, Loader2, CheckCircle, XCircle, AlertTriangle, Waves, TestTube2 } from 'lucide-react'

type MonitoringStatus = {
  earthquake: boolean
  tsunami: boolean
}

type TestResult = {
  channel: string
  success: boolean
  message: string
  timestamp: Date
}

export default function TestingControlsWidget() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || 'viewer'
  const isAdmin = userRole === 'admin' || userRole === 'SUPER_ADMIN' || userRole === 'ORG_ADMIN'

  const [monitoring, setMonitoring] = useState<MonitoringStatus>({ earthquake: true, tsunami: true })
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const toggleMonitoring = async (service: 'earthquake' | 'tsunami') => {
    if (!isAdmin) {
      setError('Only administrators can control monitoring')
      return
    }

    try {
      const action = monitoring[service] ? 'stop' : 'start'
      const endpoint = service === 'earthquake' ? '/api/monitoring' : '/api/tsunami/monitor'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const data = await response.json()
      
      if (data.success) {
        setMonitoring(prev => ({ ...prev, [service]: !prev[service] }))
        setError(null)
      } else {
        setError(data.error || `Failed to ${action} ${service} monitoring`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to toggle ${service} monitoring`)
    }
  }

  const testChannel = async (channel: string, endpoint: string) => {
    setTesting(prev => ({ ...prev, [channel]: true }))
    setError(null)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      
      const result: TestResult = {
        channel,
        success: data.success,
        message: data.message || (data.success ? 'Test successful' : 'Test failed'),
        timestamp: new Date()
      }

      setTestResults(prev => [result, ...prev.slice(0, 4)])
    } catch (e) {
      const result: TestResult = {
        channel,
        success: false,
        message: e instanceof Error ? e.message : 'Test failed',
        timestamp: new Date()
      }
      setTestResults(prev => [result, ...prev.slice(0, 4)])
    } finally {
      setTesting(prev => ({ ...prev, [channel]: false }))
    }
  }

  const runDrillTest = async () => {
    if (!isAdmin) {
      setError('Only administrators can run drill tests')
      return
    }

    setTesting(prev => ({ ...prev, drill: true }))
    setError(null)

    try {
      const response = await fetch('/api/test/all-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeVoice: true,
          includeWhatsApp: true,
          includeSMS: true,
          includeEmail: true
        })
      })

      const data = await response.json()
      
      if (data.success) {
        const result: TestResult = {
          channel: 'All Channels',
          success: true,
          message: `Drill test completed: ${data.summary || 'All channels tested'}`,
          timestamp: new Date()
        }
        setTestResults(prev => [result, ...prev.slice(0, 4)])
      } else {
        setError(data.error || 'Drill test failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Drill test failed')
    } finally {
      setTesting(prev => ({ ...prev, drill: false }))
    }
  }

  const channels = [
    { id: 'sms', name: 'SMS', icon: MessageSquare, endpoint: '/api/alerts/test', color: 'blue' },
    { id: 'email', name: 'Email', icon: Mail, endpoint: '/api/test/email', color: 'green' },
    { id: 'voice', name: 'Voice', icon: Phone, endpoint: '/api/voice/test', color: 'purple' },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, endpoint: '/api/test/whatsapp', color: 'emerald' }
  ]

  const getResultIcon = (success: boolean) => {
    return success ? 
      <CheckCircle className="h-4 w-4 text-green-600" /> :
      <XCircle className="h-4 w-4 text-red-600" />
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <TestTube2 className="h-5 w-5 text-slate-600" />
        <h3 className="font-semibold text-slate-900">Testing & Controls</h3>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!isAdmin && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Admin access required for monitoring controls and drill tests</span>
        </div>
      )}

      {/* Monitoring Controls */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Monitoring Status</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-4 rounded-lg border-2 ${
            monitoring.earthquake ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${monitoring.earthquake ? 'text-orange-600' : 'text-slate-400'}`} />
                <span className="text-sm font-medium text-slate-900">Earthquake</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${monitoring.earthquake ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
            </div>
            <button
              onClick={() => toggleMonitoring('earthquake')}
              disabled={!isAdmin}
              className={`w-full mt-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isAdmin
                  ? monitoring.earthquake
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {monitoring.earthquake ? (
                <><Square className="inline h-3 w-3 mr-1" />Stop</>
              ) : (
                <><Play className="inline h-3 w-3 mr-1" />Start</>
              )}
            </button>
          </div>

          <div className={`p-4 rounded-lg border-2 ${
            monitoring.tsunami ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Waves className={`h-4 w-4 ${monitoring.tsunami ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-sm font-medium text-slate-900">Tsunami</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${monitoring.tsunami ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
            </div>
            <button
              onClick={() => toggleMonitoring('tsunami')}
              disabled={!isAdmin}
              className={`w-full mt-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isAdmin
                  ? monitoring.tsunami
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {monitoring.tsunami ? (
                <><Square className="inline h-3 w-3 mr-1" />Stop</>
              ) : (
                <><Play className="inline h-3 w-3 mr-1" />Start</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Channel Tests */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Channel Tests</h4>
        <div className="grid grid-cols-2 gap-2">
          {channels.map((channel) => {
            const Icon = channel.icon
            const isTesting = testing[channel.id]
            
            return (
              <button
                key={channel.id}
                onClick={() => testChannel(channel.name, channel.endpoint)}
                disabled={isTesting}
                className={`p-3 rounded-lg border border-${channel.color}-200 bg-${channel.color}-50 hover:bg-${channel.color}-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 text-${channel.color}-600`} />
                    <span className="text-sm font-medium text-slate-900">{channel.name}</span>
                  </div>
                  {isTesting && <Loader2 className="h-4 w-4 animate-spin text-slate-600" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Drill Test */}
      <div className="mb-6">
        <button
          onClick={runDrillTest}
          disabled={!isAdmin || testing.drill}
          className={`w-full p-4 rounded-lg border-2 font-medium transition-colors ${
            isAdmin
              ? 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900'
              : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {testing.drill ? (
              <><Loader2 className="h-5 w-5 animate-spin" />Running Drill Test...</>
            ) : (
              <><TestTube2 className="h-5 w-5" />Run Full Drill Test</>
            )}
          </div>
          <div className="text-xs mt-1 opacity-75">
            Tests all channels with sample alert
          </div>
        </button>
      </div>

      {/* Recent Test Results */}
      {testResults.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">Recent Tests</h4>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    {getResultIcon(result.success)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{result.channel}</div>
                      <div className="text-xs text-slate-600 mt-0.5 truncate">{result.message}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 flex-shrink-0">
                    {result.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
