'use client'

import { useState, useEffect } from 'react'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'
import { AlertTriangle, Users, MessageSquare, Mail, Phone, MessageCircle, CheckCircle, XCircle, Clock, MapPin, Activity } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'

interface AlertDetail {
  id: string
  earthquakeId: string
  magnitude: number
  location: string
  timestamp: string
  contactsNotified: number
  success: boolean
  errorMessage?: string
  notifications?: NotificationDetail[]
}

interface NotificationDetail {
  contactId: string
  contactName: string
  contactPhone?: string
  contactEmail?: string
  contactWhatsapp?: string
  channels: ChannelResult[]
  totalChannels: number
  successfulChannels: number
}

interface ChannelResult {
  channel: 'sms' | 'email' | 'whatsapp' | 'voice'
  success: boolean
  messageId?: string
  error?: string
  timestamp: string
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<AlertDetail | null>(null)

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts/history')
      const data = await response.json()
      
      if (data.success) {
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms': return <MessageSquare className="h-4 w-4" />
      case 'email': return <Mail className="h-4 w-4" />
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />
      case 'voice': return <Phone className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getChannelColor = (channel: string, success: boolean) => {
    if (!success) return 'text-red-600 bg-red-50'
    
    switch (channel) {
      case 'sms': return 'text-blue-600 bg-blue-50'
      case 'email': return 'text-purple-600 bg-purple-50'
      case 'whatsapp': return 'text-green-600 bg-green-50'
      case 'voice': return 'text-orange-600 bg-orange-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude >= 7) return 'text-red-600 bg-red-50'
    if (magnitude >= 6) return 'text-orange-600 bg-orange-50'
    if (magnitude >= 5) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  if (loading) {
    return (
      <AppLayout title="Earthquake Monitoring">
        <div className="animate-pulse space-y-4">
          <div className="h-8 loading-shimmer rounded w-1/4 mb-6"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 loading-shimmer rounded"></div>
          ))}
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout 
      title="Earthquake Monitoring"
      breadcrumbs={[{ label: 'Earthquake Monitoring' }]}
    >
      <div className="space-y-8">
        <div>
          <p className="text-slate-600">
            Earthquake alert history, delivery outcomes, and notification diagnostics
          </p>
        </div>

        {/* Alerts List */}
        <div className="grid grid-cols-1 gap-6">
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Earthquake Alerts Found</h3>
              <p className="text-gray-500">No seismic alerts have been dispatched yet.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Alert Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMagnitudeColor(alert.magnitude)}`}>
                          M{alert.magnitude}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          alert.success ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                        }`}>
                          {alert.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {alert.location}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTimestamp(alert.timestamp)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {alert.contactsNotified} contacts notified
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setSelectedAlert(selectedAlert?.id === alert.id ? null : alert)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      {selectedAlert?.id === alert.id ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                  
                  {alert.errorMessage && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{alert.errorMessage}</p>
                    </div>
                  )}
                </div>

                {/* Alert Details */}
                {selectedAlert?.id === alert.id && alert.notifications && (
                  <div className="p-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Notification Details</h4>
                    
                    <div className="space-y-4">
                      {alert.notifications.map((notification, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h5 className="font-medium text-gray-900">{notification.contactName}</h5>
                              <div className="text-sm text-gray-500 space-y-1">
                                {notification.contactPhone && (
                                  <div>📱 {notification.contactPhone}</div>
                                )}
                                {notification.contactEmail && (
                                  <div>📧 {notification.contactEmail}</div>
                                )}
                                {notification.contactWhatsapp && (
                                  <div>💬 {notification.contactWhatsapp}</div>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {notification.successfulChannels}/{notification.totalChannels} successful
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {notification.channels.map((channel, channelIndex) => (
                              <div
                                key={channelIndex}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md ${getChannelColor(channel.channel, channel.success)}`}
                              >
                                {getChannelIcon(channel.channel)}
                                <span className="text-sm font-medium capitalize">
                                  {channel.channel}
                                </span>
                                {channel.success ? (
                                  <CheckCircle className="h-4 w-4 ml-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 ml-auto" />
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {/* Show channel errors */}
                          {notification.channels.some(c => !c.success) && (
                            <div className="mt-3 space-y-1">
                              {notification.channels
                                .filter(c => !c.success)
                                .map((channel, errorIndex) => (
                                  <div key={errorIndex} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                    <strong>{channel.channel}:</strong> {channel.error || 'Unknown error'}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  )
}
