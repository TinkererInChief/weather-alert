'use client'

import { useEffect, useMemo, useState } from 'react'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'
import { 
  AlertTriangle, 
  Play, 
  Square, 
  MessageSquare, 
  Phone, 
  Users, 
  Activity, 
  Waves, 
  Mail, 
  MessageCircle, 
  Clock, 
  MapPin, 
  ArrowUpRight,
  CheckCircle2,
  Info,
  XCircle,
  Shield 
} from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { useSession } from 'next-auth/react'
import NotificationPermissionBanner from '@/components/notifications/NotificationPermissionBanner'
import { useNotifications } from '@/hooks/useNotifications'

type OperationTone = 'success' | 'error' | 'info'

type DashboardStats = {
  totalContacts: number
  activeContacts: number
  totalAlerts: number
  successfulAlerts: number
  recentAlerts: number
  successRate: string
  tsunami?: TsunamiStats
}

type AlertLog = {
  id: string
  earthquakeId: string
  magnitude: number
  location: string
  timestamp: string
  contactsNotified: number
  success: boolean
  errorMessage?: string
}

type MonitoringStatus = {
  isMonitoring: boolean
  smsAvailable: boolean
}

type TsunamiAlert = {
  id: string
  title: string
  category: string
  urgency: string
  severity: number
  location: string
  latitude: number
  longitude: number
  magnitude?: number
  description: string
  instruction: string
  threat: {
    level: string
    confidence: number
    affectedRegions: string[]
  }
  processedAt: string
}

type TsunamiStats = {
  totalAlerts: number
  alertsLast24h: number
  alertsLast7d: number
  recentAlerts: Array<{
    id: string
    type: string
    severity: number
    title: string
    location: string
    timestamp: string
  }>
  alertsByLevel: Record<string, number>
}

type OperationMessage = {
  id: string
  content: string
  tone: OperationTone
}

type TimelineEvent = {
  id: string
  type: 'earthquake' | 'tsunami'
  timestamp: Date
  title: string
  subtitle: string
  severity?: number
  status: string
  success: boolean
  details?: string
}

type StatsApiResponse = {
  success: boolean
  data: {
    stats: DashboardStats
    recentAlerts: AlertLog[]
  }
}

type MonitoringApiResponse = {
  isMonitoring: boolean
  smsAvailable: boolean
}

type TsunamiApiResponse = {
  success: boolean
  data: {
    alerts: TsunamiAlert[]
    lastChecked?: string
  }
}

type TsunamiMonitoringResponse = {
  success: boolean
  data: {
    monitoring: {
      isMonitoring: boolean
    }
  }
}

export default function Dashboard() {
  const { data: session } = useSession()
  const { showEmergencyAlert, showSystemNotification } = useNotifications()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentAlerts, setRecentAlerts] = useState<AlertLog[]>([])
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus | null>(null)
  const [tsunamiStats, setTsunamiStats] = useState<TsunamiStats | null>(null)
  const [tsunamiAlerts, setTsunamiAlerts] = useState<TsunamiAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [testingService, setTestingService] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testingVoice, setTestingVoice] = useState(false)
  const [voiceResult, setVoiceResult] = useState<string | null>(null)
  const [testingMultiChannel, setTestingMultiChannel] = useState(false)
  const [multiChannelResult, setMultiChannelResult] = useState<string | null>(null)
  const [testingWhatsApp, setTestingWhatsApp] = useState(false)
  const [whatsAppResult, setWhatsAppResult] = useState<string | null>(null)
  const [testingEmail, setTestingEmail] = useState(false)
  const [emailResult, setEmailResult] = useState<string | null>(null)

  const [tsunamiMonitoring, setTsunamiMonitoring] = useState(false)
  const [tsunamiLastChecked, setTsunamiLastChecked] = useState<string | null>(null)
  const [operations, setOperations] = useState<OperationMessage[]>([])

  const logOperation = (content: string, tone: OperationTone = 'info') => {
    setOperations((prev) => [
      { id: `${Date.now()}-${Math.random()}`, content, tone },
      ...prev.slice(0, 19)
    ])
  }

  const fetchData = async () => {
    try {
      const [statsRes, monitoringRes, tsunamiRes, tsunamiMonitoringRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/monitoring'),
        fetch('/api/tsunami'),
        fetch('/api/tsunami/monitor')
      ])

      if (statsRes.ok) {
        const statsData: StatsApiResponse = await statsRes.json()
        if (statsData?.success) {
          setStats(statsData.data.stats)
          setRecentAlerts(statsData.data.recentAlerts)
          if (statsData.data.stats.tsunami) {
            setTsunamiStats(statsData.data.stats.tsunami)
          }
        }
      }

      if (monitoringRes.ok) {
        const monitoringData: MonitoringApiResponse = await monitoringRes.json()
        setMonitoringStatus({
          isMonitoring: monitoringData.isMonitoring,
          smsAvailable: monitoringData.smsAvailable
        })
      }

      if (tsunamiRes.ok) {
        const tsunamiData: TsunamiApiResponse = await tsunamiRes.json()
        if (tsunamiData.success) {
          setTsunamiAlerts(tsunamiData.data.alerts || [])
          setTsunamiLastChecked(tsunamiData.data.lastChecked ?? null)
        }
      }

      if (tsunamiMonitoringRes.ok) {
        const tsunamiMonitoringData: TsunamiMonitoringResponse = await tsunamiMonitoringRes.json()
        if (tsunamiMonitoringData.success) {
          setTsunamiMonitoring(tsunamiMonitoringData.data.monitoring.isMonitoring)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      logOperation('Failed to refresh monitoring data. Please check network connectivity.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  // Monitor for new earthquakes and show notifications
  useEffect(() => {
    if (recentAlerts.length === 0) return

    // Get the most recent alert (first in array since they're sorted by timestamp desc)
    const latestAlert = recentAlerts[0]
    const alertTime = new Date(latestAlert.timestamp)
    const now = new Date()
    const timeDiff = now.getTime() - alertTime.getTime()
    
    // Only show notification for alerts from the last 2 minutes (to avoid spam on page load)
    if (timeDiff < 2 * 60 * 1000) {
      const severity = latestAlert.magnitude >= 7.0 ? 'critical' 
                    : latestAlert.magnitude >= 6.0 ? 'high'
                    : latestAlert.magnitude >= 5.0 ? 'medium' 
                    : 'low'

      showEmergencyAlert({
        type: 'earthquake',
        magnitude: latestAlert.magnitude,
        location: latestAlert.location,
        severity
      })
    }
  }, [recentAlerts, showEmergencyAlert])

  const toggleMonitoring = async () => {
    if (!monitoringStatus) return

    try {
      const action = monitoringStatus.isMonitoring ? 'stop' : 'start'
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        await fetchData()
        logOperation(`Earthquake monitoring ${action === 'start' ? 'activated' : 'paused'}.`, 'success')
      }
    } catch (error) {
      console.error('Error toggling monitoring:', error)
      logOperation('Failed to toggle earthquake monitoring. See console for details.', 'error')
    }
  }

  const testSMSService = async () => {
    setTestingService(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setTestResult(data.message)
        logOperation('SMS test alert dispatched to primary contact.', 'success')
        
        // Show real browser notification for successful test
        await showSystemNotification(
          'SMS test alert sent successfully to primary contact',
          'success'
        )
      } else {
        setTestResult(`Test failed: ${data.message}`)
        logOperation('SMS test failed. Inspect SendGrid/Twilio configuration.', 'error')
        
        // Show real browser notification for failed test
        await showSystemNotification(
          `SMS test failed: ${data.message}`,
          'error'
        )
      }
    } catch (error) {
      setTestResult('Test failed: Network error')
      logOperation('SMS test failed due to network error.', 'error')
    } finally {
      setTestingService(false)
    }
  }

  const testVoiceService = async () => {
    setTestingVoice(true)
    setVoiceResult(null)

    try {
      // First get test contact info
      const infoResponse = await fetch('/api/voice/test')
      const infoData = await infoResponse.json()
      
      if (!infoData.success || !infoData.data.testContact) {
        setVoiceResult('No test contact available. Add a contact first.')
        logOperation('Voice test aborted – no contacts available.', 'error')
        return
      }

      const testContact = infoData.data.testContact

      // Make test voice call
      const response = await fetch('/api/voice/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: testContact.phone,
          contactName: testContact.name
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setVoiceResult(`✅ Test voice call initiated to ${testContact.name} (${testContact.phone}). Call ID: ${data.data.callSid}`)
        logOperation('Voice test initiated successfully.', 'success')
      } else {
        setVoiceResult(`❌ Voice call failed: ${data.message}`)
        logOperation('Voice test failed. Review Twilio Voice configuration.', 'error')
      }
    } catch (error) {
      setVoiceResult('❌ Voice test failed: Network error')
      logOperation('Voice test failed due to network error.', 'error')
    } finally {
      setTestingVoice(false)
    }
  }

  const testMultiChannel = async () => {
    setTestingMultiChannel(true)
    setMultiChannelResult(null)

    try {
      const response = await fetch('/api/alerts/test-multichannel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setMultiChannelResult(`✅ ${data.message} Expected channels: ${data.data?.testEarthquake?.expectedChannels}`)
        logOperation('Multi-channel test executed successfully.', 'success')
      } else {
        setMultiChannelResult(`❌ Multi-channel test failed: ${data.message}`)
        logOperation('Multi-channel test failed.', 'error')
      }
    } catch (error) {
      setMultiChannelResult('❌ Multi-channel test failed: Network error')
      logOperation('Multi-channel test failed due to network error.', 'error')
    } finally {
      setTestingMultiChannel(false)
    }
  }

  const testWhatsApp = async () => {
    setTestingWhatsApp(true)
    setWhatsAppResult(null)

    try {
      const response = await fetch('/api/test/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setWhatsAppResult(`✅ ${data.message}`)
        logOperation('WhatsApp test message sent to sandbox/contact.', 'success')
      } else {
        setWhatsAppResult(`❌ WhatsApp test failed: ${data.message}`)
        logOperation('WhatsApp test failed. Review WhatsApp sandbox configuration.', 'error')
      }
    } catch (error) {
      setWhatsAppResult('❌ WhatsApp test failed: Network error')
      logOperation('WhatsApp test failed due to network error.', 'error')
    } finally {
      setTestingWhatsApp(false)
    }
  }

  const testEmail = async () => {
    setTestingEmail(true)
    setEmailResult(null)

    try {
      const response = await fetch('/api/test/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setEmailResult(`✅ ${data.message}`)
        logOperation('Email test completed in sandbox mode.', 'success')
        
        // Show real browser notification for successful test
        await showSystemNotification(
          'Email test completed successfully in sandbox mode',
          'success'
        )
      } else {
        setEmailResult(`❌ Email test failed: ${data.message}`)
        logOperation('Email test failed. Check SendGrid configuration.', 'error')
        
        // Show real browser notification for failed test
        await showSystemNotification(
          `Email test failed: ${data.message}`,
          'error'
        )
      }
    } catch (error) {
      setEmailResult('❌ Email test failed: Network error')
      logOperation('Email test failed due to network error.', 'error')
    } finally {
      setTestingEmail(false)
    }
  }

  const testHighSeverity = async () => {
    setTestingMultiChannel(true)
    setMultiChannelResult(null)

    try {
      const response = await fetch('/api/alerts/test-high-severity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setMultiChannelResult(`✅ ${data.message}`)
        logOperation('High-severity drill executed (voice + all channels).', 'success')
      } else {
        setMultiChannelResult(`❌ High-severity test failed: ${data.message}`)
        logOperation('High-severity drill failed. Investigate notification service.', 'error')
      }
    } catch (error) {
      setMultiChannelResult('❌ High-severity test failed: Network error')
      logOperation('High-severity drill failed due to network error.', 'error')
    } finally {
      setTestingMultiChannel(false)
    }
  }

  const manualCheck = async () => {
    try {
      const response = await fetch('/api/alerts/check', {
        method: 'POST'
      })
      
      const result = await response.json()
      if (result.success) {
        alert(`Manual check completed. Found ${result.newAlerts} new earthquakes.`)
        await fetchData()
        logOperation(`Manual earthquake sweep completed – ${result.newAlerts} new events detected.`, 'info')
      }
    } catch (error) {
      alert('Manual check failed')
      logOperation('Manual earthquake sweep failed.', 'error')
    }
  }

  const manualTsunamiCheck = async () => {
    try {
      const response = await fetch('/api/tsunami', { method: 'POST' })

      if (response.ok) {
        logOperation('Manual tsunami sweep triggered.', 'info')
        setTimeout(fetchData, 1500)
      } else {
        logOperation('Manual tsunami sweep failed to trigger.', 'error')
      }
    } catch (error) {
      logOperation('Manual tsunami sweep encountered a network issue.', 'error')
    }
  }

  const toggleTsunamiMonitoring = async () => {
    try {
      const method = tsunamiMonitoring ? 'DELETE' : 'POST'
      const response = await fetch('/api/tsunami/monitor', { method })

      if (response.ok) {
        setTsunamiMonitoring(!tsunamiMonitoring)
        logOperation(`Tsunami monitoring ${tsunamiMonitoring ? 'paused' : 'activated'}.`, 'success')
        setTimeout(fetchData, 1500)
      } else {
        logOperation('Unable to toggle tsunami monitoring.', 'error')
      }
    } catch (error) {
      logOperation('Tsunami monitoring toggle failed due to network issue.', 'error')
    }
  }

  const criticalTsunamiAlert = useMemo(() => {
    return tsunamiAlerts.find((alert) => ['warning', 'watch'].includes(alert.threat.level.toLowerCase())) || null
  }, [tsunamiAlerts])

  const mostSevereEarthquake = useMemo(() => {
    if (!recentAlerts.length) return null
    return [...recentAlerts].sort((a, b) => b.magnitude - a.magnitude)[0]
  }, [recentAlerts])

  const timelineEvents = useMemo((): TimelineEvent[] => {
    const earthquakeEvents = recentAlerts.slice(0, 5).map((alert) => ({
      id: `eq-${alert.id}`,
      type: 'earthquake' as const,
      timestamp: new Date(alert.timestamp),
      title: `Magnitude ${alert.magnitude.toFixed(1)} — ${alert.location}`,
      subtitle: `${alert.contactsNotified} contacts notified`,
      severity: alert.magnitude,
      status: alert.success ? 'Delivered' : 'Delivery Issues',
      success: alert.success,
      details: alert.errorMessage
    }))

    const tsunamiEvents = (tsunamiStats?.recentAlerts ?? []).slice(0, 5).map((alert) => ({
      id: `ts-${alert.id}`,
      type: 'tsunami' as const,
      timestamp: new Date(alert.timestamp),
      title: `${alert.title}`,
      subtitle: alert.location,
      severity: alert.severity,
      status: alert.type.toUpperCase(),
      success: alert.severity < 3,
      details: undefined
    }))

    return [...earthquakeEvents, ...tsunamiEvents]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 8)
  }, [recentAlerts, tsunamiStats])

  const monitoringActive = monitoringStatus?.isMonitoring

  const commandCenterTitle = criticalTsunamiAlert
    ? 'Critical Tsunami Incident in Progress'
    : 'Earthquake & Tsunami Command Center'

  const monitoringSummary = useMemo(() => {
    return [
      {
        label: 'Earthquake Monitoring',
        active: monitoringStatus?.isMonitoring ?? false,
        details: monitoringStatus?.isMonitoring ? 'Automated sweeps running every 60 seconds.' : 'Monitoring paused',
        cta: { label: monitoringStatus?.isMonitoring ? 'Pause monitoring' : 'Activate monitoring', handler: toggleMonitoring }
      },
      {
        label: 'Tsunami Monitoring',
        active: tsunamiMonitoring,
        details: tsunamiMonitoring ? 'Satellite + NOAA feeds synced.' : 'Monitoring paused',
        cta: { label: tsunamiMonitoring ? 'Pause monitoring' : 'Activate monitoring', handler: toggleTsunamiMonitoring }
      }
    ]
  }, [monitoringStatus, tsunamiMonitoring])

  if (loading) {
    return (
      <AuthGuard>
        <AppLayout title="Dashboard">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-slate-600">Loading dashboard...</p>
            </div>
          </div>
        </AppLayout>
      </AuthGuard>
    )
  }

  const getTimelineIcon = (type: 'earthquake' | 'tsunami') => {
    if (type === 'earthquake') {
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
          <Activity className="h-5 w-5" />
        </div>
      )
    }

    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
        <Waves className="h-5 w-5" />
      </div>
    )
  }

  const getToneIcon = (tone: OperationTone) => {
    switch (tone) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-rose-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <AuthGuard>
      <AppLayout 
        title={commandCenterTitle}
        breadcrumbs={[{ label: 'Dashboard' }]}
      >
      <div className="space-y-8">
        {/* Notification Permission Banner */}
        <NotificationPermissionBanner />

        {/* Welcome Section */}
        {session?.user && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Welcome back, {session.user.name || 'Operator'}
                </h2>
                <p className="text-sm text-slate-600">
                  Authenticated via {(session.user as any)?.phone || session.user.email} • 
                  Emergency Alert Command Center
                </p>
              </div>
            </div>
          </div>
        )}

        {criticalTsunamiAlert && (
          <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-r from-rose-600/95 via-orange-500/90 to-red-500/90 p-6 text-white shadow-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Critical Tsunami Advisory</p>
                <h2 className="mt-1 text-2xl font-semibold">{criticalTsunamiAlert.title}</h2>
                <p className="mt-3 text-sm text-white/90">
                  {criticalTsunamiAlert.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium">
                  <span className="rounded-full bg-white/20 px-3 py-1">Level: {criticalTsunamiAlert.threat.level.toUpperCase()}</span>
                  <span className="rounded-full bg-white/20 px-3 py-1">Confidence: {Math.round(criticalTsunamiAlert.threat.confidence * 100)}%</span>
                  <span className="rounded-full bg-white/20 px-3 py-1">Affected: {criticalTsunamiAlert.threat.affectedRegions.join(', ')}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 text-sm md:items-end">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Processed {new Date(criticalTsunamiAlert.processedAt).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {criticalTsunamiAlert.location}
                </div>
                <a
                  href="/tsunami"
                  className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-rose-600 shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  Open Tsunami Command
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white/95 via-blue-50/80 to-cyan-50/70 p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Earthquake Monitoring</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  {monitoringStatus?.isMonitoring ? 'Active' : 'Paused'}
                </h2>
                <p className="mt-3 text-sm text-slate-600">
                  {mostSevereEarthquake
                    ? `Max magnitude ${mostSevereEarthquake.magnitude.toFixed(1)} event recorded.`
                    : 'No recorded events in the current monitoring window.'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                  {stats?.totalAlerts ?? 0} Total Alerts
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-green-700 shadow-sm">
                  Success Rate {stats?.successRate ?? '—'}
                </span>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {recentAlerts.length
                  ? `Last event ${new Date(recentAlerts[0].timestamp).toLocaleString()}`
                  : 'Awaiting first event'}
              </div>
              <a
                href="/alerts"
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Earthquake history
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white/95 via-sky-50/80 to-emerald-50/70 p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tsunami Monitoring</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  {tsunamiMonitoring ? 'Active' : 'Paused'}
                </h2>
                <p className="mt-3 text-sm text-slate-600">
                  {criticalTsunamiAlert
                    ? `Active ${criticalTsunamiAlert.threat.level.toUpperCase()} alert near ${criticalTsunamiAlert.location}`
                    : tsunamiStats?.alertsLast24h
                      ? `${tsunamiStats.alertsLast24h} advisories processed in the past 24h.`
                      : 'Monitoring NOAA & PTWC feeds for coastal advisories.'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm">
                  {tsunamiStats?.totalAlerts ?? 0} Total Advisories
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                  {tsunamiStats?.alertsLast7d ?? 0} This Week
                </span>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {tsunamiLastChecked
                  ? `Feeds refreshed ${new Date(tsunamiLastChecked).toLocaleString()}`
                  : 'Awaiting feed synchronisation'}
              </div>
              <a
                href="/tsunami"
                className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700"
              >
                Tsunami control room
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {monitoringSummary.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/90 px-5 py-4 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${item.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                </div>
                <p className="mt-1 text-xs text-slate-600">{item.details}</p>
              </div>
              <button
                onClick={item.cta.handler}
                className={`btn ${item.active ? 'btn-secondary' : 'btn-primary'} whitespace-nowrap`}
              >
                {item.cta.label}
              </button>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Monitoring Controls</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={manualCheck} className="btn btn-secondary flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Manual earthquake sweep
              </button>
              <button onClick={manualTsunamiCheck} className="btn btn-secondary flex items-center gap-2">
                <Waves className="h-4 w-4" />
                Manual tsunami sweep
              </button>
              <a href="/contacts" className="btn btn-primary flex items-center gap-2">
                <Users className="h-4 w-4" />
                Manage contacts
              </a>
              <a href="/alerts" className="btn btn-secondary flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Earthquake history
              </a>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Channel & Drill Tests</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={testSMSService}
                disabled={testingService || !monitoringStatus?.smsAvailable}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {testingService ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Testing SMS...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    Test SMS
                  </>
                )}
              </button>

              <button
                onClick={testVoiceService}
                disabled={testingVoice}
                className="btn btn-success flex items-center gap-2 disabled:opacity-50"
              >
                {testingVoice ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Making Call...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    Test Voice Call
                  </>
                )}
              </button>

              <button
                onClick={testWhatsApp}
                disabled={testingWhatsApp}
                className="btn btn-success flex items-center gap-2 disabled:opacity-50"
              >
                {testingWhatsApp ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    Test WhatsApp
                  </>
                )}
              </button>

              <button
                onClick={testEmail}
                disabled={testingEmail}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {testingEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Test Email
                  </>
                )}
              </button>

              <button
                onClick={testMultiChannel}
                disabled={testingMultiChannel}
                className="btn btn-warning flex items-center gap-2 disabled:opacity-50"
              >
                {testingMultiChannel ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Running...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    Test Multi-Channel
                  </>
                )}
              </button>

              <button
                onClick={testHighSeverity}
                disabled={testingMultiChannel}
                className="btn btn-danger flex items-center gap-2 disabled:opacity-50"
              >
                {testingMultiChannel ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Running...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    High-Severity Drill
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {testResult && (
                <div className={`alert ${testResult.includes('Test sent') ? 'alert-success' : 'alert-error'}`}>
                  {testResult}
                </div>
              )}
              {voiceResult && (
                <div className={`alert ${voiceResult.includes('✅') ? 'alert-success' : 'alert-error'}`}>
                  {voiceResult}
                </div>
              )}
              {multiChannelResult && (
                <div className={`alert ${multiChannelResult.includes('✅') ? 'alert-success' : 'alert-error'}`}>
                  {multiChannelResult}
                </div>
              )}
              {whatsAppResult && (
                <div className={`alert ${whatsAppResult.includes('✅') ? 'alert-success' : 'alert-error'}`}>
                  {whatsAppResult}
                </div>
              )}
              {emailResult && (
                <div className={`alert ${emailResult.includes('✅') ? 'alert-success' : 'alert-error'}`}>
                  {emailResult}
                </div>
              )}
              {!monitoringStatus?.smsAvailable && (
                <div className="alert alert-warning">
                  SMS service not configured. Add Twilio credentials to `.env.local`.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="card xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Unified Incident Timeline</h3>
              <span className="text-xs font-medium text-slate-500">Earthquake + Tsunami over the last 24 hours</span>
            </div>
            {timelineEvents.length ? (
              <div className="space-y-4">
                {timelineEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-4 rounded-2xl border border-slate-200/60 bg-white/90 p-4 shadow-sm">
                    {getTimelineIcon(event.type)}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                          <p className="text-xs text-slate-500">{event.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${event.success ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {event.status}
                          </span>
                          <span className="text-xs text-slate-400">
                            {event.timestamp.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {event.details && (
                        <p className="mt-2 text-xs text-rose-600">{event.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Activity className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p>No incidents detected in the last 24 hours.</p>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Operations Log</h3>
            <div className="space-y-3">
              {operations.length ? (
                operations.slice(0, 8).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-xl border border-slate-200/60 bg-white/90 p-3">
                    {getToneIcon(log.tone)}
                    <p className="text-xs text-slate-600">{log.content}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4 text-center text-xs text-slate-500">
                  Operational events will appear here as actions are performed.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Earthquake Alert Delivery Log</h3>
              <span className="text-xs text-slate-500">{recentAlerts.length} events tracked</span>
            </div>
            {recentAlerts.length ? (
              <div className="space-y-4">
                {recentAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Magnitude {alert.magnitude.toFixed(1)} — {alert.location}</p>
                        <p className="text-xs text-slate-500">{new Date(alert.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-semibold ${alert.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {alert.success ? 'Delivered' : 'Issues'}
                        </p>
                        <p className="text-xs text-slate-500">{alert.contactsNotified} contacts notified</p>
                      </div>
                    </div>
                    {alert.errorMessage && (
                      <p className="mt-2 text-xs text-rose-600">{alert.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500">
                <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p>No earthquake alerts dispatched yet.</p>
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Tsunami Alert Feed</h3>
              <span className="text-xs text-slate-500">Active feed synchronisation</span>
            </div>
            {tsunamiAlerts.length ? (
              <div className="space-y-4">
                {tsunamiAlerts.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-slate-200/60 bg-white/90 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {alert.location}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(alert.processedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        alert.threat.level.toLowerCase() === 'warning'
                          ? 'bg-rose-50 text-rose-600 border border-rose-100'
                          : alert.threat.level.toLowerCase() === 'watch'
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {alert.threat.level.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-600">{alert.description}</p>
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                      <span className="font-semibold text-slate-900">Instructions:</span>
                      <br />
                      {alert.instruction}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500">
                <Waves className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p>No tsunami advisories at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </AppLayout>
    </AuthGuard>
  )
}
