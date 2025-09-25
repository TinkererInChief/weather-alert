'use client'

import { useState, useEffect, useCallback } from 'react'
import { notificationService, NotificationOptions } from '@/lib/services/notification-service'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported(notificationService.isSupported())
    setPermission(notificationService.getPermissionStatus())
  }, [])

  const requestPermission = useCallback(async () => {
    const newPermission = await notificationService.requestPermission()
    setPermission(newPermission)
    return newPermission
  }, [])

  const showNotification = useCallback(async (options: NotificationOptions) => {
    return notificationService.showNotification(options)
  }, [])

  const showEmergencyAlert = useCallback(async (alertData: {
    type: 'earthquake' | 'tsunami' | 'test'
    magnitude?: number
    location: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }) => {
    return notificationService.showEmergencyAlert(alertData)
  }, [])

  const showSystemNotification = useCallback(async (
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    return notificationService.showSystemNotification(message, type)
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