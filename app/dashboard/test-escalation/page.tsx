'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Zap, CheckCircle, Loader2, Ship, Bell, Clock, Users, MessageSquare, Radio } from 'lucide-react'

type Vessel = {
  id: string
  name: string | null
  mmsi: string
}

type Policy = {
  id: string
  name: string
  eventTypes: string[]
  severityLevels: string[]
  steps: any[]
}

export default function TestEscalationPage() {
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [selectedVessel, setSelectedVessel] = useState('')
  const [selectedPolicy, setSelectedPolicy] = useState('')
  const [selectedEventType, setSelectedEventType] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState('')
  const [sendReal, setSendReal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadVessels()
    loadPolicies()
  }, [])

  const loadVessels = async () => {
    try {
      const res = await fetch('/api/test/vessels')
      if (res.ok) {
        const data = await res.json()
        setVessels(data.vessels || [])
      }
    } catch (err) {
      console.error('Failed to load vessels:', err)
    }
  }

  const loadPolicies = async () => {
    try {
      const res = await fetch('/api/escalation-policies')
      if (res.ok) {
        const data = await res.json()
        setPolicies(data)
      }
    } catch (err) {
      console.error('Failed to load policies:', err)
    }
  }

  const handleTest = async () => {
    if (!selectedVessel || !selectedEventType || !selectedSeverity) {
      setError('Please select all fields')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/test/trigger-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vesselId: selectedVessel,
          eventType: selectedEventType,
          severity: selectedSeverity,
          policyId: selectedPolicy || undefined,
          sendNotifications: sendReal
        })
      })

      const data = await res.json()

      if (res.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Failed to trigger test alert')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const selectedPolicyData = policies.find(p => p.id === selectedPolicy)

  return (
    <AppLayout title="Test Escalation" breadcrumbs={[{ label: 'Test Escalation' }]}>
      <div className="max-w-5xl mx-auto space-y-8 py-8">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50 mb-4">
            <Radio className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Emergency Escalation Testing
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Simulate multi-channel emergency notifications with intelligent escalation policies
          </p>
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Configure Test Alert</CardTitle>
                <CardDescription>
                  Select vessel, event type, and escalation policy to simulate
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Vessel Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Ship className="h-4 w-4 text-blue-600" />
                Select Vessel
              </label>
              <Select value={selectedVessel} onValueChange={setSelectedVessel}>
                <SelectTrigger className="h-12 border-2 hover:border-blue-300 transition-colors">
                  <SelectValue placeholder="Choose a vessel from your fleet..." />
                </SelectTrigger>
                <SelectContent>
                  {vessels.length === 0 ? (
                    <div className="p-8 text-center">
                      <Ship className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 font-medium">No vessels found</p>
                      <p className="text-xs text-gray-400 mt-1">Check your fleet configuration</p>
                    </div>
                  ) : (
                    vessels.map(vessel => (
                      <SelectItem key={vessel.id} value={vessel.id} className="py-3">
                        <div className="flex items-center gap-2">
                          <Ship className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{vessel.name || vessel.mmsi}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Event Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">Event Type</label>
              <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose event type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="earthquake">Earthquake</SelectItem>
                  <SelectItem value="tsunami">Tsunami</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose severity..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Policy Selection (Optional) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                Escalation Policy
                <span className="text-xs font-normal text-gray-500">(optional - auto-selects if blank)</span>
              </label>
              <Select value={selectedPolicy} onValueChange={setSelectedPolicy}>
                <SelectTrigger className="h-12 border-2 hover:border-purple-300 transition-colors">
                  <SelectValue placeholder="🤖 Auto-select based on event and severity" />
                </SelectTrigger>
                <SelectContent>
                  {policies.map(policy => (
                    <SelectItem key={policy.id} value={policy.id} className="py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{policy.name}</span>
                        <span className="text-xs text-gray-500">{policy.steps.length} escalation steps</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Policy Preview */}
            {selectedPolicyData && (
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 rounded-full -mr-16 -mt-16 opacity-20"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-blue-900 text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        {selectedPolicyData.name}
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        {selectedPolicyData.steps.length} automated escalation steps
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selectedPolicyData.steps.map((step: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 bg-white/70 backdrop-blur rounded-lg p-3 border border-blue-200/50">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                          {step.stepNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-sm font-semibold text-blue-900">
                              {step.waitMinutes === 0 ? 'Immediate' : `After ${step.waitMinutes} minutes`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-700">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>{step.channels.join(', ')}</span>
                            <span className="text-blue-400">→</span>
                            <Users className="h-3.5 w-3.5" />
                            <span>{step.contactRoles.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Send Real Notifications Checkbox */}
            <div className={`relative overflow-hidden border-2 rounded-xl p-5 transition-all duration-300 ${
              sendReal 
                ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-300 shadow-lg shadow-orange-200/50' 
                : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-200 to-red-200 rounded-full -mr-12 -mt-12 opacity-20"></div>
              <label className="relative flex items-start gap-4 cursor-pointer group">
                <div className="flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={sendReal}
                    onChange={(e) => setSendReal(e.target.checked)}
                    className="w-5 h-5 text-orange-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <div className={`font-bold text-lg flex items-center gap-2 mb-1 transition-colors ${
                    sendReal ? 'text-orange-900' : 'text-gray-700'
                  }`}>
                    {sendReal ? (
                      <>
                        <Radio className="h-5 w-5 animate-pulse" />
                        Live Mode: Real Notifications
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        Test Mode: Dry Run
                      </>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed ${sendReal ? 'text-orange-800' : 'text-gray-600'}`}>
                    {sendReal ? (
                      <>
                        <span className="font-semibold">⚠️ WARNING:</span> This will send actual SMS, Email, and WhatsApp messages to test contacts using your Twilio and SendGrid accounts.
                        <span className="block mt-2 text-xs bg-white/60 rounded px-2 py-1 inline-block">💳 This will consume API credits</span>
                      </>
                    ) : (
                      <>
                        Simulate the escalation process without sending real messages. Perfect for testing logic and workflows.
                        <span className="block mt-2 text-xs bg-white/60 rounded px-2 py-1 inline-block">✅ Recommended for demos and testing</span>
                      </>
                    )}
                  </p>
                </div>
              </label>
            </div>

            <Button 
              onClick={handleTest} 
              disabled={loading || !selectedVessel || !selectedEventType || !selectedSeverity}
              className={`w-full h-14 text-lg font-bold shadow-lg transition-all duration-300 ${
                sendReal 
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-orange-500/50 hover:shadow-xl hover:scale-[1.02]' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/50 hover:shadow-xl hover:scale-[1.02]'
              }`}
              variant={sendReal ? "destructive" : "default"}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  {sendReal ? 'Sending Real Notifications...' : 'Running Simulation...'}
                </>
              ) : (
                <>
                  {sendReal ? (
                    <>
                      <Radio className="mr-3 h-6 w-6" />
                      Send Real Notifications Now
                    </>
                  ) : (
                    <>
                      <Zap className="mr-3 h-6 w-6" />
                      Run Escalation Simulation
                    </>
                  )}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-2 border-red-300 bg-gradient-to-br from-red-50 to-pink-50 shadow-lg animate-in slide-in-from-top-2 duration-500">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 mb-1">Error Occurred</h4>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result Display */}
        {result && result.success && (
          <Card className={`border-2 shadow-2xl animate-in slide-in-from-bottom-4 duration-700 ${
            result.dryRun 
              ? "border-blue-300 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50" 
              : "border-green-300 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50"
          }`}>
            <CardHeader className={`border-b-2 ${result.dryRun ? 'border-blue-200 bg-white/50' : 'border-green-200 bg-white/50'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  result.dryRun 
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/50' 
                    : 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/50'
                }`}>
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className={`text-2xl font-bold ${result.dryRun ? "text-blue-900" : "text-green-900"}`}>
                    {result.dryRun ? '🧪 Simulation Complete' : '✅ Notifications Sent Successfully!'}
                  </CardTitle>
                  {result.dryRun && (
                    <p className="text-sm text-blue-700 mt-1 font-medium">
                      Dry run mode • No messages were sent • Safe for demos
                    </p>
                  )}
                  {!result.dryRun && (
                    <p className="text-sm text-green-700 mt-1 font-medium">
                      Real notifications delivered via Twilio & SendGrid
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Alert Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border-2 border-gray-100 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Vessel</div>
                  <div className="font-bold text-gray-900 flex items-center gap-2">
                    <Ship className="h-4 w-4 text-blue-600" />
                    {result.alert.vesselName}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border-2 border-gray-100 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Event</div>
                  <div className="font-bold text-orange-600">{result.alert.eventType}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border-2 border-gray-100 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Severity</div>
                  <div className={`font-bold ${
                    result.alert.severity === 'critical' ? 'text-red-600' :
                    result.alert.severity === 'high' ? 'text-orange-600' :
                    result.alert.severity === 'moderate' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>{result.alert.severity.toUpperCase()}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border-2 border-gray-100 shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Alert ID</div>
                  <div className="font-mono text-xs text-gray-700 truncate">{result.alert.id.substring(0, 12)}...</div>
                </div>
              </div>

              {/* Escalation Timeline */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  Escalation Timeline
                </h3>
                <div className="relative space-y-3 pl-8 before:absolute before:left-[15px] before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-purple-400 before:to-purple-200">
                  {result.alert.policy.steps.map((step: any, idx: number) => (
                    <div key={idx} className="relative bg-white rounded-xl p-4 border-2 border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="absolute -left-[30px] top-5 w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
                        {step.stepNumber}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-purple-600" />
                          <span className="font-semibold text-gray-900">
                            {step.waitMinutes === 0 ? 'Immediate' : `Wait ${step.waitMinutes} minutes`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{step.channels.join(' • ')}</span>
                          <span className="text-gray-400">→</span>
                          <Users className="h-4 w-4 text-green-500" />
                          <span>{step.contactRoles.join(' • ')}</span>
                        </div>
                        {step.timeoutMinutes > 0 && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Escalates after {step.timeoutMinutes} min without acknowledgment
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contacts Matrix */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  Notification Recipients ({result.alert.contacts.length})
                </h3>
                <div className="grid gap-3">
                  {result.alert.contacts.map((contact: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-xl p-4 border-2 border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-lg">
                            {contact.priority}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              {contact.name}
                              <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {contact.role.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 font-mono flex items-center gap-2 mt-1">
                              <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                              {contact.phone}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Escalation Logs */}
              {result.alert.escalation && result.alert.escalation.logs && (
                <div className={`border rounded p-3 ${result.dryRun ? 'bg-blue-50 border-blue-200' : 'bg-green-100 border-green-300'}`}>
                  <h5 className={`font-medium mb-2 text-sm ${result.dryRun ? 'text-blue-900' : 'text-green-900'}`}>
                    📋 Escalation Log:
                  </h5>
                  <div className="space-y-1">
                    {result.alert.escalation.logs.map((log: string, idx: number) => (
                      <div key={idx} className={`text-xs font-mono ${result.dryRun ? 'text-blue-800' : 'text-green-800'}`}>
                        {log}
                      </div>
                    ))}
                  </div>
                  {!result.dryRun && result.alert.escalation.notificationsSent > 0 && (
                    <div className="mt-2 pt-2 border-t border-green-300">
                      <p className="text-sm font-semibold text-green-900">
                        📤 {result.alert.escalation.notificationsSent} notification{result.alert.escalation.notificationsSent !== 1 ? 's' : ''} sent successfully!
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-xs font-medium text-yellow-900 mb-1">ℹ️ What Happens Next:</p>
                <p className="text-xs text-yellow-800 whitespace-pre-line font-mono">
                  {result.alert.nextSteps}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
