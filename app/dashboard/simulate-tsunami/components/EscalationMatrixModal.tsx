'use client'

import { X, Ship, Users, Clock, MessageSquare, Phone, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { VesselAlert, NotificationChannel, EscalationStep } from '../types'

type EscalationMatrixModalProps = {
  isOpen: boolean
  onClose: () => void
  alerts: VesselAlert[]
  isDryRun: boolean
}

const normalizeChannel = (channel: string): NotificationChannel | 'UNKNOWN' => {
  const key = (channel || '').toUpperCase().replace(/\s+/g, '')
  if (key === 'VOICE' || key === 'VOICECALL' || key === 'VOICE_CALL') return 'VOICE_CALL'
  if (key === 'WHATSAPP') return 'WHATSAPP'
  if (key === 'SMS') return 'SMS'
  if (key === 'EMAIL') return 'EMAIL'
  return 'UNKNOWN'
}

const getChannelIcon = (channel: string) => {
  switch (normalizeChannel(channel)) {
    case 'SMS':
      return <MessageSquare className="w-4 h-4" />
    case 'WHATSAPP':
      return <MessageSquare className="w-4 h-4" />
    case 'VOICE_CALL':
      return <Phone className="w-4 h-4" />
    case 'EMAIL':
      return <Mail className="w-4 h-4" />
  }
}

const getChannelColor = (channel: string) => {
  switch (normalizeChannel(channel)) {
    case 'SMS':
      return 'bg-blue-500/40 text-blue-200 border-blue-400'
    case 'WHATSAPP':
      return 'bg-green-500/40 text-green-200 border-green-400'
    case 'VOICE_CALL':
      return 'bg-purple-500/40 text-purple-200 border-purple-400'
    case 'EMAIL':
      return 'bg-amber-500/40 text-amber-200 border-amber-400'
    default:
      return 'bg-slate-500/40 text-slate-200 border-slate-400'
  }
}

const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'bg-red-500/20 text-red-400 border-red-500/50'
    case 'high':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/50'
    case 'moderate':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
    case 'low':
      return 'bg-green-500/20 text-green-400 border-green-500/50'
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/50'
  }
}

export function EscalationMatrixModal({ isOpen, onClose, alerts, isDryRun }: EscalationMatrixModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Users className="w-6 h-6 text-cyan-400" />
              Escalation Matrix
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Detailed view of all alerts and notification escalation steps
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6">
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No alerts to display</p>
            </div>
          ) : (
            <div className="space-y-6">
              {alerts.map((alert, index) => (
                <VesselAlertCard 
                  key={alert.alertId} 
                  alert={alert} 
                  index={index}
                  isDryRun={isDryRun}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function VesselAlertCard({ alert, index, isDryRun }: { alert: VesselAlert; index: number; isDryRun: boolean }) {
  const policySteps = Array.isArray(alert.policy.steps) 
    ? alert.policy.steps 
    : typeof alert.policy.steps === 'object' 
    ? Object.values(alert.policy.steps) 
    : []

  return (
    <div className="bg-slate-800/40 rounded-xl border border-white/10 overflow-hidden">
      {/* Vessel Header */}
      <div className="bg-gradient-to-r from-slate-800/60 to-slate-900/60 p-4 border-b border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
              <Ship className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">
                  {alert.vessel.name}
                </h3>
                <span className="text-xs text-slate-400">MMSI: {alert.vessel.mmsi}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                <span>Distance: {alert.distance} km</span>
                <span>•</span>
                <span>Wave: {alert.waveHeight.toFixed(2)} m</span>
                <span>•</span>
                <span>ETA: {alert.eta} min</span>
              </div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-lg border text-xs font-semibold uppercase ${getSeverityColor(alert.severity)}`}>
            {alert.severity}
          </div>
        </div>
      </div>

      {/* Policy Info */}
      <div className="p-4 bg-slate-900/40 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Policy:</span>
            <span className="text-white font-medium">{alert.policy.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">{isDryRun ? 'Simulated:' : 'Sent:'}</span>
            <span className="text-cyan-400 font-semibold">{alert.escalation.notificationsSent} notifications</span>
          </div>
        </div>
      </div>

      {/* Escalation Steps */}
      <div className="p-4">
        {policySteps.length === 0 ? (
          <div className="text-center py-4 text-slate-500 text-sm">
            No escalation steps defined
          </div>
        ) : (
          <div className="space-y-4">
            {policySteps.map((step: any, stepIndex: number) => (
              <EscalationStepCard 
                key={stepIndex}
                step={step}
                stepIndex={stepIndex}
                contacts={alert.contacts}
                isDryRun={isDryRun}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EscalationStepCard({ 
  step, 
  stepIndex, 
  contacts,
  isDryRun
}: { 
  step: any
  stepIndex: number
  contacts: any[]
  isDryRun: boolean
}) {
  const notifyRoles = step.notifyRoles || []
  const channels = step.channels || []
  const waitMinutes = step.waitMinutes || 0

  // Filter contacts by roles
  const relevantContacts = contacts.filter(c => 
    notifyRoles.includes(c.role)
  ).sort((a, b) => a.priority - b.priority)

  return (
    <div className="bg-slate-800/60 rounded-lg border border-white/5 overflow-hidden">
      {/* Step Header */}
      <div className="flex items-center justify-between p-3 bg-slate-900/60 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
            <span className="text-sm font-bold text-cyan-400">{stepIndex + 1}</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Step {stepIndex + 1}</div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              {waitMinutes === 0 ? 'Immediate' : `After ${waitMinutes} minutes`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {channels.map((channel: string, i: number) => (
            <div
              key={i}
              className={`px-2 py-1 rounded border text-xs font-semibold flex items-center gap-1 ${getChannelColor(channel as NotificationChannel)}`}
            >
              {getChannelIcon(channel as NotificationChannel)}
              <span>{channel === 'VOICE_CALL' ? 'VOICE' : channel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="p-3">
        {notifyRoles.length === 0 ? (
          <div className="text-center py-2 text-slate-500 text-xs">
            No roles specified
          </div>
        ) : (
          <>
            <div className="text-xs text-slate-400 mb-2">
              Notifying: {notifyRoles.map((r: string) => r.replace('_', ' ')).join(', ')}
            </div>
            {relevantContacts.length === 0 ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2 text-xs text-amber-400">
                ⚠️ No contacts found with specified roles
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {relevantContacts.map((contact, i) => (
                  <ContactCard 
                    key={i} 
                    contact={contact} 
                    channels={channels}
                    isDryRun={isDryRun}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ContactCard({ 
  contact, 
  channels,
  isDryRun
}: { 
  contact: any
  channels: string[]
  isDryRun: boolean
}) {
  const channelCount = channels.length
  
  return (
    <div className="bg-slate-900/60 rounded border border-white/5 p-2">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{contact.name}</div>
          <div className="text-xs text-slate-400">{contact.role.replace('_', ' ')}</div>
        </div>
        <div className="flex items-center gap-1">
          {isDryRun ? (
            <div className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
            </div>
          )}
        </div>
      </div>
      <div className="space-y-1">
        {contact.phone && (channels.includes('SMS') || channels.includes('WHATSAPP') || channels.includes('VOICE_CALL')) && (
          <div className="text-xs text-slate-500 truncate">📱 {contact.phone}</div>
        )}
        {contact.email && channels.includes('EMAIL') && (
          <div className="text-xs text-slate-500 truncate">📧 {contact.email}</div>
        )}
      </div>
      <div className="mt-2 text-xs">
        <span className="text-slate-400">{isDryRun ? 'Simulated' : 'Sent'}:</span>{' '}
        <span className="text-cyan-400 font-medium">{channelCount} channel{channelCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}
