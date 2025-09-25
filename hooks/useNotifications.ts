'use client'

import { useState, useEffect, useCallback } from 'react'
import { browserNotificationService, NotificationOptions } from '@/lib/services/browser-notification-service'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported(browserNotificationService.isSupported())
    setPermission(browserNotificationService.getPermissionStatus())
  }, [])

  const requestPermission = useCallback(async () => {
    const newPermission = await browserNotificationService.requestPermission()
    setPermission(newPermission)
    return newPermission
  }, [])

  const showNotification = useCallback(async (options: NotificationOptions) => {
    return browserNotificationService.showNotification(options)
  }, [])

  const showEmergencyAlert = useCallback(async (alertData: {
    type: 'earthquake' | 'tsunami' | 'test'
    magnitude?: number
    location: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }) => {
    return browserNotificationService.showEmergencyAlert(alertData)
  }, [])

  const showSystemNotification = useCallback(async (
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    return browserNotificationService.showSystemNotification(message, type)
  }, [])

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    showEmergencyAlert,
    showSystemNotification
  }
}