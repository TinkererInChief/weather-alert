'use client'

import { useState } from 'react'
import { Bell, X, AlertTriangle } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'

export default function NotificationPermissionBanner() {
  const { permission, isSupported, requestPermission } = useNotifications()
  const [isDismissed, setIsDismissed] = useState(false)

  // Don't show if notifications aren't supported, already granted, or dismissed
  if (!isSupported || permission === 'granted' || permission === 'denied' || isDismissed) {
    return null
  }

  const handleRequestPermission = async () => {
    const result = await requestPermission()
    if (result === 'granted') {
      setIsDismissed(true)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-blue-900">
            Enable Emergency Notifications
          </h3>
          <p className="mt-1 text-sm text-blue-700">
            Allow browser notifications to receive real-time emergency alerts even when this tab is not active.
          </p>
          <div className="mt-3 flex items-center space-x-3">
            <button
              onClick={handleRequestPermission}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Bell className="h-3 w-3 mr-1" />
              Enable Notifications
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Maybe later
            </button>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="rounded-md text-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function NotificationStatusIndicator() {
  const { permission, isSupported } = useNotifications()

  if (!isSupported) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <AlertTriangle className="h-4 w-4" />
        <span>Notifications not supported</span>
      </div>
    )
  }

  const statusConfig = {
    granted: {
      icon: <Bell className="h-4 w-4 text-green-600" />,
      text: 'Notifications enabled',
      className: 'text-green-600'
    },
    denied: {
      icon: <Bell className="h-4 w-4 text-red-600" />,
      text: 'Notifications blocked',
      className: 'text-red-600'
    },
    default: {
      icon: <Bell className="h-4 w-4 text-yellow-600" />,
      text: 'Notifications not enabled',
      className: 'text-yellow-600'
    }
  }

  const config = statusConfig[permission]

  return (
    <div className={`flex items-center space-x-2 text-sm ${config.className}`}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  )
}